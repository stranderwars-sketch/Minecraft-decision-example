/**
 * Hierarchical Behavior Tree / Rule-based Decision Model for Minecraft
 * Features transparent conditions, priority tuning, and explainable AI execution.
 */
import { ACTION_LIST, DecisionModelOutput, MinecraftAction, MinecraftState } from './types';

export interface DecisionRule {
  id: string;
  name: string;
  action: MinecraftAction;
  priority: number; // Higher number evaluated earlier
  enabled: boolean;
  evaluate: (state: MinecraftState) => { matches: boolean; reason: string };
  conditionCode: string;
}

export const DEFAULT_RULES: Omit<DecisionRule, 'id'>[] = [
  {
    name: 'Emergency Lava Escape',
    action: 'FLEE_THREAT',
    priority: 100,
    enabled: true,
    conditionCode: 'state.inLavaDanger',
    evaluate: (s) => ({
      matches: s.inLavaDanger,
      reason: 'Stepping near or in lethal lava hazard!',
    }),
  },
  {
    name: 'Critical Health - Eat Food',
    action: 'EAT_FOOD',
    priority: 90,
    enabled: true,
    conditionCode: 'state.health < 8 && state.inventory.food > 0',
    evaluate: (s) => ({
      matches: s.health < 8 && s.inventory.food > 0,
      reason: `Health is critical (${s.health.toFixed(1)}/20) and food is available`,
    }),
  },
  {
    name: 'Creeper Close - Urgent Retreat',
    action: 'FLEE_THREAT',
    priority: 85,
    enabled: true,
    conditionCode: "state.nearestMobType === 'creeper' && state.nearestMobDist < 3.5",
    evaluate: (s) => ({
      matches: s.nearestMobType === 'creeper' && s.nearestMobDist < 3.5,
      reason: `Creeper within fuse distance (${s.nearestMobDist.toFixed(1)} blocks)!`,
    }),
  },
  {
    name: 'Nightfall - Build Shelter',
    action: 'BUILD_SHELTER',
    priority: 80,
    enabled: true,
    conditionCode: 'state.isNight && state.inventory.wood >= 4 && state.lightLevel < 7',
    evaluate: (s) => ({
      matches: s.isNight && s.inventory.wood >= 4 && s.lightLevel < 7,
      reason: 'Pitch black nightfall, crafting safety barricade',
    }),
  },
  {
    name: 'Combat Hostile Mob With Sword',
    action: 'ATTACK_TARGET',
    priority: 75,
    enabled: true,
    conditionCode: 'state.nearestMobHostile && state.nearestMobDist < 2.5 && state.health >= 8',
    evaluate: (s) => ({
      matches: s.nearestMobHostile && s.nearestMobDist < 2.5 && s.health >= 8,
      reason: `Hostile ${s.nearestMobType} in melee range (${s.nearestMobDist.toFixed(1)} blocks)`,
    }),
  },
  {
    name: 'Low Light - Place Torch',
    action: 'PLACE_TORCH',
    priority: 70,
    enabled: true,
    conditionCode: 'state.lightLevel <= 6 && state.inventory.torches > 0',
    evaluate: (s) => ({
      matches: s.lightLevel <= 6 && s.inventory.torches > 0,
      reason: `Dangerous low light level (${s.lightLevel}/15) to prevent mob spawns`,
    }),
  },
  {
    name: 'Craft Basic Tools (Sword / Pickaxe)',
    action: 'CRAFT_TOOL',
    priority: 60,
    enabled: true,
    conditionCode: 'state.inventory.wood >= 3 && (!state.inventory.hasPickaxe || !state.inventory.hasSword)',
    evaluate: (s) => ({
      matches:
        s.inventory.wood >= 3 && (!s.inventory.hasPickaxe || !s.inventory.hasSword),
      reason: 'Sufficient wood to craft vital pickaxe/sword weapons',
    }),
  },
  {
    name: 'Starving - Eat Food',
    action: 'EAT_FOOD',
    priority: 55,
    enabled: true,
    conditionCode: 'state.hunger <= 12 && state.inventory.food > 0',
    evaluate: (s) => ({
      matches: s.hunger <= 12 && s.inventory.food > 0,
      reason: `Hunger bar depleted (${s.hunger}/20)`,
    }),
  },
  {
    name: 'Mine Discovered Ore',
    action: 'MINE_BLOCK',
    priority: 50,
    enabled: true,
    conditionCode: "state.nearestResourceType === 'ore' && state.nearestResourceDist < 2.0",
    evaluate: (s) => ({
      matches: s.nearestResourceType === 'ore' && s.nearestResourceDist < 2.0,
      reason: 'Iron/Coal ore deposit right within reach',
    }),
  },
  {
    name: 'Harvest Nearby Wood Logs',
    action: 'MINE_BLOCK',
    priority: 45,
    enabled: true,
    conditionCode: "state.nearestResourceType === 'wood' && state.nearestResourceDist < 2.0",
    evaluate: (s) => ({
      matches: s.nearestResourceType === 'wood' && s.nearestResourceDist < 2.0,
      reason: 'Harvesting adjacent oak log',
    }),
  },
  {
    name: 'Approach Harvestable Resource',
    action: 'MOVE_TOWARD_RESOURCE',
    priority: 30,
    enabled: true,
    conditionCode: "state.nearestResourceType !== 'none' && state.nearestResourceDist >= 2.0",
    evaluate: (s) => ({
      matches: s.nearestResourceType !== 'none' && s.nearestResourceDist >= 2.0,
      reason: `Navigating toward ${s.nearestResourceType} (${s.nearestResourceDist.toFixed(1)} blocks)`,
    }),
  },
  {
    name: 'Default - Explore & Scout Biome',
    action: 'EXPLORE_RANDOM',
    priority: 10,
    enabled: true,
    conditionCode: 'true',
    evaluate: () => ({
      matches: true,
      reason: 'No immediate threats or targets; roaming terrain for resources',
    }),
  },
];

export class DecisionTreeModel {
  rules: DecisionRule[];

  constructor(customRules?: DecisionRule[]) {
    if (customRules && customRules.length > 0) {
      this.rules = [...customRules];
    } else {
      this.rules = DEFAULT_RULES.map((r, idx) => ({
        ...r,
        id: `rule_${idx + 1}`,
      }));
    }
    this.sortRules();
  }

  sortRules(): void {
    this.rules.sort((a, b) => b.priority - a.priority);
  }

  selectAction(state: MinecraftState): DecisionModelOutput {
    for (const rule of this.rules) {
      if (!rule.enabled) continue;
      const res = rule.evaluate(state);
      if (res.matches) {
        const actionIdx = ACTION_LIST.indexOf(rule.action);
        // Synthesize pseudo Q-values for visualization
        const qVals = ACTION_LIST.map((act) => (act === rule.action ? 1.0 : 0.1));
        return {
          action: rule.action,
          actionIndex: actionIdx !== -1 ? actionIdx : 0,
          qValues: qVals,
          confidence: 0.95,
          ruleExplanation: `[${rule.name}]: ${res.reason}`,
        };
      }
    }

    // Fallback
    return {
      action: 'EXPLORE_RANDOM',
      actionIndex: ACTION_LIST.indexOf('EXPLORE_RANDOM'),
      qValues: ACTION_LIST.map(() => 0.1),
      confidence: 0.5,
      ruleExplanation: 'Fallback exploration rule',
    };
  }

  toJSON() {
    return {
      type: 'BEHAVIOR_TREE',
      version: '1.0.0',
      rules: this.rules.map((r) => ({
        id: r.id,
        name: r.name,
        action: r.action,
        priority: r.priority,
        enabled: r.enabled,
        conditionCode: r.conditionCode,
      })),
    };
  }
}
