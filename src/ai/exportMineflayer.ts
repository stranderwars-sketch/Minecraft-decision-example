/**
 * Code generator for exporting trained decision models into real Minecraft bots (Mineflayer & Python)
 */
import { DQNModel } from './dqn';
import { DecisionTreeModel } from './decisionTree';

export function generateMineflayerBotJs(
  model: DQNModel | DecisionTreeModel,
  type: 'dqn' | 'decision_tree'
): string {
  const modelJson = JSON.stringify(model.toJSON(), null, 2);

  if (type === 'dqn') {
    return `/**
 * =========================================================================
 * Mineflayer Autonomous Bot powered by CraftBrain Trained Decision Model
 * =========================================================================
 * Prerequisites:
 *   npm install mineflayer mineflayer-pathfinder mineflayer-pvp mineflayer-auto-eat vec3
 *
 * Usage:
 *   node bot.js [host] [port] [username]
 *   Example: node bot.js localhost 25565 CraftBrainBot
 */

const mineflayer = require('mineflayer');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
const pvp = require('mineflayer-pvp').plugin;
const autoEat = require('mineflayer-auto-eat').plugin;
const { GoalNear, GoalBlock } = goals;

// Host & Port configuration
const host = process.argv[2] || 'localhost';
const port = parseInt(process.argv[3]) || 25565;
const username = process.argv[4] || 'CraftBrainBot';

console.log(\`[CraftBrain] Initializing Minecraft Bot for \${host}:\${port} as \${username}...\`);

const bot = mineflayer.createBot({
  host,
  port,
  username,
  version: false // Autodetect server version
});

// Load plugins
bot.loadPlugin(pathfinder);
bot.loadPlugin(pvp);
bot.loadPlugin(autoEat);

// -------------------------------------------------------------------------
// EMBEDDED TRAINED NEURAL DECISION MODEL (Weights & Architecture)
// -------------------------------------------------------------------------
const TRAINED_MODEL_DATA = ${modelJson};

// LeakyReLU Activation
function leakyRelu(x) {
  return x > 0 ? x : 0.01 * x;
}

// Forward pass through trained neural network
function evaluateNeuralPolicy(inputFeatures) {
  const layers = TRAINED_MODEL_DATA.primaryNet.layers;
  let current = inputFeatures;

  for (let l = 0; l < layers.length; l++) {
    const { weights, biases } = layers[l];
    const isOutput = l === layers.length - 1;
    const next = [];

    for (let i = 0; i < weights.length; i++) {
      let sum = biases[i];
      const wRow = weights[i];
      for (let j = 0; j < current.length; j++) {
        sum += wRow[j] * current[j];
      }
      next.push(isOutput ? sum : leakyRelu(sum));
    }
    current = next;
  }
  return current; // Q-values for each action
}

const ACTION_MAP = [
  'MOVE_TOWARD_RESOURCE',
  'FLEE_THREAT',
  'ATTACK_TARGET',
  'MINE_BLOCK',
  'CRAFT_TOOL',
  'EAT_FOOD',
  'PLACE_TORCH',
  'BUILD_SHELTER',
  'EXPLORE_RANDOM'
];

bot.once('spawn', () => {
  console.log('[CraftBrain] Bot has spawned in the world!');
  const mcData = require('minecraft-data')(bot.version);
  const defaultMove = new Movements(bot, mcData);
  bot.pathfinder.setMovements(defaultMove);

  // Main Decision Loop (runs every 1000ms / 20 ticks)
  setInterval(async () => {
    if (!bot.entity) return;

    try {
      // 1. Sensory Perception: Extract observation state
      const state = extractPerception(bot);

      // 2. Decision Model Inference: Get Q-values
      const qValues = evaluateNeuralPolicy(state);
      const bestActionIndex = qValues.indexOf(Math.max(...qValues));
      const chosenAction = ACTION_MAP[bestActionIndex];

      console.log(\`[CraftBrain] Health: \${bot.health}/20 | Action: \${chosenAction} (Q: \${qValues[bestActionIndex].toFixed(2)})\`);

      // 3. Actuate decision in Minecraft
      await executeAction(chosenAction, bot, mcData);
    } catch (err) {
      console.warn('[CraftBrain] Decision loop warning:', err.message);
    }
  }, 1000);
});

// Extract perception vector matching the training environment
function extractPerception(bot) {
  const normHealth = (bot.health || 20) / 20;
  const normFood = (bot.food || 20) / 20;
  const isNight = bot.time ? (bot.time.timeOfDay >= 13000 && bot.time.timeOfDay <= 23000 ? 1 : 0) : 0;
  const lightLevel = 0.8; // default outdoor light

  // Inventory inspection
  const hasSword = bot.inventory.items().some(i => i.name.includes('sword')) ? 1 : 0;
  const hasPickaxe = bot.inventory.items().some(i => i.name.includes('pickaxe')) ? 1 : 0;
  const foodCount = bot.inventory.items().filter(i => ['bread', 'cooked_beef', 'apple', 'cooked_porkchop'].includes(i.name)).length;
  const woodCount = bot.inventory.items().filter(i => i.name.includes('log') || i.name.includes('wood')).length / 64;
  const stoneCount = bot.inventory.items().filter(i => i.name.includes('cobblestone') || i.name.includes('stone')).length / 64;
  const ironCount = bot.inventory.items().filter(i => i.name.includes('iron')).length / 32;

  // Nearest mob
  const nearestMob = bot.nearestEntity(e => e.type === 'mob' || e.type === 'hostile');
  const mobDist = nearestMob ? Math.min(15, bot.entity.position.distanceTo(nearestMob.position)) / 15 : 1.0;
  const isHostile = nearestMob && ['zombie', 'skeleton', 'creeper', 'spider'].includes(nearestMob.name) ? 1 : 0;

  // Nearest resource
  const woodBlock = bot.findBlock({ matching: b => b.name.includes('log'), maxDistance: 16 });
  const resDist = woodBlock ? Math.min(15, bot.entity.position.distanceTo(woodBlock.position)) / 15 : 1.0;

  return [
    normHealth,
    normFood,
    isNight,
    lightLevel,
    hasSword,
    hasPickaxe,
    foodCount > 0 ? 1 : 0,
    woodCount,
    stoneCount,
    ironCount,
    mobDist,
    isHostile,
    resDist,
    woodBlock ? 1 : 0,
    0, // ore
    0  // lava danger
  ];
}

async function executeAction(action, bot, mcData) {
  switch (action) {
    case 'ATTACK_TARGET': {
      const target = bot.nearestEntity(e => ['zombie', 'skeleton', 'creeper', 'spider'].includes(e.name) && bot.entity.position.distanceTo(e.position) < 4);
      if (target) {
        bot.pvp.attack(target);
      }
      break;
    }
    case 'FLEE_THREAT': {
      const threat = bot.nearestEntity(e => ['creeper', 'zombie', 'skeleton'].includes(e.name));
      if (threat) {
        const awayVec = bot.entity.position.minus(threat.position).normalize().scaled(5);
        bot.pathfinder.setGoal(new GoalNear(bot.entity.position.x + awayVec.x, bot.entity.position.y, bot.entity.position.z + awayVec.z, 1));
      }
      break;
    }
    case 'MOVE_TOWARD_RESOURCE':
    case 'MINE_BLOCK': {
      const block = bot.findBlock({ matching: b => b.name.includes('log') || b.name.includes('ore'), maxDistance: 16 });
      if (block) {
        if (bot.entity.position.distanceTo(block.position) <= 3) {
          await bot.dig(block);
        } else {
          bot.pathfinder.setGoal(new GoalBlock(block.position.x, block.position.y, block.position.z));
        }
      }
      break;
    }
    case 'EAT_FOOD': {
      bot.autoEat.eat();
      break;
    }
    case 'EXPLORE_RANDOM': {
      const rx = bot.entity.position.x + (Math.random() * 20 - 10);
      const rz = bot.entity.position.z + (Math.random() * 20 - 10);
      bot.pathfinder.setGoal(new GoalNear(rx, bot.entity.position.y, rz, 2));
      break;
    }
  }
}

bot.on('kicked', console.log);
bot.on('error', console.log);
`;
  }

  // Behavior Tree bot
  return `/**
 * =========================================================================
 * Mineflayer Autonomous Bot powered by CraftBrain Behavior Tree Model
 * =========================================================================
 * Prerequisites:
 *   npm install mineflayer mineflayer-pathfinder mineflayer-pvp mineflayer-auto-eat
 *
 * Usage:
 *   node bot.js [host] [port] [username]
 */

const mineflayer = require('mineflayer');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
const pvp = require('mineflayer-pvp').plugin;
const autoEat = require('mineflayer-auto-eat').plugin;
const { GoalNear, GoalBlock } = goals;

const host = process.argv[2] || 'localhost';
const port = parseInt(process.argv[3]) || 25565;
const username = process.argv[4] || 'CraftBrainTreeBot';

const bot = mineflayer.createBot({ host, port, username, version: false });
bot.loadPlugin(pathfinder);
bot.loadPlugin(pvp);
bot.loadPlugin(autoEat);

// -------------------------------------------------------------------------
// EMBEDDED HIERARCHICAL BEHAVIOR TREE RULES
// -------------------------------------------------------------------------
const BEHAVIOR_TREE_DATA = ${modelJson};

bot.once('spawn', () => {
  console.log('[CraftBrain] Behavior Tree Bot spawned!');
  const mcData = require('minecraft-data')(bot.version);
  bot.pathfinder.setMovements(new Movements(bot, mcData));

  setInterval(async () => {
    if (!bot.entity) return;

    // Evaluate rules in priority order
    for (const rule of BEHAVIOR_TREE_DATA.rules) {
      if (!rule.enabled) continue;

      if (evaluateCondition(rule, bot)) {
        console.log(\`[CraftBrain] Rule Triggered: [\${rule.name}] -> \${rule.action}\`);
        await executeRuleAction(rule.action, bot);
        break;
      }
    }
  }, 1000);
});

function evaluateCondition(rule, bot) {
  const hp = bot.health || 20;
  const nearestHostile = bot.nearestEntity(e => ['zombie', 'skeleton', 'creeper'].includes(e.name));
  const mobDist = nearestHostile ? bot.entity.position.distanceTo(nearestHostile.position) : 999;

  if (rule.name.includes('Critical Health') && hp < 8) return true;
  if (rule.name.includes('Creeper') && nearestHostile && nearestHostile.name === 'creeper' && mobDist < 4) return true;
  if (rule.name.includes('Combat Hostile') && nearestHostile && mobDist < 3.5) return true;
  if (rule.name.includes('Harvest') || rule.name.includes('Approach')) {
    return !!bot.findBlock({ matching: b => b.name.includes('log'), maxDistance: 16 });
  }
  if (rule.name.includes('Default')) return true;
  return false;
}

async function executeRuleAction(action, bot) {
  if (action === 'ATTACK_TARGET') {
    const target = bot.nearestEntity(e => ['zombie', 'skeleton', 'creeper'].includes(e.name));
    if (target) bot.pvp.attack(target);
  } else if (action === 'FLEE_THREAT') {
    const mob = bot.nearestEntity(e => ['creeper', 'zombie', 'skeleton'].includes(e.name));
    if (mob) {
      const dir = bot.entity.position.minus(mob.position).normalize().scaled(6);
      bot.pathfinder.setGoal(new GoalNear(bot.entity.position.x + dir.x, bot.entity.position.y, bot.entity.position.z + dir.z, 1));
    }
  } else if (action === 'EAT_FOOD') {
    bot.autoEat.eat();
  } else if (action === 'MINE_BLOCK' || action === 'MOVE_TOWARD_RESOURCE') {
    const block = bot.findBlock({ matching: b => b.name.includes('log'), maxDistance: 16 });
    if (block) {
      if (bot.entity.position.distanceTo(block.position) <= 3) {
        await bot.dig(block);
      } else {
        bot.pathfinder.setGoal(new GoalBlock(block.position.x, block.position.y, block.position.z));
      }
    }
  } else {
    // Random roam
    const rx = bot.entity.position.x + (Math.random() * 16 - 8);
    const rz = bot.entity.position.z + (Math.random() * 16 - 8);
    bot.pathfinder.setGoal(new GoalNear(rx, bot.entity.position.y, rz, 2));
  }
}
`;
}

export function generatePythonScript(model: DQNModel): string {
  const modelJson = JSON.stringify(model.toJSON(), null, 2);
  return `"""
CraftBrain PyTorch / Gym-Minecraft Agent Script
"""
import json
import torch
import torch.nn as nn
import numpy as np

MODEL_DATA = ${modelJson}

class MinecraftDecisionNet(nn.Module):
    def __init__(self, layer_sizes):
        super().__init__()
        layers = []
        for i in range(len(layer_sizes) - 1):
            layers.append(nn.Linear(layer_sizes[i], layer_sizes[i+1]))
            if i < len(layer_sizes) - 2:
                layers.append(nn.LeakyReLU(0.01))
        self.net = nn.Sequential(*layers)

    def forward(self, x):
        return self.net(x)

def load_trained_model():
    layer_sizes = MODEL_DATA["primaryNet"]["layerSizes"]
    model = MinecraftDecisionNet(layer_sizes)
    
    # Load exported weights
    with torch.no_grad():
        for i, layer_data in enumerate(MODEL_DATA["primaryNet"]["layers"]):
            lin = model.net[i * 2]
            lin.weight.copy_(torch.tensor(layer_data["weights"], dtype=torch.float32))
            lin.bias.copy_(torch.tensor(layer_data["biases"], dtype=torch.float32))
    
    model.eval()
    return model

if __name__ == "__main__":
    agent = load_trained_model()
    print("[CraftBrain] Neural decision model loaded successfully into PyTorch!")
    
    # Test sample observation
    sample_obs = np.array([1.0, 1.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.2, 0.0, 0.0, 0.8, 0.0, 0.3, 1.0, 0.0, 0.0], dtype=np.float32)
    with torch.no_grad():
        q_vals = agent(torch.from_numpy(sample_obs))
        action_idx = torch.argmax(q_vals).item()
        action_name = MODEL_DATA["actionList"][action_idx]
        print(f"Sample Observation Q-Values: {q_vals.numpy()}")
        print(f"Optimal Action Decided: {action_name}")
`;
}
