/**
 * Minecraft Sandbox Environment
 * A 2.5D grid-world simulation simulating core Minecraft survival mechanics,
 * resource gathering, crafting, hunger, day-night cycle, and mob encounters.
 */
import {
  BlockType,
  Entity,
  MinecraftAction,
  MinecraftState,
  MobType,
  RewardWeights,
} from './types';

export const WORLD_WIDTH = 20;
export const WORLD_HEIGHT = 20;

export const DEFAULT_REWARD_WEIGHTS: RewardWeights = {
  survivalPerSec: 0.1,
  gatherWood: 5.0,
  mineOre: 8.0,
  killHostile: 12.0,
  craftTool: 6.0,
  eatWhenHungry: 4.0,
  takeDamagePenalty: -6.0,
  deathPenalty: -50.0,
  lavaPenalty: -10.0,
};

export interface CombatEvent {
  text: string;
  color: string;
  x: number;
  y: number;
  duration: number; // in ticks
}

export class MinecraftEnvironment {
  grid: BlockType[][];
  torches: { x: number; y: number }[];
  entities: Entity[];
  playerX: number = 10;
  playerY: number = 10;
  playerHp: number = 20;
  playerHunger: number = 20;
  playerInventory = {
    wood: 0,
    stone: 0,
    iron: 0,
    food: 2,
    torches: 4,
    hasSword: false,
    hasPickaxe: false,
  };
  timeOfDay: number = 2000; // 0 = 6am, 6000 = noon, 12000 = 6pm, 18000 = midnight
  stepCount: number = 0;
  score: number = 0;
  isDead: boolean = false;
  rewardWeights: RewardWeights;
  combatEvents: CombatEvent[] = [];
  lastActionText: string = 'Spawning in world...';

  constructor(rewardWeights?: Partial<RewardWeights>) {
    this.rewardWeights = { ...DEFAULT_REWARD_WEIGHTS, ...rewardWeights };
    this.grid = [];
    this.torches = [];
    this.entities = [];
    this.reset();
  }

  reset(): MinecraftState {
    this.grid = [];
    this.torches = [];
    this.entities = [];
    this.playerX = 10;
    this.playerY = 10;
    this.playerHp = 20;
    this.playerHunger = 20;
    this.playerInventory = {
      wood: 0,
      stone: 0,
      iron: 0,
      food: 3,
      torches: 4,
      hasSword: false,
      hasPickaxe: false,
    };
    this.timeOfDay = 2000;
    this.stepCount = 0;
    this.score = 0;
    this.isDead = false;
    this.combatEvents = [];
    this.lastActionText = 'Ready for action';

    // Generate terrain
    for (let y = 0; y < WORLD_HEIGHT; y++) {
      const row: BlockType[] = [];
      for (let x = 0; x < WORLD_WIDTH; x++) {
        // Borders are stone
        if (x === 0 || y === 0 || x === WORLD_WIDTH - 1 || y === WORLD_HEIGHT - 1) {
          row.push('stone');
          continue;
        }

        // Center safe zone
        if (Math.abs(x - 10) <= 2 && Math.abs(y - 10) <= 2) {
          row.push('grass');
          continue;
        }

        // Small lava pool in corner
        if (x >= 15 && y <= 4) {
          row.push(Math.random() < 0.6 ? 'lava' : 'stone');
          continue;
        }

        // Small water pond
        if (x <= 4 && y >= 15) {
          row.push('water');
          continue;
        }

        // Mountain stone & ores on east side
        if (x >= 14 && y >= 12) {
          const r = Math.random();
          if (r < 0.15) row.push('iron_ore');
          else if (r < 0.35) row.push('coal_ore');
          else row.push('stone');
          continue;
        }

        // Trees (wood logs + leaves) on west/north side
        if ((x <= 8 && y <= 8) || (x >= 12 && y <= 8)) {
          const r = Math.random();
          if (r < 0.18) {
            row.push('wood');
          } else if (r < 0.32) {
            row.push('leaves');
          } else {
            row.push('grass');
          }
          continue;
        }

        row.push('grass');
      }
      this.grid.push(row);
    }

    // Spawn friendly mobs
    this.entities.push({
      id: 'cow_1',
      type: 'cow',
      x: 7,
      y: 11,
      hp: 10,
      maxHp: 10,
      isHostile: false,
    });
    this.entities.push({
      id: 'pig_1',
      type: 'pig',
      x: 12,
      y: 8,
      hp: 8,
      maxHp: 8,
      isHostile: false,
    });

    // Spawn initial zombie
    this.entities.push({
      id: 'zombie_1',
      type: 'zombie',
      x: 16,
      y: 16,
      hp: 20,
      maxHp: 20,
      isHostile: true,
    });

    return this.getState();
  }

  addCombatEvent(text: string, color: string, x: number, y: number) {
    this.combatEvents.push({ text, color, x, y, duration: 25 });
    if (this.combatEvents.length > 8) {
      this.combatEvents.shift();
    }
  }

  isNight(): boolean {
    return this.timeOfDay >= 13000 && this.timeOfDay <= 23000;
  }

  getLightLevel(x: number, y: number): number {
    let base = this.isNight() ? 4 : 15;
    for (const t of this.torches) {
      const dist = Math.hypot(x - t.x, y - t.y);
      if (dist < 5) {
        const torchLight = 14 - Math.floor(dist * 2);
        if (torchLight > base) base = torchLight;
      }
    }
    return Math.min(15, Math.max(0, base));
  }

  getState(): MinecraftState {
    const isNight = this.isNight();
    const lightLevel = this.getLightLevel(this.playerX, this.playerY);

    // Nearest resource scan (Wood or Ore)
    let nearestResDist = 999;
    let nearestResType: 'wood' | 'ore' | 'food' | 'none' = 'none';

    for (let y = 0; y < WORLD_HEIGHT; y++) {
      for (let x = 0; x < WORLD_WIDTH; x++) {
        const b = this.grid[y][x];
        const dist = Math.hypot(x - this.playerX, y - this.playerY);
        if (b === 'wood' && dist < nearestResDist) {
          nearestResDist = dist;
          nearestResType = 'wood';
        } else if ((b === 'coal_ore' || b === 'iron_ore') && dist < nearestResDist) {
          nearestResDist = dist;
          nearestResType = 'ore';
        }
      }
    }

    // Nearest entity scan
    let nearestMobDist = 999;
    let nearestMobType: MobType | 'none' = 'none';
    let nearestMobHostile = false;

    for (const ent of this.entities) {
      const dist = Math.hypot(ent.x - this.playerX, ent.y - this.playerY);
      if (dist < nearestMobDist) {
        nearestMobDist = dist;
        nearestMobType = ent.type;
        nearestMobHostile = ent.isHostile;
      }
    }

    // Check lava danger (standing directly adjacent to lava)
    let inLavaDanger = false;
    const dirs = [
      [0, 0],
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ];
    for (const [dx, dy] of dirs) {
      const nx = this.playerX + dx;
      const ny = this.playerY + dy;
      if (nx >= 0 && nx < WORLD_WIDTH && ny >= 0 && ny < WORLD_HEIGHT) {
        if (this.grid[ny][nx] === 'lava') {
          inLavaDanger = true;
          break;
        }
      }
    }

    return {
      health: this.playerHp,
      hunger: this.playerHunger,
      timeOfDay: this.timeOfDay,
      isNight,
      lightLevel,
      inventory: { ...this.playerInventory },
      playerX: this.playerX,
      playerY: this.playerY,
      nearestResourceDist: nearestResDist === 999 ? 15 : nearestResDist,
      nearestResourceType: nearestResType,
      nearestMobDist: nearestMobDist === 999 ? 15 : nearestMobDist,
      nearestMobType,
      nearestMobHostile,
      inLavaDanger,
      stepCount: this.stepCount,
      score: this.score,
      isDead: this.isDead,
    };
  }

  step(action: MinecraftAction): {
    nextState: MinecraftState;
    reward: number;
    done: boolean;
    info: { action: MinecraftAction; desc: string };
  } {
    if (this.isDead) {
      return {
        nextState: this.getState(),
        reward: 0,
        done: true,
        info: { action, desc: 'Agent has perished' },
      };
    }

    this.stepCount++;
    this.timeOfDay = (this.timeOfDay + 120) % 24000;
    let reward = this.rewardWeights.survivalPerSec;
    let actionDesc = '';

    // Decay combat events
    this.combatEvents.forEach((ev) => ev.duration--);
    this.combatEvents = this.combatEvents.filter((ev) => ev.duration > 0);

    // Natural hunger decay (every 15 steps)
    if (this.stepCount % 15 === 0 && this.playerHunger > 0) {
      this.playerHunger--;
    }

    // Starvation damage
    if (this.playerHunger <= 0) {
      this.playerHp = Math.max(0, this.playerHp - 1);
      this.addCombatEvent('-1 ❤ (Starving)', '#ef4444', this.playerX, this.playerY);
      reward += this.rewardWeights.takeDamagePenalty * 0.3;
    }

    // Passive regeneration if full hunger
    if (this.playerHunger >= 18 && this.playerHp < 20 && this.stepCount % 5 === 0) {
      this.playerHp = Math.min(20, this.playerHp + 1);
      this.addCombatEvent('+1 ❤', '#22c55e', this.playerX, this.playerY);
    }

    // Lava damage check
    if (this.grid[this.playerY][this.playerX] === 'lava') {
      this.playerHp = Math.max(0, this.playerHp - 4);
      reward += this.rewardWeights.lavaPenalty;
      this.addCombatEvent('-4 ❤ (Lava!)', '#ea580c', this.playerX, this.playerY);
    }

    // Execute Player Action
    switch (action) {
      case 'MOVE_TOWARD_RESOURCE': {
        const target = this.findNearestBlock(['wood', 'iron_ore', 'coal_ore']);
        if (target) {
          this.stepTowards(target.x, target.y);
          actionDesc = `Navigating toward ${target.type}`;
        } else {
          this.randomStep();
          actionDesc = 'Searching for resources';
        }
        break;
      }

      case 'FLEE_THREAT': {
        const nearestMob = this.findNearestHostile();
        if (nearestMob) {
          // Move away from threat
          const dx = Math.sign(this.playerX - nearestMob.x);
          const dy = Math.sign(this.playerY - nearestMob.y);
          this.tryMove(this.playerX + dx, this.playerY + dy);
          actionDesc = `Retreating from ${nearestMob.type}!`;
          reward += 1.0;
        } else {
          this.randomStep();
          actionDesc = 'Fleeing danger zone';
        }
        break;
      }

      case 'ATTACK_TARGET': {
        // Find nearest entity within reach (distance <= 2.2)
        const target = this.entities.find(
          (e) => Math.hypot(e.x - this.playerX, e.y - this.playerY) <= 2.2
        );

        if (target) {
          const baseDamage = this.playerInventory.hasSword ? 6 : 2;
          target.hp -= baseDamage;
          this.addCombatEvent(
            `-${baseDamage} Hit!`,
            this.playerInventory.hasSword ? '#38bdf8' : '#e2e8f0',
            target.x,
            target.y
          );
          actionDesc = `Attacked ${target.type} (-${baseDamage} hp)`;

          if (target.hp <= 0) {
            // Target slain!
            if (target.isHostile) {
              reward += this.rewardWeights.killHostile;
              this.score += 50;
              this.addCombatEvent(`+SLAIN ${target.type.toUpperCase()}`, '#fbbf24', target.x, target.y);
            } else {
              // Food drop
              this.playerInventory.food += 2;
              this.addCombatEvent('+2 Food 🍖', '#f97316', target.x, target.y);
              reward += 3.0;
            }
            this.entities = this.entities.filter((e) => e.id !== target.id);
          }
        } else {
          // Swing into air
          actionDesc = 'Swung weapon at empty air';
        }
        break;
      }

      case 'MINE_BLOCK': {
        const target = this.findAdjacentBlock(['wood', 'iron_ore', 'coal_ore', 'stone']);
        if (target) {
          const block = this.grid[target.y][target.x];
          this.grid[target.y][target.x] = 'grass'; // mined out

          if (block === 'wood') {
            this.playerInventory.wood += 2;
            reward += this.rewardWeights.gatherWood;
            this.score += 20;
            this.addCombatEvent('+2 Wood 🪵', '#a16207', target.x, target.y);
            actionDesc = 'Harvested oak log';
          } else if (block === 'iron_ore') {
            this.playerInventory.iron += 1;
            reward += this.rewardWeights.mineOre;
            this.score += 35;
            this.addCombatEvent('+1 Iron Ore ⚪', '#cbd5e1', target.x, target.y);
            actionDesc = 'Mined iron vein';
          } else if (block === 'coal_ore') {
            this.playerInventory.torches += 3;
            reward += this.rewardWeights.mineOre * 0.7;
            this.score += 15;
            this.addCombatEvent('+3 Torches 🕯', '#f59e0b', target.x, target.y);
            actionDesc = 'Mined coal into torches';
          } else if (block === 'stone') {
            this.playerInventory.stone += 1;
            reward += 1.0;
            actionDesc = 'Mined cobblestone';
          }
        } else {
          actionDesc = 'Nothing minable within reach';
        }
        break;
      }

      case 'CRAFT_TOOL': {
        if (!this.playerInventory.hasSword && this.playerInventory.wood >= 2) {
          this.playerInventory.wood -= 2;
          this.playerInventory.hasSword = true;
          reward += this.rewardWeights.craftTool;
          this.score += 40;
          this.addCombatEvent('Crafted Wooden Sword! ⚔', '#38bdf8', this.playerX, this.playerY);
          actionDesc = 'Crafted wooden sword';
        } else if (!this.playerInventory.hasPickaxe && this.playerInventory.wood >= 3) {
          this.playerInventory.wood -= 3;
          this.playerInventory.hasPickaxe = true;
          reward += this.rewardWeights.craftTool;
          this.score += 40;
          this.addCombatEvent('Crafted Pickaxe! ⛏', '#38bdf8', this.playerX, this.playerY);
          actionDesc = 'Crafted wooden pickaxe';
        } else {
          actionDesc = 'Missing wood (need 2-3 logs) to craft';
        }
        break;
      }

      case 'EAT_FOOD': {
        if (this.playerInventory.food > 0 && (this.playerHunger < 20 || this.playerHp < 20)) {
          this.playerInventory.food--;
          this.playerHunger = Math.min(20, this.playerHunger + 5);
          this.playerHp = Math.min(20, this.playerHp + 3);
          reward += this.rewardWeights.eatWhenHungry;
          this.addCombatEvent('Ate food (+hunger & hp) 🍖', '#4ade80', this.playerX, this.playerY);
          actionDesc = 'Ate food ration to recover';
        } else {
          actionDesc = 'No food or already well-fed';
        }
        break;
      }

      case 'PLACE_TORCH': {
        if (this.playerInventory.torches > 0) {
          this.playerInventory.torches--;
          this.torches.push({ x: this.playerX, y: this.playerY });
          reward += 2.0;
          this.addCombatEvent('Placed Torch 🕯', '#fbbf24', this.playerX, this.playerY);
          actionDesc = 'Placed torch to illuminate surroundings';
        } else {
          actionDesc = 'Out of torches';
        }
        break;
      }

      case 'BUILD_SHELTER': {
        if (this.playerInventory.wood >= 2) {
          this.playerInventory.wood -= 2;
          const offsets = [
            [1, 0],
            [-1, 0],
            [0, 1],
            [0, -1],
          ];
          for (const [ox, oy] of offsets) {
            const bx = this.playerX + ox;
            const by = this.playerY + oy;
            if (bx > 0 && bx < WORLD_WIDTH - 1 && by > 0 && by < WORLD_HEIGHT - 1) {
              if (this.grid[by][bx] === 'grass') {
                this.grid[by][bx] = 'planks';
              }
            }
          }
          reward += 5.0;
          this.addCombatEvent('Shelter Built! 🪵', '#ca8a04', this.playerX, this.playerY);
          actionDesc = 'Fortified barricade with planks';
        } else {
          actionDesc = 'Need 2 wood logs to construct shelter';
        }
        break;
      }

      case 'EXPLORE_RANDOM':
      default: {
        this.randomStep();
        actionDesc = 'Exploring surrounding wilderness';
        break;
      }
    }

    // Mob AI Behavior
    this.updateMobs();

    // Night mob spawning
    if (this.isNight() && this.stepCount % 20 === 0 && this.entities.length < 5) {
      this.spawnNightMob();
    }

    // Check Death Condition
    if (this.playerHp <= 0) {
      this.isDead = true;
      reward += this.rewardWeights.deathPenalty;
      this.addCombatEvent('YOU DIED ☠', '#ef4444', this.playerX, this.playerY);
      actionDesc = 'Agent perished in the wilderness';
    }

    this.lastActionText = actionDesc;

    return {
      nextState: this.getState(),
      reward,
      done: this.isDead || this.stepCount >= 500,
      info: { action, desc: actionDesc },
    };
  }

  private updateMobs() {
    for (const mob of this.entities) {
      const dist = Math.hypot(mob.x - this.playerX, mob.y - this.playerY);

      if (mob.isHostile) {
        // Sunlight burn check (daytime, outdoors)
        if (!this.isNight() && this.getLightLevel(mob.x, mob.y) >= 12 && mob.type === 'zombie') {
          mob.hp -= 3;
          this.addCombatEvent('Burning in Sun 🔥', '#f97316', mob.x, mob.y);
          if (mob.hp <= 0) {
            this.entities = this.entities.filter((e) => e.id !== mob.id);
            continue;
          }
        }

        // Hostile chasing player
        if (dist <= 8) {
          const dx = Math.sign(this.playerX - mob.x);
          const dy = Math.sign(this.playerY - mob.y);

          // Creeper special: explodes if within 1.5 blocks!
          if (mob.type === 'creeper' && dist <= 1.5) {
            this.playerHp = Math.max(0, this.playerHp - 10);
            this.addCombatEvent('BOOM! Creeper Exploded! 💥', '#ef4444', mob.x, mob.y);
            this.entities = this.entities.filter((e) => e.id !== mob.id);
            continue;
          }

          // Move towards player if not already touching
          if (dist > 1.2) {
            const nextX = mob.x + dx;
            const nextY = mob.y + dy;
            if (this.canPass(nextX, nextY)) {
              mob.x = nextX;
              mob.y = nextY;
            }
          } else {
            // Melee attack player
            const damage = mob.type === 'zombie' ? 3 : 2;
            this.playerHp = Math.max(0, this.playerHp - damage);
            this.addCombatEvent(`-${damage} ❤ (${mob.type})`, '#ef4444', this.playerX, this.playerY);
          }
        }
      } else {
        // Passive mobs wander casually
        if (Math.random() < 0.3) {
          const rdx = Math.floor(Math.random() * 3) - 1;
          const rdy = Math.floor(Math.random() * 3) - 1;
          if (this.canPass(mob.x + rdx, mob.y + rdy)) {
            mob.x += rdx;
            mob.y += rdy;
          }
        }
      }
    }
  }

  private spawnNightMob() {
    // Pick location far from torches
    for (let attempts = 0; attempts < 10; attempts++) {
      const sx = Math.floor(Math.random() * (WORLD_WIDTH - 2)) + 1;
      const sy = Math.floor(Math.random() * (WORLD_HEIGHT - 2)) + 1;
      if (this.getLightLevel(sx, sy) <= 7 && this.canPass(sx, sy)) {
        const mobType: MobType = Math.random() < 0.6 ? 'zombie' : 'creeper';
        this.entities.push({
          id: `mob_${Date.now()}_${attempts}`,
          type: mobType,
          x: sx,
          y: sy,
          hp: mobType === 'creeper' ? 12 : 20,
          maxHp: mobType === 'creeper' ? 12 : 20,
          isHostile: true,
        });
        break;
      }
    }
  }

  canPass(x: number, y: number): boolean {
    if (x < 0 || x >= WORLD_WIDTH || y < 0 || y >= WORLD_HEIGHT) return false;
    const b = this.grid[y][x];
    return b === 'grass' || b === 'air' || b === 'water';
  }

  tryMove(newX: number, newY: number): boolean {
    if (this.canPass(newX, newY)) {
      this.playerX = newX;
      this.playerY = newY;
      return true;
    }
    return false;
  }

  stepTowards(tx: number, ty: number) {
    const dx = Math.sign(tx - this.playerX);
    const dy = Math.sign(ty - this.playerY);

    if (dx !== 0 && this.tryMove(this.playerX + dx, this.playerY)) return;
    if (dy !== 0 && this.tryMove(this.playerX, this.playerY + dy)) return;
    // Alternative diagonal
    this.randomStep();
  }

  randomStep() {
    const dirs = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ].sort(() => Math.random() - 0.5);
    for (const [dx, dy] of dirs) {
      if (this.tryMove(this.playerX + dx, this.playerY + dy)) return;
    }
  }

  findNearestBlock(types: BlockType[]): { x: number; y: number; type: BlockType } | null {
    let bestDist = Infinity;
    let bestCoord: { x: number; y: number; type: BlockType } | null = null;
    for (let y = 0; y < WORLD_HEIGHT; y++) {
      for (let x = 0; x < WORLD_WIDTH; x++) {
        if (types.includes(this.grid[y][x])) {
          const d = Math.hypot(x - this.playerX, y - this.playerY);
          if (d < bestDist) {
            bestDist = d;
            bestCoord = { x, y, type: this.grid[y][x] };
          }
        }
      }
    }
    return bestCoord;
  }

  findAdjacentBlock(types: BlockType[]): { x: number; y: number } | null {
    const offsets = [
      [0, 1],
      [0, -1],
      [1, 0],
      [-1, 0],
      [1, 1],
      [-1, -1],
      [1, -1],
      [-1, 1],
    ];
    for (const [ox, oy] of offsets) {
      const x = this.playerX + ox;
      const y = this.playerY + oy;
      if (x >= 0 && x < WORLD_WIDTH && y >= 0 && y < WORLD_HEIGHT) {
        if (types.includes(this.grid[y][x])) {
          return { x, y };
        }
      }
    }
    return null;
  }

  findNearestHostile(): Entity | null {
    let bestDist = Infinity;
    let bestEntity: Entity | null = null;
    for (const ent of this.entities) {
      if (ent.isHostile) {
        const d = Math.hypot(ent.x - this.playerX, ent.y - this.playerY);
        if (d < bestDist) {
          bestDist = d;
          bestEntity = ent;
        }
      }
    }
    return bestEntity;
  }
}
