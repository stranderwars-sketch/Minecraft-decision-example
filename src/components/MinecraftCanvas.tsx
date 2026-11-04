import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  MinecraftEnvironment,
  WORLD_WIDTH,
  WORLD_HEIGHT,
} from '../ai/environment';
import {
  DecisionModelOutput,
  MinecraftAction,
  MinecraftState,
} from '../ai/types';
import {
  Eye,
  Gamepad2,
  Heart,
  Moon,
  Sun,
  Flame,
  Shield,
  Zap,
} from 'lucide-react';

interface MinecraftCanvasProps {
  env: MinecraftEnvironment;
  currentState: MinecraftState;
  currentDecision: DecisionModelOutput | null;
  manualTakeover: boolean;
  onToggleManualTakeover: () => void;
  onManualAction: (action: MinecraftAction) => void;
  onHumanFeedbackReward: (rewardDelta: number) => void;
}

export const MinecraftCanvas: React.FC<MinecraftCanvasProps> = ({
  env,
  currentState,
  currentDecision,
  manualTakeover,
  onToggleManualTakeover,
  onManualAction,
  onHumanFeedbackReward,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [showRaycasts, setShowRaycasts] = useState(true);
  const [showLightMap, setShowLightMap] = useState(true);
  const animFrameRef = useRef<number | null>(null);
  const tickRef = useRef<number>(0);

  // Keyboard controls for manual takeover
  useEffect(() => {
    if (!manualTakeover) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if typing in an input
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return;
      }

      switch (e.key.toLowerCase()) {
        case 'w':
        case 'arrowup':
          e.preventDefault();
          env.tryMove(env.playerX, env.playerY - 1);
          onManualAction('MOVE_TOWARD_RESOURCE');
          break;
        case 's':
        case 'arrowdown':
          e.preventDefault();
          env.tryMove(env.playerX, env.playerY + 1);
          onManualAction('MOVE_TOWARD_RESOURCE');
          break;
        case 'a':
        case 'arrowleft':
          e.preventDefault();
          env.tryMove(env.playerX - 1, env.playerY);
          onManualAction('MOVE_TOWARD_RESOURCE');
          break;
        case 'd':
        case 'arrowright':
          e.preventDefault();
          env.tryMove(env.playerX + 1, env.playerY);
          onManualAction('MOVE_TOWARD_RESOURCE');
          break;
        case ' ':
          // Space: attack if mob nearby, otherwise mine
          e.preventDefault();
          if (currentState.nearestMobDist <= 2.2) {
            onManualAction('ATTACK_TARGET');
          } else {
            onManualAction('MINE_BLOCK');
          }
          break;
        case 'e':
          e.preventDefault();
          onManualAction('EAT_FOOD');
          break;
        case 'c':
          e.preventDefault();
          onManualAction('CRAFT_TOOL');
          break;
        case 't':
          e.preventDefault();
          onManualAction('PLACE_TORCH');
          break;
        case 'b':
          e.preventDefault();
          onManualAction('BUILD_SHELTER');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [manualTakeover, env, currentState, onManualAction]);

  // Main Canvas Render Loop
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    tickRef.current += 1;
    const tick = tickRef.current;

    const width = canvas.width;
    const height = canvas.height;
    const tileSize = width / WORLD_WIDTH;

    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, width, height);

    // 1. Draw Grid Tiles (Minecraft Blocks)
    for (let y = 0; y < WORLD_HEIGHT; y++) {
      for (let x = 0; x < WORLD_WIDTH; x++) {
        const block = env.grid[y][x];
        const px = x * tileSize;
        const py = y * tileSize;

        switch (block) {
          case 'grass': {
            // Dirt base with lush grass top
            ctx.fillStyle = '#5c8e32';
            ctx.fillRect(px, py, tileSize, tileSize);
            // Pixel texture noise
            ctx.fillStyle = '#4e7a2b';
            ctx.fillRect(px + 4, py + 4, tileSize - 8, tileSize - 8);
            ctx.fillStyle = '#689e3a';
            ctx.fillRect(px + 8, py + 8, 4, 4);
            break;
          }
          case 'wood': {
            // Oak log: bark lines
            ctx.fillStyle = '#6b4f2c';
            ctx.fillRect(px, py, tileSize, tileSize);
            ctx.fillStyle = '#4c371f';
            ctx.fillRect(px + 2, py + 2, tileSize - 4, tileSize - 4);
            ctx.fillStyle = '#846238';
            ctx.fillRect(px + 6, py + 6, tileSize - 12, tileSize - 12);
            break;
          }
          case 'leaves': {
            // Oak leaves: textured green
            ctx.fillStyle = '#2d5e1e';
            ctx.fillRect(px, py, tileSize, tileSize);
            ctx.fillStyle = '#3f7c2a';
            ctx.fillRect(px + 3, py + 3, tileSize - 6, tileSize - 6);
            ctx.fillStyle = '#224716';
            ctx.fillRect(px + 7, py + 7, 5, 5);
            break;
          }
          case 'stone': {
            // Stone block: mottled gray
            ctx.fillStyle = '#7a7a7a';
            ctx.fillRect(px, py, tileSize, tileSize);
            ctx.fillStyle = '#666666';
            ctx.fillRect(px + 2, py + 2, tileSize - 4, tileSize - 4);
            ctx.fillStyle = '#8f8f8f';
            ctx.fillRect(px + 4, py + 6, 6, 6);
            break;
          }
          case 'coal_ore': {
            // Stone with black coal flecks
            ctx.fillStyle = '#7a7a7a';
            ctx.fillRect(px, py, tileSize, tileSize);
            ctx.fillStyle = '#1c1917';
            ctx.fillRect(px + 4, py + 4, 6, 6);
            ctx.fillRect(px + 14, py + 12, 6, 6);
            ctx.fillRect(px + 8, py + 18, 5, 5);
            break;
          }
          case 'iron_ore': {
            // Stone with metallic beige flecks
            ctx.fillStyle = '#7a7a7a';
            ctx.fillRect(px, py, tileSize, tileSize);
            ctx.fillStyle = '#d6b896';
            ctx.fillRect(px + 5, py + 5, 6, 6);
            ctx.fillRect(px + 14, py + 14, 6, 6);
            ctx.fillStyle = '#a8896c';
            ctx.fillRect(px + 10, py + 12, 4, 4);
            break;
          }
          case 'water': {
            // Water with animated ripple
            const wave = Math.sin(tick * 0.08 + x + y) * 2;
            ctx.fillStyle = '#1e40af';
            ctx.fillRect(px, py, tileSize, tileSize);
            ctx.fillStyle = '#3b82f6';
            ctx.fillRect(px, py + (wave > 0 ? 3 : 6), tileSize, 4);
            break;
          }
          case 'lava': {
            // Lava with animated bubbling glow
            const bubble = Math.sin(tick * 0.12 + x * 2 + y) * 2;
            ctx.fillStyle = '#c2410c';
            ctx.fillRect(px, py, tileSize, tileSize);
            ctx.fillStyle = '#ea580c';
            ctx.fillRect(px + 2, py + 2 + bubble, tileSize - 4, tileSize - 4);
            ctx.fillStyle = '#fde047';
            ctx.fillRect(px + 8, py + 8 + bubble, 6, 6);
            break;
          }
          case 'planks': {
            // Wood planks
            ctx.fillStyle = '#9a6b38';
            ctx.fillRect(px, py, tileSize, tileSize);
            ctx.fillStyle = '#785329';
            ctx.fillRect(px, py + 8, tileSize, 2);
            ctx.fillRect(px, py + 18, tileSize, 2);
            break;
          }
          default: {
            ctx.fillStyle = '#333';
            ctx.fillRect(px, py, tileSize, tileSize);
          }
        }

        // Block border lines (subtle grid)
        ctx.strokeStyle = 'rgba(0,0,0,0.15)';
        ctx.strokeRect(px, py, tileSize, tileSize);
      }
    }

    // 2. Torches
    for (const torch of env.torches) {
      const tx = torch.x * tileSize + tileSize / 2;
      const ty = torch.y * tileSize + tileSize / 2;
      // Stick
      ctx.fillStyle = '#854d0e';
      ctx.fillRect(tx - 2, ty - 1, 4, 10);
      // Flame with flicker
      const fSize = 4 + (tick % 4);
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(tx, ty - 4, fSize, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(tx, ty - 4, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // 3. Ambient Lighting & Night Darkening Overlay
    if (showLightMap) {
      const isNight = env.isNight();
      const ambientDarkness = isNight ? 0.78 : 0.05;

      // Create radial darkness mask
      const lightCanvas = document.createElement('canvas');
      lightCanvas.width = width;
      lightCanvas.height = height;
      const lCtx = lightCanvas.getContext('2d');
      if (lCtx) {
        lCtx.fillStyle = `rgba(10, 10, 25, ${ambientDarkness})`;
        lCtx.fillRect(0, 0, width, height);

        // Cut out torch lights using destination-out
        lCtx.globalCompositeOperation = 'destination-out';

        // Torch glow
        for (const torch of env.torches) {
          const tx = torch.x * tileSize + tileSize / 2;
          const ty = torch.y * tileSize + tileSize / 2;
          const grad = lCtx.createRadialGradient(tx, ty, 5, tx, ty, tileSize * 4);
          grad.addColorStop(0, 'rgba(0,0,0,1)');
          grad.addColorStop(1, 'rgba(0,0,0,0)');
          lCtx.fillStyle = grad;
          lCtx.beginPath();
          lCtx.arc(tx, ty, tileSize * 4, 0, Math.PI * 2);
          lCtx.fill();
        }

        // Player aura light (lantern)
        const ppx = env.playerX * tileSize + tileSize / 2;
        const ppy = env.playerY * tileSize + tileSize / 2;
        const playerGrad = lCtx.createRadialGradient(ppx, ppy, 4, ppx, ppy, tileSize * 2.5);
        playerGrad.addColorStop(0, 'rgba(0,0,0,0.85)');
        playerGrad.addColorStop(1, 'rgba(0,0,0,0)');
        lCtx.fillStyle = playerGrad;
        lCtx.beginPath();
        lCtx.arc(ppx, ppy, tileSize * 2.5, 0, Math.PI * 2);
        lCtx.fill();

        ctx.drawImage(lightCanvas, 0, 0);
      }
    }

    // 4. Target Raycasts & Perception Lines
    if (showRaycasts && !env.isDead) {
      const ppx = env.playerX * tileSize + tileSize / 2;
      const ppy = env.playerY * tileSize + tileSize / 2;

      // Raycast to nearest hostile mob (Red dashed line)
      const hostile = env.findNearestHostile();
      if (hostile) {
        const hx = hostile.x * tileSize + tileSize / 2;
        const hy = hostile.y * tileSize + tileSize / 2;
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(ppx, ppy);
        ctx.lineTo(hx, hy);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Raycast to nearest resource (Emerald dashed line)
      const res = env.findNearestBlock(['wood', 'iron_ore', 'coal_ore']);
      if (res) {
        const rx = res.x * tileSize + tileSize / 2;
        const ry = res.y * tileSize + tileSize / 2;
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(ppx, ppy);
        ctx.lineTo(rx, ry);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // 5. Draw Entities (Mobs)
    for (const ent of env.entities) {
      const ex = ent.x * tileSize;
      const ey = ent.y * tileSize;

      ctx.save();
      ctx.translate(ex, ey);

      if (ent.type === 'zombie') {
        // Zombie: green skin, cyan shirt, dark pants
        ctx.fillStyle = '#15803d'; // head
        ctx.fillRect(8, 2, 14, 12);
        ctx.fillStyle = '#0f172a'; // eyes
        ctx.fillRect(10, 6, 3, 3);
        ctx.fillRect(17, 6, 3, 3);
        ctx.fillStyle = '#0284c7'; // cyan shirt
        ctx.fillRect(6, 14, 18, 10);
        ctx.fillStyle = '#15803d'; // outstretched arms
        ctx.fillRect(2, 14, 4, 6);
        ctx.fillRect(24, 14, 4, 6);
        ctx.fillStyle = '#1e3a8a'; // pants
        ctx.fillRect(8, 24, 6, 6);
        ctx.fillRect(16, 24, 6, 6);
      } else if (ent.type === 'creeper') {
        // Creeper: green patterned body, sad face
        const isFusing = Math.hypot(ent.x - env.playerX, ent.y - env.playerY) < 2.5;
        const creeperColor = isFusing && tick % 6 < 3 ? '#ffffff' : '#22c55e';
        ctx.fillStyle = creeperColor;
        ctx.fillRect(8, 2, 14, 14); // head
        ctx.fillStyle = '#052e16'; // face
        ctx.fillRect(10, 6, 3, 3);
        ctx.fillRect(17, 6, 3, 3);
        ctx.fillRect(13, 9, 4, 5);
        ctx.fillRect(11, 13, 8, 3);
        // Body & feet
        ctx.fillStyle = creeperColor;
        ctx.fillRect(9, 16, 12, 10);
        ctx.fillRect(6, 26, 6, 4);
        ctx.fillRect(18, 26, 6, 4);
      } else if (ent.type === 'skeleton') {
        // Skeleton: pale gray bones, bow
        ctx.fillStyle = '#e2e8f0';
        ctx.fillRect(9, 2, 12, 12); // skull
        ctx.fillStyle = '#0f172a'; // dark sockets
        ctx.fillRect(11, 6, 3, 3);
        ctx.fillRect(16, 6, 3, 3);
        ctx.fillStyle = '#cbd5e1'; // ribs
        ctx.fillRect(11, 14, 8, 10);
        // Legs
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(10, 24, 3, 6);
        ctx.fillRect(17, 24, 3, 6);
      } else if (ent.type === 'cow') {
        // Cow: brown with white spots, horns
        ctx.fillStyle = '#573315';
        ctx.fillRect(6, 8, 18, 14); // body
        ctx.fillStyle = '#f8fafc'; // spots
        ctx.fillRect(10, 10, 5, 5);
        ctx.fillStyle = '#451a03'; // head
        ctx.fillRect(18, 4, 10, 10);
        ctx.fillStyle = '#e2e8f0'; // horns
        ctx.fillRect(20, 1, 2, 3);
        ctx.fillRect(26, 1, 2, 3);
        // legs
        ctx.fillStyle = '#292524';
        ctx.fillRect(7, 22, 4, 8);
        ctx.fillRect(18, 22, 4, 8);
      } else if (ent.type === 'pig') {
        // Pig: pink body, snout
        ctx.fillStyle = '#f472b6';
        ctx.fillRect(6, 10, 18, 12);
        ctx.fillStyle = '#ec4899';
        ctx.fillRect(18, 6, 10, 10);
        ctx.fillStyle = '#be185d'; // snout
        ctx.fillRect(24, 11, 5, 4);
        ctx.fillStyle = '#292524'; // eyes
        ctx.fillRect(22, 8, 2, 2);
        // legs
        ctx.fillStyle = '#db2777';
        ctx.fillRect(7, 22, 4, 7);
        ctx.fillRect(17, 22, 4, 7);
      }

      // Health bar above mob
      if (ent.hp < ent.maxHp) {
        const hpPercent = Math.max(0, ent.hp / ent.maxHp);
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(4, -6, 22, 4);
        ctx.fillStyle = ent.isHostile ? '#ef4444' : '#22c55e';
        ctx.fillRect(5, -5, 20 * hpPercent, 2);
      }

      ctx.restore();
    }

    // 6. Draw Player (Steve)
    const px = env.playerX * tileSize;
    const py = env.playerY * tileSize;

    ctx.save();
    ctx.translate(px, py);

    // Damage flash red
    const isFlashing = env.combatEvents.some((e) => e.text.includes('-'));

    // Head
    ctx.fillStyle = isFlashing ? '#ef4444' : '#b47746';
    ctx.fillRect(8, 2, 14, 12);
    // Hair
    ctx.fillStyle = '#4a2810';
    ctx.fillRect(8, 2, 14, 4);
    // Eyes
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(10, 6, 3, 2);
    ctx.fillRect(17, 6, 3, 2);
    ctx.fillStyle = '#4338ca'; // purple eyes
    ctx.fillRect(11, 6, 2, 2);
    ctx.fillRect(18, 6, 2, 2);
    // Cyan Shirt
    ctx.fillStyle = isFlashing ? '#ef4444' : '#06b6d4';
    ctx.fillRect(7, 14, 16, 10);
    // Blue Jeans
    ctx.fillStyle = '#1e3a8a';
    ctx.fillRect(8, 24, 6, 6);
    ctx.fillRect(16, 24, 6, 6);

    // Weapon / Tool in hand
    if (env.playerInventory.hasSword) {
      // Iron/Wood sword
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(23, 10, 3, 12);
      ctx.fillStyle = '#78350f';
      ctx.fillRect(22, 20, 5, 2);
    } else if (env.playerInventory.hasPickaxe) {
      // Pickaxe
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(20, 8, 8, 3);
      ctx.fillStyle = '#78350f';
      ctx.fillRect(23, 11, 2, 11);
    }

    ctx.restore();

    // 7. Thought Bubble / Action Badge above Steve
    if (currentDecision && !env.isDead) {
      const actionName = currentDecision.action;
      let badgeColor = '#10b981';
      let badgeIcon = '✨';
      if (actionName === 'ATTACK_TARGET') {
        badgeColor = '#ef4444';
        badgeIcon = '⚔';
      } else if (actionName === 'FLEE_THREAT') {
        badgeColor = '#f59e0b';
        badgeIcon = '🏃';
      } else if (actionName === 'MINE_BLOCK') {
        badgeColor = '#3b82f6';
        badgeIcon = '⛏';
      } else if (actionName === 'EAT_FOOD') {
        badgeColor = '#84cc16';
        badgeIcon = '🍖';
      } else if (actionName === 'PLACE_TORCH') {
        badgeColor = '#eab308';
        badgeIcon = '🕯';
      } else if (actionName === 'BUILD_SHELTER') {
        badgeColor = '#a855f7';
        badgeIcon = '🪵';
      }

      const bubbleX = px + tileSize / 2;
      const bubbleY = py - 8;

      ctx.save();
      ctx.font = 'bold 9px monospace';
      const text = `${badgeIcon} ${actionName}`;
      const textWidth = ctx.measureText(text).width;

      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.strokeStyle = badgeColor;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(bubbleX - textWidth / 2 - 4, bubbleY - 14, textWidth + 8, 14, 4);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = badgeColor;
      ctx.fillText(text, bubbleX - textWidth / 2, bubbleY - 4);
      ctx.restore();
    }

    // 8. Floating Combat & Gathering Text
    for (const ev of env.combatEvents) {
      const cx = ev.x * tileSize + tileSize / 2;
      const cy = ev.y * tileSize - (25 - ev.duration) * 0.8;
      const alpha = Math.min(1, ev.duration / 15);

      ctx.save();
      ctx.font = 'bold 11px monospace';
      ctx.fillStyle = ev.color;
      ctx.globalAlpha = alpha;
      ctx.shadowColor = '#000000';
      ctx.shadowBlur = 4;
      const tw = ctx.measureText(ev.text).width;
      ctx.fillText(ev.text, cx - tw / 2, cy);
      ctx.restore();
    }

    // Continue render loop
    animFrameRef.current = requestAnimationFrame(render);
  }, [env, currentDecision, showRaycasts, showLightMap]);

  useEffect(() => {
    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [render]);

  // Hearts calculation
  const totalHearts = 10;
  const healthInHearts = currentState.health / 2; // 0 to 10

  // Hunger calculation
  const totalDrumsticks = 10;
  const hungerInDrumsticks = currentState.hunger / 2; // 0 to 10

  return (
    <div className="flex flex-col bg-stone-950 border border-stone-800 rounded-xl overflow-hidden shadow-2xl">
      {/* Top Bar of Sandbox */}
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-stone-900 border-b border-stone-800 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-mono font-bold text-stone-200 flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            Minecraft Voxel Sandbox (20x20)
          </span>
          <span className="text-stone-500">|</span>
          <div className="flex items-center gap-1 text-stone-400 font-mono text-[11px]">
            {currentState.isNight ? (
              <span className="flex items-center gap-1 text-purple-400">
                <Moon className="w-3.5 h-3.5" /> Night (Mobs Active)
              </span>
            ) : (
              <span className="flex items-center gap-1 text-amber-400">
                <Sun className="w-3.5 h-3.5" /> Day (Light Level {currentState.lightLevel}/15)
              </span>
            )}
          </div>
        </div>

        {/* View toggles & Manual Play toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowRaycasts(!showRaycasts)}
            className={`px-2 py-1 rounded text-[11px] font-mono flex items-center gap-1 transition-colors ${
              showRaycasts
                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                : 'bg-stone-800 text-stone-400 hover:bg-stone-700'
            }`}
            title="Toggle Sensory Raycasts to nearest mob & resource"
          >
            <Eye className="w-3 h-3" />
            Sensory Rays
          </button>

          <button
            onClick={() => setShowLightMap(!showLightMap)}
            className={`px-2 py-1 rounded text-[11px] font-mono flex items-center gap-1 transition-colors ${
              showLightMap
                ? 'bg-amber-950 text-amber-400 border border-amber-800'
                : 'bg-stone-800 text-stone-400 hover:bg-stone-700'
            }`}
            title="Toggle Dynamic Lighting and Darkness Shadow Map"
          >
            <Flame className="w-3 h-3" />
            Lighting
          </button>

          <button
            onClick={onToggleManualTakeover}
            className={`px-2.5 py-1 rounded text-[11px] font-mono font-bold flex items-center gap-1.5 transition-all ${
              manualTakeover
                ? 'bg-amber-500 text-stone-950 shadow-md shadow-amber-950/50'
                : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
            }`}
            title="Play manually using WASD & keyboard to provide demonstrations"
          >
            <Gamepad2 className="w-3.5 h-3.5" />
            {manualTakeover ? 'Human Controlling (WASD)' : 'Agent Autonomous'}
          </button>
        </div>
      </div>

      {/* Canvas Area */}
      <div className="relative aspect-square w-full max-w-[620px] mx-auto bg-stone-900 flex items-center justify-center p-2">
        <canvas
          ref={canvasRef}
          width={600}
          height={600}
          className="w-full h-full rounded border border-stone-800 shadow-inner"
        />

        {/* Manual control guide overlay if active */}
        {manualTakeover && (
          <div className="absolute top-4 left-4 bg-stone-950/90 border border-amber-500/50 text-amber-200 text-xs px-3 py-2 rounded-lg backdrop-blur shadow-xl pointer-events-none">
            <div className="font-bold mb-1 flex items-center gap-1 text-amber-400">
              <Gamepad2 className="w-3.5 h-3.5" /> Keyboard Controls:
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11px] font-mono text-stone-300">
              <span>W, A, S, D: Move</span>
              <span>Space: Mine / Attack</span>
              <span>E: Eat Food</span>
              <span>C: Craft Weapon</span>
              <span>T: Place Torch</span>
              <span>B: Build Shelter</span>
            </div>
          </div>
        )}

        {/* Death Screen Overlay */}
        {currentState.isDead && (
          <div className="absolute inset-0 bg-red-950/85 backdrop-blur-sm flex flex-col items-center justify-center text-center p-6 select-none">
            <h2 className="text-3xl font-black text-red-500 font-mono tracking-wider drop-shadow-lg mb-2">
              YOU DIED!
            </h2>
            <p className="text-sm text-stone-300 font-mono mb-4 max-w-xs">
              Survival ended at step {currentState.stepCount} with score {currentState.score}.
            </p>
            <button
              onClick={() => env.reset()}
              className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg shadow-lg font-mono text-xs uppercase tracking-wide transition-transform active:scale-95"
            >
              Respawn Agent
            </button>
          </div>
        )}
      </div>

      {/* Minecraft HUD Bar (Hearts, Drumsticks, Inventory Hotbar) */}
      <div className="bg-stone-900 border-t border-stone-800 p-3 flex flex-col gap-2.5">
        {/* Health & Hunger Bars */}
        <div className="flex items-center justify-between gap-4 font-mono">
          {/* Hearts */}
          <div className="flex items-center gap-1" title={`Health: ${currentState.health.toFixed(1)}/20`}>
            <span className="text-[11px] text-stone-400 font-bold mr-1">HP:</span>
            <div className="flex gap-0.5">
              {Array.from({ length: totalHearts }).map((_, i) => {
                const filled = healthInHearts >= i + 1;
                const half = !filled && healthInHearts >= i + 0.5;
                return (
                  <span
                    key={i}
                    className={`text-sm ${
                      filled
                        ? 'text-red-500 drop-shadow-[0_0_4px_rgba(239,68,68,0.6)]'
                        : half
                        ? 'text-red-400 opacity-80'
                        : 'text-stone-700'
                    }`}
                  >
                    ❤
                  </span>
                );
              })}
            </div>
            <span className="text-[11px] text-red-400 ml-1 font-bold">
              {currentState.health.toFixed(0)}/20
            </span>
          </div>

          {/* Hunger Drumsticks */}
          <div className="flex items-center gap-1" title={`Hunger: ${currentState.hunger.toFixed(1)}/20`}>
            <span className="text-[11px] text-stone-400 font-bold mr-1">Hunger:</span>
            <div className="flex gap-0.5">
              {Array.from({ length: totalDrumsticks }).map((_, i) => {
                const filled = hungerInDrumsticks >= i + 1;
                return (
                  <span
                    key={i}
                    className={`text-sm ${
                      filled
                        ? 'text-amber-500 drop-shadow-[0_0_4px_rgba(245,158,11,0.6)]'
                        : 'text-stone-700'
                    }`}
                  >
                    🍖
                  </span>
                );
              })}
            </div>
            <span className="text-[11px] text-amber-400 ml-1 font-bold">
              {currentState.hunger.toFixed(0)}/20
            </span>
          </div>
        </div>

        {/* Authentic Minecraft Hotbar */}
        <div className="flex items-center justify-between gap-2 pt-1 border-t border-stone-800/80">
          <div className="flex items-center gap-1.5 overflow-x-auto py-1">
            {/* Sword */}
            <div
              className={`w-11 h-11 rounded border flex flex-col items-center justify-center relative select-none ${
                currentState.inventory.hasSword
                  ? 'bg-stone-800 border-cyan-500/70 text-cyan-300'
                  : 'bg-stone-950 border-stone-800 text-stone-600 opacity-50'
              }`}
              title="Sword (Deals 6 damage)"
            >
              <span className="text-base">⚔</span>
              <span className="text-[9px] font-mono font-bold leading-none">SWORD</span>
            </div>

            {/* Pickaxe */}
            <div
              className={`w-11 h-11 rounded border flex flex-col items-center justify-center relative select-none ${
                currentState.inventory.hasPickaxe
                  ? 'bg-stone-800 border-sky-500/70 text-sky-300'
                  : 'bg-stone-950 border-stone-800 text-stone-600 opacity-50'
              }`}
              title="Pickaxe (Mines ore & stone)"
            >
              <span className="text-base">⛏</span>
              <span className="text-[9px] font-mono font-bold leading-none">PICK</span>
            </div>

            {/* Wood */}
            <div
              className="w-11 h-11 rounded border bg-stone-800/80 border-stone-700 flex flex-col items-center justify-center relative select-none text-amber-300"
              title="Oak Wood Logs"
            >
              <span className="text-base">🪵</span>
              <span className="absolute bottom-0.5 right-1 text-[10px] font-mono font-black text-white">
                {currentState.inventory.wood}
              </span>
            </div>

            {/* Stone */}
            <div
              className="w-11 h-11 rounded border bg-stone-800/80 border-stone-700 flex flex-col items-center justify-center relative select-none text-stone-300"
              title="Cobblestone"
            >
              <span className="text-base">🪨</span>
              <span className="absolute bottom-0.5 right-1 text-[10px] font-mono font-black text-white">
                {currentState.inventory.stone}
              </span>
            </div>

            {/* Iron */}
            <div
              className="w-11 h-11 rounded border bg-stone-800/80 border-stone-700 flex flex-col items-center justify-center relative select-none text-slate-200"
              title="Iron Ingots"
            >
              <span className="text-base">⚪</span>
              <span className="absolute bottom-0.5 right-1 text-[10px] font-mono font-black text-white">
                {currentState.inventory.iron}
              </span>
            </div>

            {/* Food */}
            <div
              className="w-11 h-11 rounded border bg-stone-800/80 border-stone-700 flex flex-col items-center justify-center relative select-none text-orange-400"
              title="Food Rations"
            >
              <span className="text-base">🍖</span>
              <span className="absolute bottom-0.5 right-1 text-[10px] font-mono font-black text-white">
                {currentState.inventory.food}
              </span>
            </div>

            {/* Torches */}
            <div
              className="w-11 h-11 rounded border bg-stone-800/80 border-stone-700 flex flex-col items-center justify-center relative select-none text-amber-400"
              title="Torches"
            >
              <span className="text-base">🕯</span>
              <span className="absolute bottom-0.5 right-1 text-[10px] font-mono font-black text-white">
                {currentState.inventory.torches}
              </span>
            </div>
          </div>

          {/* Real-time RLHF reward buttons */}
          <div className="flex items-center gap-1.5 pl-2 border-l border-stone-800">
            <button
              onClick={() => onHumanFeedbackReward(10)}
              className="px-2.5 py-1.5 rounded bg-emerald-600/30 hover:bg-emerald-600 border border-emerald-500 text-emerald-300 hover:text-white text-xs font-mono font-bold transition-colors active:scale-95"
              title="Reinforce good behavior (+10 Reward)"
            >
              👍 +10
            </button>
            <button
              onClick={() => onHumanFeedbackReward(-10)}
              className="px-2.5 py-1.5 rounded bg-red-600/30 hover:bg-red-600 border border-red-500 text-red-300 hover:text-white text-xs font-mono font-bold transition-colors active:scale-95"
              title="Punish bad behavior (-10 Penalty)"
            >
              👎 -10
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
