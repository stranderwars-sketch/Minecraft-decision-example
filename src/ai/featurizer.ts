/**
 * Featurizer: Extracts a normalized numerical feature vector from MinecraftState
 */
import { MinecraftState } from './types';

export const STATE_FEATURE_NAMES = [
  'Health (0-1)',
  'Hunger (0-1)',
  'Is Night (0 or 1)',
  'Light Level (0-1)',
  'Has Weapon',
  'Has Pickaxe',
  'Has Food In Bag',
  'Wood Count (0-1)',
  'Stone Count (0-1)',
  'Iron Count (0-1)',
  'Nearest Mob Dist (0-1)',
  'Is Mob Hostile',
  'Nearest Resource Dist (0-1)',
  'Resource Is Wood',
  'Resource Is Ore',
  'In Danger (Lava/Hazard)',
];

export const STATE_DIMENSION = STATE_FEATURE_NAMES.length; // 16

export function extractStateVector(state: MinecraftState): number[] {
  const normHealth = Math.max(0, Math.min(20, state.health)) / 20;
  const normHunger = Math.max(0, Math.min(20, state.hunger)) / 20;
  const isNight = state.isNight ? 1 : 0;
  const normLight = Math.max(0, Math.min(15, state.lightLevel)) / 15;

  const hasWeapon = state.inventory.hasSword ? 1 : 0;
  const hasPickaxe = state.inventory.hasPickaxe ? 1 : 0;
  const hasFood = state.inventory.food > 0 ? 1 : 0;

  const normWood = Math.min(64, state.inventory.wood) / 64;
  const normStone = Math.min(64, state.inventory.stone) / 64;
  const normIron = Math.min(32, state.inventory.iron) / 32;

  // Mob distance: 0 = right next to bot, 1 = 15+ blocks away
  const normMobDist = Math.min(15, state.nearestMobDist) / 15;
  const mobHostile = state.nearestMobHostile ? 1 : 0;

  // Resource distance
  const normResDist = Math.min(15, state.nearestResourceDist) / 15;
  const resIsWood = state.nearestResourceType === 'wood' ? 1 : 0;
  const resIsOre = state.nearestResourceType === 'ore' ? 1 : 0;

  const inDanger = state.inLavaDanger ? 1 : 0;

  return [
    normHealth,
    normHunger,
    isNight,
    normLight,
    hasWeapon,
    hasPickaxe,
    hasFood,
    normWood,
    normStone,
    normIron,
    normMobDist,
    mobHostile,
    normResDist,
    resIsWood,
    resIsOre,
    inDanger,
  ];
}
