/**
 * Core type definitions for Minecraft Decision Model
 */

export type MinecraftAction =
  | 'MOVE_TOWARD_RESOURCE'
  | 'FLEE_THREAT'
  | 'ATTACK_TARGET'
  | 'MINE_BLOCK'
  | 'CRAFT_TOOL'
  | 'EAT_FOOD'
  | 'PLACE_TORCH'
  | 'BUILD_SHELTER'
  | 'EXPLORE_RANDOM';

export const ACTION_LIST: MinecraftAction[] = [
  'MOVE_TOWARD_RESOURCE',
  'FLEE_THREAT',
  'ATTACK_TARGET',
  'MINE_BLOCK',
  'CRAFT_TOOL',
  'EAT_FOOD',
  'PLACE_TORCH',
  'BUILD_SHELTER',
  'EXPLORE_RANDOM',
];

export interface Inventory {
  wood: number;
  stone: number;
  iron: number;
  food: number;
  torches: number;
  hasSword: boolean;
  hasPickaxe: boolean;
}

export type MobType = 'zombie' | 'skeleton' | 'creeper' | 'cow' | 'pig';

export interface Entity {
  id: string;
  type: MobType;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  isHostile: boolean;
  attackTimer?: number;
}

export type BlockType =
  | 'air'
  | 'grass'
  | 'wood'
  | 'leaves'
  | 'stone'
  | 'coal_ore'
  | 'iron_ore'
  | 'water'
  | 'lava'
  | 'planks';

export interface MinecraftState {
  health: number; // 0 to 20
  hunger: number; // 0 to 20
  timeOfDay: number; // 0 to 24000 (0 = morning, 12000 = sunset, 14000 = night)
  isNight: boolean;
  lightLevel: number; // 0 to 15
  inventory: Inventory;
  playerX: number;
  playerY: number;
  nearestResourceDist: number;
  nearestResourceType: 'wood' | 'ore' | 'food' | 'none';
  nearestMobDist: number;
  nearestMobType: MobType | 'none';
  nearestMobHostile: boolean;
  inLavaDanger: boolean;
  stepCount: number;
  score: number;
  isDead: boolean;
}

export interface DecisionModelOutput {
  action: MinecraftAction;
  actionIndex: number;
  qValues: number[]; // For DQN
  confidence: number;
  ruleExplanation?: string; // For Decision Tree
}

export interface TrainingHyperparameters {
  learningRate: number;
  gamma: number; // Discount factor
  epsilon: number; // Initial exploration rate
  epsilonDecay: number;
  epsilonMin: number;
  batchSize: number;
  replayBufferSize: number;
}

export interface RewardWeights {
  survivalPerSec: number;
  gatherWood: number;
  mineOre: number;
  killHostile: number;
  craftTool: number;
  eatWhenHungry: number;
  takeDamagePenalty: number;
  deathPenalty: number;
  lavaPenalty: number;
}

export interface EpisodeStats {
  episode: number;
  totalReward: number;
  stepsSurvived: number;
  woodGathered: number;
  mobsDefeated: number;
  loss: number;
  epsilon: number;
  died: boolean;
}

export type ModelArchitecture = 'dqn' | 'decision_tree' | 'imitation';

export interface DemonstrationSample {
  stateVector: number[];
  action: MinecraftAction;
  timestamp: number;
}
