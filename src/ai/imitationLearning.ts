/**
 * Imitation Learning / Behavioral Cloning
 * Trains a policy to mimic expert human gameplay demonstrations
 */
import { ACTION_LIST, DemonstrationSample, MinecraftAction } from './types';
import { NeuralNetwork } from './dqn';
import { STATE_DIMENSION } from './featurizer';

export class ImitationModel {
  network: NeuralNetwork;
  demonstrations: DemonstrationSample[] = [];

  constructor(network?: NeuralNetwork) {
    this.network = network || new NeuralNetwork([STATE_DIMENSION, 32, 32, ACTION_LIST.length]);
  }

  addSample(sample: DemonstrationSample) {
    this.demonstrations.push(sample);
  }

  clearSamples() {
    this.demonstrations = [];
  }

  trainEpoch(learningRate: number = 0.01): { loss: number; accuracy: number } {
    if (this.demonstrations.length === 0) return { loss: 0, accuracy: 0 };

    let totalLoss = 0;
    let correctCount = 0;

    // Shuffle demonstrations
    const shuffled = [...this.demonstrations].sort(() => Math.random() - 0.5);

    for (const sample of shuffled) {
      const { activations, preActivations } = this.network.forward(sample.stateVector);
      const output = activations[activations.length - 1];

      // Softmax probabilities
      const maxVal = Math.max(...output);
      const expVals = output.map((v) => Math.exp(Math.min(10, Math.max(-10, v - maxVal))));
      const sumExp = expVals.reduce((a, b) => a + b, 0);
      const probs = expVals.map((v) => v / sumExp);

      const targetIdx = ACTION_LIST.indexOf(sample.action);
      if (targetIdx === -1) continue;

      // Cross-entropy loss: -log(p_target)
      const targetProb = Math.max(1e-7, probs[targetIdx]);
      totalLoss += -Math.log(targetProb);

      // Argmax prediction
      const predictedIdx = probs.indexOf(Math.max(...probs));
      if (predictedIdx === targetIdx) {
        correctCount++;
      }

      // Gradient for Cross-Entropy with Softmax: p_i - y_i
      const numLayers = this.network.layers.length;
      const outputLayerIdx = numLayers - 1;
      const outputDeltas: number[] = probs.map((p, idx) => (idx === targetIdx ? p - 1 : p));

      let currentDeltas = outputDeltas;

      for (let l = outputLayerIdx; l >= 0; l--) {
        const layer = this.network.layers[l];
        const prevActivation = activations[l];
        const nextDeltas: number[] = l > 0 ? new Array(prevActivation.length).fill(0) : [];

        for (let i = 0; i < layer.weights.length; i++) {
          const delta = currentDeltas[i];
          if (Math.abs(delta) < 1e-7) continue;

          layer.biases[i] -= learningRate * delta;

          const wRow = layer.weights[i];
          for (let j = 0; j < prevActivation.length; j++) {
            if (l > 0) {
              nextDeltas[j] += delta * wRow[j];
            }
            const grad = Math.max(-5, Math.min(5, delta * prevActivation[j]));
            wRow[j] -= learningRate * grad;
          }
        }

        if (l > 0) {
          const preAct = preActivations[l];
          for (let j = 0; j < nextDeltas.length; j++) {
            nextDeltas[j] *= preAct[j] > 0 ? 1.0 : 0.01;
          }
          currentDeltas = nextDeltas;
        }
      }
    }

    return {
      loss: totalLoss / shuffled.length,
      accuracy: correctCount / shuffled.length,
    };
  }

  predictAction(stateVector: number[]): { action: MinecraftAction; actionIndex: number; qValues: number[] } {
    const output = this.network.predict(stateVector);
    let bestIdx = 0;
    let maxVal = -Infinity;
    for (let i = 0; i < output.length; i++) {
      if (output[i] > maxVal) {
        maxVal = output[i];
        bestIdx = i;
      }
    }
    return {
      action: ACTION_LIST[bestIdx],
      actionIndex: bestIdx,
      qValues: output,
    };
  }
}
