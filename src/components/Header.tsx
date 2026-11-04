import React from 'react';
import {
  Brain,
  Download,
  RotateCcw,
  Sparkles,
  Swords,
  TreePine,
  ShieldAlert,
  Flame,
  HelpCircle,
} from 'lucide-react';
import { ModelArchitecture } from '../ai/types';

interface HeaderProps {
  architecture: ModelArchitecture;
  setArchitecture: (arch: ModelArchitecture) => void;
  episodeCount: number;
  totalSteps: number;
  onResetEnv: () => void;
  onLoadScenario: (scenario: 'forest' | 'night' | 'mine' | 'lava') => void;
  onOpenExport: () => void;
  onOpenHelp: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  architecture,
  setArchitecture,
  episodeCount,
  totalSteps,
  onResetEnv,
  onLoadScenario,
  onOpenExport,
  onOpenHelp,
}) => {
  return (
    <header className="bg-stone-900 border-b border-stone-800 text-stone-100 px-4 py-3 select-none">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-700/80 border-2 border-emerald-500/60 flex items-center justify-center shadow-lg shadow-emerald-950/40">
            <Brain className="w-6 h-6 text-emerald-200" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-white font-mono">
                CraftBrain
              </h1>
              <span className="px-1.5 py-0.5 text-[10px] uppercase font-mono font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800 rounded">
                Decision AI
              </span>
            </div>
            <p className="text-xs text-stone-400">
              Minecraft Autonomous Decision Model Trainer & Mineflayer Exporter
            </p>
          </div>
        </div>

        {/* Architecture Switcher */}
        <div className="flex items-center bg-stone-950/80 p-1 rounded-lg border border-stone-800">
          <button
            onClick={() => setArchitecture('dqn')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 ${
              architecture === 'dqn'
                ? 'bg-emerald-600 text-white shadow-sm font-semibold'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/60'
            }`}
            title="Deep Q-Network: Deep reinforcement learning with neural policy"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Neural DQN
          </button>
          <button
            onClick={() => setArchitecture('decision_tree')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 ${
              architecture === 'decision_tree'
                ? 'bg-emerald-600 text-white shadow-sm font-semibold'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/60'
            }`}
            title="Hierarchical Behavior Tree: Explainable rules with configurable priority"
          >
            <TreePine className="w-3.5 h-3.5" />
            Behavior Tree
          </button>
          <button
            onClick={() => setArchitecture('imitation')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 ${
              architecture === 'imitation'
                ? 'bg-emerald-600 text-white shadow-sm font-semibold'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/60'
            }`}
            title="Imitation Learning: Train bot by cloning human player demonstrations"
          >
            <Swords className="w-3.5 h-3.5" />
            Imitation (Cloning)
          </button>
        </div>

        {/* Scenarios & Global Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Quick Scenario Selector */}
          <div className="hidden sm:flex items-center gap-1 bg-stone-950/60 px-2 py-1 rounded-md border border-stone-800/80 text-xs text-stone-400">
            <span className="text-[11px] font-mono text-stone-500 mr-1">Scenario:</span>
            <button
              onClick={() => onLoadScenario('forest')}
              className="px-1.5 py-0.5 rounded hover:bg-stone-800 hover:text-emerald-300 transition-colors"
              title="Forest survival: gathering wood and crafting"
            >
              Forest
            </button>
            <span className="text-stone-700">|</span>
            <button
              onClick={() => onLoadScenario('night')}
              className="px-1.5 py-0.5 rounded hover:bg-stone-800 hover:text-purple-300 transition-colors"
              title="Night defense: battling zombies and surviving"
            >
              Night Arena
            </button>
            <span className="text-stone-700">|</span>
            <button
              onClick={() => onLoadScenario('mine')}
              className="px-1.5 py-0.5 rounded hover:bg-stone-800 hover:text-blue-300 transition-colors"
              title="Cave mining: iron & coal veins"
            >
              Mining
            </button>
            <span className="text-stone-700">|</span>
            <button
              onClick={() => onLoadScenario('lava')}
              className="px-1.5 py-0.5 rounded hover:bg-stone-800 hover:text-amber-300 transition-colors"
              title="Hazard avoidance: molten lava lake"
            >
              Lava Hazard
            </button>
          </div>

          {/* Reset button */}
          <button
            onClick={onResetEnv}
            className="p-1.5 rounded-md bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white transition-colors border border-stone-700/60"
            title="Reset sandbox environment"
            aria-label="Reset simulation"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Help */}
          <button
            onClick={onOpenHelp}
            className="p-1.5 rounded-md bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white transition-colors border border-stone-700/60"
            title="How to train and deploy to Minecraft"
            aria-label="Open documentation guide"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          {/* Export Button */}
          <button
            onClick={onOpenExport}
            className="px-3.5 py-1.5 rounded-md bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-bold text-xs shadow-md shadow-emerald-950/50 flex items-center gap-1.5 transition-all"
            aria-label="Export trained model to Minecraft bot"
          >
            <Download className="w-4 h-4 text-stone-950" />
            <span>Export to Minecraft</span>
          </button>
        </div>
      </div>
    </header>
  );
};
