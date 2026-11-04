import test from 'node:test';
import assert from 'node:assert/strict';
import { NeuralNetwork, DQNModel } from '../dqn';
import { DecisionTreeModel } from '../decisionTree';
import { MinecraftEnvironment } from '../environment';
import { extractStateVector, STATE_DIMENSION } from '../featurizer';
import { ACTION_LIST } from '../types';
import { generateMineflayerBotJs, generatePythonScript } from '../exportMineflayer';

test('NeuralNetwork correctly performs forward pass and shapes output', () => {
  const net = new NeuralNetwork([STATE_DIMENSION, 16, ACTION_LIST.length]);
  const input = new Array(STATE_DIMENSION).fill(0.5);
  const output = net.predict(input);

  assert.equal(output.length, ACTION_LIST.length);
  assert.ok(output.every((v) => Number.isFinite(v)));
});

test('DQNModel selects valid action and produces confidence score', () => {
  const dqn = new DQNModel([STATE_DIMENSION, 16, ACTION_LIST.length], { epsilon: 0 }); // greedy
  const stateVector = new Array(STATE_DIMENSION).fill(0.2);
  const decision = dqn.selectAction(stateVector, true);

  assert.ok(ACTION_LIST.includes(decision.action));
  assert.equal(decision.qValues.length, ACTION_LIST.length);
  assert.ok(decision.confidence > 0 && decision.confidence <= 1);
});

test('DQNModel stores transitions and runs training step', () => {
  const dqn = new DQNModel([STATE_DIMENSION, 16, ACTION_LIST.length], { batchSize: 4 });
  const s1 = new Array(STATE_DIMENSION).fill(0.1);
  const s2 = new Array(STATE_DIMENSION).fill(0.2);

  for (let i = 0; i < 10; i++) {
    dqn.storeTransition({
      state: s1,
      action: 0,
      reward: 10,
      nextState: s2,
      done: false,
    });
  }

  assert.equal(dqn.replayBuffer.length, 10);
  const res = dqn.trainStep();
  assert.ok(Number.isFinite(res.loss));
});

test('DecisionTree prioritizes emergency hazards over normal foraging', () => {
  const tree = new DecisionTreeModel();
  const env = new MinecraftEnvironment();
  const state = env.getState();

  // In danger
  state.inLavaDanger = true;
  const decLava = tree.selectAction(state);
  assert.equal(decLava.action, 'FLEE_THREAT');

  // Low health + food
  state.inLavaDanger = false;
  state.health = 5;
  state.inventory.food = 2;
  const decFood = tree.selectAction(state);
  assert.equal(decFood.action, 'EAT_FOOD');
});

test('MinecraftEnvironment executes steps and tracks inventory and score', () => {
  const env = new MinecraftEnvironment();
  const initial = env.getState();
  assert.equal(initial.health, 20);
  assert.equal(initial.isDead, false);

  const { nextState, reward, done } = env.step('MOVE_TOWARD_RESOURCE');
  assert.equal(done, false);
  assert.ok(Number.isFinite(reward));
  assert.ok(nextState.stepCount > 0);
});

test('Export generators output valid Mineflayer and Python scripts', () => {
  const dqn = new DQNModel();
  const tree = new DecisionTreeModel();

  const jsDqn = generateMineflayerBotJs(dqn, 'dqn');
  assert.ok(jsDqn.includes('mineflayer.createBot'));
  assert.ok(jsDqn.includes('evaluateNeuralPolicy'));

  const jsTree = generateMineflayerBotJs(tree, 'decision_tree');
  assert.ok(jsTree.includes('BEHAVIOR_TREE_DATA'));

  const py = generatePythonScript(dqn);
  assert.ok(py.includes('class MinecraftDecisionNet'));
  assert.ok(py.includes('torch.no_grad()'));
});
