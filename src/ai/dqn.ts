/**
 * Deep Q-Network (DQN) implementation in TypeScript
 * Pure logic, highly optimized for browser & headless execution.
 */
import { ACTION_LIST, DecisionModelOutput, MinecraftAction, TrainingHyperparameters } from './types';
import { STATE_DIMENSION } from './featurizer';

export interface Transition {
  state: number[];
  action: number;
  reward: number;
  nextState: number[];
  done: boolean;
}

export interface NeuralLayer {
  weights: number[][]; // [outputs][inputs]
  biases: number[]; // [outputs]
}

export class NeuralNetwork {
  layers: NeuralLayer[];
  layerSizes: number[];

  constructor(layerSizes: number[]) {
    this.layerSizes = [...layerSizes];
    this.layers = [];

    for (let l = 0; l < layerSizes.length - 1; l++) {
      const fanIn = layerSizes[l];
      const fanOut = layerSizes[l + 1];
      // He initialization for ReLU
      const std = Math.sqrt(2 / fanIn);

      const weights: number[][] = [];
      const biases: number[] = new Array(fanOut).fill(0.01);

      for (let i = 0; i < fanOut; i++) {
        const row: number[] = [];
        for (let j = 0; j < fanIn; j++) {
          row.push((Math.random() * 2 - 1) * std);
        }
        weights.push(row);
      }

      this.layers.push({ weights, biases });
    }
  }

  forward(input: number[]): { activations: number[][]; preActivations: number[][] } {
    const activations: number[][] = [[...input]];
    const preActivations: number[][] = [[]];

    let current = input;
    for (let l = 0; l < this.layers.length; l++) {
      const { weights, biases } = this.layers[l];
      const next: number[] = [];
      const preAct: number[] = [];
      const isOutput = l === this.layers.length - 1;

      for (let i = 0; i < weights.length; i++) {
        let sum = biases[i];
        const wRow = weights[i];
        for (let j = 0; j < current.length; j++) {
          sum += wRow[j] * current[j];
        }
        preAct.push(sum);
        // Leaky ReLU for hidden layers, Linear for output Q-values
        if (isOutput) {
          next.push(sum);
        } else {
          next.push(sum > 0 ? sum : 0.01 * sum);
        }
      }

      activations.push(next);
      preActivations.push(preAct);
      current = next;
    }

    return { activations, preActivations };
  }

  predict(input: number[]): number[] {
    const { activations } = this.forward(input);
    return activations[activations.length - 1];
  }

  clone(): NeuralNetwork {
    const copy = new NeuralNetwork(this.layerSizes);
    copy.layers = this.layers.map((layer) => ({
      weights: layer.weights.map((row) => [...row]),
      biases: [...layer.biases],
    }));
    return copy;
  }

  copyFrom(source: NeuralNetwork): void {
    for (let l = 0; l < this.layers.length; l++) {
      for (let i = 0; i < this.layers[l].weights.length; i++) {
        for (let j = 0; j < this.layers[l].weights[i].length; j++) {
          this.layers[l].weights[i][j] = source.layers[l].weights[i][j];
        }
        this.layers[l].biases[i] = source.layers[l].biases[i];
      }
    }
  }

  toJSON() {
    return {
      layerSizes: this.layerSizes,
      layers: this.layers,
    };
  }

  static fromJSON(data: { layerSizes: number[]; layers: NeuralLayer[] }): NeuralNetwork {
    const net = new NeuralNetwork(data.layerSizes);
    net.layers = data.layers;
    return net;
  }
}

export class DQNModel {
  primaryNet: NeuralNetwork;
  targetNet: NeuralNetwork;
  replayBuffer: Transition[] = [];
  hyperparams: TrainingHyperparameters;
  stepCount = 0;

  constructor(
    layerSizes: number[] = [STATE_DIMENSION, 32, 32, ACTION_LIST.length],
    hyperparams?: Partial<TrainingHyperparameters>
  ) {
    this.hyperparams = {
      learningRate: 0.005,
      gamma: 0.95,
      epsilon: 0.9,
      epsilonDecay: 0.995,
      epsilonMin: 0.05,
      batchSize: 32,
      replayBufferSize: 2000,
      ...hyperparams,
    };

    this.primaryNet = new NeuralNetwork(layerSizes);
    this.targetNet = this.primaryNet.clone();
  }

  selectAction(stateVector: number[], greedy: boolean = false): DecisionModelOutput {
    const qValues = this.primaryNet.predict(stateVector);

    let selectedIdx: number;
    if (!greedy && Math.random() < this.hyperparams.epsilon) {
      // Exploration: pick random action
      selectedIdx = Math.floor(Math.random() * ACTION_LIST.length);
    } else {
      // Exploitation: argmax Q
      let maxQ = -Infinity;
      selectedIdx = 0;
      for (let i = 0; i < qValues.length; i++) {
        if (qValues[i] > maxQ) {
          maxQ = qValues[i];
          selectedIdx = i;
        }
      }
    }

    // Compute pseudo confidence via softmax on Q values
    const maxVal = Math.max(...qValues);
    const exps = qValues.map((v) => Math.exp(Math.min(10, Math.max(-10, v - maxVal))));
    const sumExps = exps.reduce((a, b) => a + b, 0);
    const confidence = sumExps > 0 ? exps[selectedIdx] / sumExps : 1 / ACTION_LIST.length;

    return {
      action: ACTION_LIST[selectedIdx],
      actionIndex: selectedIdx,
      qValues,
      confidence,
    };
  }

  storeTransition(transition: Transition): void {
    this.replayBuffer.push(transition);
    if (this.replayBuffer.length > this.hyperparams.replayBufferSize) {
      this.replayBuffer.shift();
    }
  }

  trainStep(): { loss: number } {
    if (this.replayBuffer.length < this.hyperparams.batchSize) {
      return { loss: 0 };
    }

    // Sample mini-batch
    const batch: Transition[] = [];
    for (let i = 0; i < this.hyperparams.batchSize; i++) {
      const idx = Math.floor(Math.random() * this.replayBuffer.length);
      batch.push(this.replayBuffer[idx]);
    }

    let totalLoss = 0;

    for (const trans of batch) {
      const currentQ = this.primaryNet.forward(trans.state);
      const targetQValues = this.targetNet.predict(trans.nextState);

      const maxNextQ = Math.max(...targetQValues);
      const target = trans.done ? trans.reward : trans.reward + this.hyperparams.gamma * maxNextQ;

      const outputQ = currentQ.activations[currentQ.activations.length - 1];
      const error = outputQ[trans.action] - target;
      totalLoss += 0.5 * error * error;

      // Backpropagation for this single action output
      this.backpropSingle(currentQ.activations, currentQ.preActivations, trans.action, error);
    }

    this.stepCount++;
    // Periodically update target network
    if (this.stepCount % 50 === 0) {
      this.targetNet.copyFrom(this.primaryNet);
    }

    return { loss: totalLoss / batch.length };
  }

  private backpropSingle(
    activations: number[][],
    preActivations: number[][],
    targetAction: number,
    error: number
  ) {
    const lr = this.hyperparams.learningRate;
    const numLayers = this.primaryNet.layers.length;

    // Delta for output layer
    const outputLayerIdx = numLayers - 1;
    const outputDeltas: number[] = new Array(ACTION_LIST.length).fill(0);
    outputDeltas[targetAction] = error; // dL/d(out) * d(out)/d(preAct) (identity)

    let currentDeltas = outputDeltas;

    for (let l = outputLayerIdx; l >= 0; l--) {
      const layer = this.primaryNet.layers[l];
      const prevActivation = activations[l];
      const nextDeltas: number[] = l > 0 ? new Array(prevActivation.length).fill(0) : [];

      for (let i = 0; i < layer.weights.length; i++) {
        const delta = currentDeltas[i];
        if (Math.abs(delta) < 1e-7) continue;

        // Update bias
        layer.biases[i] -= lr * delta;

        // Update weights & compute next layer deltas
        const wRow = layer.weights[i];
        for (let j = 0; j < prevActivation.length; j++) {
          if (l > 0) {
            nextDeltas[j] += delta * wRow[j];
          }
          // Gradient clipping
          const grad = Math.max(-5, Math.min(5, delta * prevActivation[j]));
          wRow[j] -= lr * grad;
        }
      }

      if (l > 0) {
        // Multiply by derivative of activation function for hidden layer
        const preAct = preActivations[l];
        for (let j = 0; j < nextDeltas.length; j++) {
          nextDeltas[j] *= preAct[j] > 0 ? 1.0 : 0.01;
        }
        currentDeltas = nextDeltas;
      }
    }
  }

  decayEpsilon(): void {
    this.hyperparams.epsilon = Math.max(
      this.hyperparams.epsilonMin,
      this.hyperparams.epsilon * this.hyperparams.epsilonDecay
    );
  }

  toJSON() {
    return {
      type: 'DQN',
      version: '1.0.0',
      actionList: ACTION_LIST,
      hyperparams: this.hyperparams,
      primaryNet: this.primaryNet.toJSON(),
      stepCount: this.stepCount,
    };
  }

  static fromJSON(json: any): DQNModel {
    const model = new DQNModel(json.primaryNet.layerSizes, json.hyperparams);
    model.primaryNet = NeuralNetwork.fromJSON(json.primaryNet);
    model.targetNet = model.primaryNet.clone();
    model.stepCount = json.stepCount || 0;
    return model;
  }
}
