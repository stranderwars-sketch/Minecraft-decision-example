import React, { useState } from 'react';
import {
  RewardWeights,
  TrainingHyperparameters,
  ModelArchitecture,
} from '../ai/types';
import {
  Play,
  Pause,
  FastForward,
  RotateCcw,
  Sliders,
  Sparkles,
  Zap,
  TrendingUp,
  Award,
  Flame,
  Swords,
  Heart,
  TreePine,
  ShieldAlert,
} from 'lucide-react';

interface TrainingStudioProps {
  isRunning: boolean;
  onTogglePlay: () => void;
  onStepOnce: () => void;
  speed: number;
  onSetSpeed: (speed: number) => void;
  onRunBatchTraining: (episodes: number) => Promise<void>;
  isBatchTraining: boolean;
  batchProgress: number;
  isGreedyEval: boolean;
  onToggleGreedyEval: () => void;
  rewardWeights: RewardWeights;
  onUpdateRewardWeights: (newWeights: Partial<RewardWeights>) => void;
  hyperparams: TrainingHyperparameters;
  onUpdateHyperparams: (newHyper: Partial<TrainingHyperparameters>) => void;
  architecture: ModelArchitecture;
  demonstrationCount: number;
  onTrainImitation: () => void;
  onClearDemonstrations: () => void;
}

export const TrainingStudio: React.FC<TrainingStudioProps> = ({
  isRunning,
  onTogglePlay,
  onStepOnce,
  speed,
  onSetSpeed,
  onRunBatchTraining,
  isBatchTraining,
  batchProgress,
  isGreedyEval,
  onToggleGreedyEval,
  rewardWeights,
  onUpdateRewardWeights,
  hyperparams,
  onUpdateHyperparams,
  architecture,
  demonstrationCount,
  onTrainImitation,
  onClearDemonstrations,
}) => {
  const [activeTab, setActiveTab] = useState<'simulation' | 'rewards' | 'hyperparams' | 'imitation'>(
    'simulation'
  );

  return (
    <div className="flex flex-col bg-stone-950 border border-stone-800 rounded-xl overflow-hidden shadow-xl">
      {/* Tab Navigation */}
      <div className="flex items-center border-b border-stone-800 bg-stone-900/90 px-3 pt-2 gap-1 overflow-x-auto">
        <button
          onClick={() => setActiveTab('simulation')}
          className={`px-3 py-2 text-xs font-mono font-bold rounded-t-lg transition-colors flex items-center gap-1.5 ${
            activeTab === 'simulation'
              ? 'bg-stone-950 text-emerald-400 border-t-2 border-emerald-500'
              : 'text-stone-400 hover:text-stone-200'
          }`}
        >
          <Play className="w-3.5 h-3.5" />
          Simulation & Batch Train
        </button>

        <button
          onClick={() => setActiveTab('rewards')}
          className={`px-3 py-2 text-xs font-mono font-bold rounded-t-lg transition-colors flex items-center gap-1.5 ${
            activeTab === 'rewards'
              ? 'bg-stone-950 text-emerald-400 border-t-2 border-emerald-500'
              : 'text-stone-400 hover:text-stone-200'
          }`}
        >
          <Award className="w-3.5 h-3.5" />
          Reward Designer
        </button>

        <button
          onClick={() => setActiveTab('hyperparams')}
          className={`px-3 py-2 text-xs font-mono font-bold rounded-t-lg transition-colors flex items-center gap-1.5 ${
            activeTab === 'hyperparams'
              ? 'bg-stone-950 text-emerald-400 border-t-2 border-emerald-500'
              : 'text-stone-400 hover:text-stone-200'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          Hyperparameters
        </button>

        <button
          onClick={() => setActiveTab('imitation')}
          className={`px-3 py-2 text-xs font-mono font-bold rounded-t-lg transition-colors flex items-center gap-1.5 ${
            activeTab === 'imitation'
              ? 'bg-stone-950 text-emerald-400 border-t-2 border-emerald-500'
              : 'text-stone-400 hover:text-stone-200'
          }`}
        >
          <Swords className="w-3.5 h-3.5" />
          Demonstrations ({demonstrationCount})
        </button>
      </div>

      <div className="p-4 flex flex-col gap-4">
        {/* TAB 1: Simulation & Batch Training Controls */}
        {activeTab === 'simulation' && (
          <div className="flex flex-col gap-4">
            {/* Live Play Controls */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-stone-900/80 p-3 rounded-lg border border-stone-800">
              <div className="flex items-center gap-2">
                <button
                  onClick={onTogglePlay}
                  className={`px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-1.5 shadow-md transition-all active:scale-95 ${
                    isRunning
                      ? 'bg-amber-600 hover:bg-amber-500 text-white'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  }`}
                  aria-label={isRunning ? 'Pause simulation' : 'Start simulation'}
                >
                  {isRunning ? (
                    <>
                      <Pause className="w-4 h-4" /> Pause Agent
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" /> Run Agent
                    </>
                  )}
                </button>

                <button
                  onClick={onStepOnce}
                  disabled={isRunning}
                  className="px-3 py-2 rounded-lg bg-stone-800 hover:bg-stone-700 disabled:opacity-40 text-stone-300 font-mono text-xs flex items-center gap-1 transition-colors"
                  title="Advance single tick"
                >
                  Step (1 Tick)
                </button>
              </div>

              {/* Speed Buttons */}
              <div className="flex items-center gap-1 bg-stone-950 p-1 rounded-lg border border-stone-800">
                <span className="text-[10px] font-mono text-stone-500 px-1.5">Speed:</span>
                {[1, 2, 5, 20].map((s) => (
                  <button
                    key={s}
                    onClick={() => onSetSpeed(s)}
                    className={`px-2 py-1 rounded text-xs font-mono font-bold transition-colors ${
                      speed === s
                        ? 'bg-emerald-600 text-white'
                        : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800'
                    }`}
                  >
                    {s}x
                  </button>
                ))}
              </div>

              {/* Mode: Exploration vs Greedy Evaluation */}
              <button
                onClick={onToggleGreedyEval}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold border transition-all ${
                  isGreedyEval
                    ? 'bg-purple-950 text-purple-300 border-purple-600'
                    : 'bg-stone-800 text-stone-300 border-stone-700'
                }`}
                title="Toggle between training with random exploration vs pure optimal greedy policy"
              >
                {isGreedyEval ? '🎯 Pure Exploitation (Greedy)' : '🎲 Training (ε-Exploration)'}
              </button>
            </div>

            {/* Rapid Batch Training (High-Speed Headless RL Loop) */}
            <div className="bg-stone-900/80 p-3.5 rounded-lg border border-stone-800 flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-mono font-bold text-stone-200 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    High-Speed Batch RL Training
                  </h3>
                  <p className="text-[11px] text-stone-400">
                    Runs fast headless episodes to train Q-values and build replay buffer
                  </p>
                </div>
                {isBatchTraining && (
                  <span className="text-xs font-mono font-bold text-emerald-400 animate-pulse">
                    Training: {batchProgress}%
                  </span>
                )}
              </div>

              {/* Progress bar */}
              {isBatchTraining && (
                <div className="w-full bg-stone-950 h-2 rounded-full overflow-hidden border border-stone-800">
                  <div
                    className="bg-emerald-500 h-full transition-all duration-100"
                    style={{ width: `${batchProgress}%` }}
                  />
                </div>
              )}

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => onRunBatchTraining(10)}
                  disabled={isBatchTraining}
                  className="px-3 py-1.5 rounded-md bg-stone-800 hover:bg-stone-700 disabled:opacity-50 text-stone-200 font-mono text-xs font-bold border border-stone-700 transition-colors"
                >
                  Train +10 Episodes
                </button>
                <button
                  onClick={() => onRunBatchTraining(50)}
                  disabled={isBatchTraining}
                  className="px-3.5 py-1.5 rounded-md bg-emerald-600/30 hover:bg-emerald-600 border border-emerald-500 text-emerald-200 hover:text-white font-mono text-xs font-bold transition-colors"
                >
                  Train +50 Episodes
                </button>
                <button
                  onClick={() => onRunBatchTraining(150)}
                  disabled={isBatchTraining}
                  className="px-3.5 py-1.5 rounded-md bg-amber-600/30 hover:bg-amber-600 border border-amber-500 text-amber-200 hover:text-white font-mono text-xs font-bold transition-colors"
                >
                  Train +150 Episodes (Deep Policy)
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Reward Function Designer */}
        {activeTab === 'rewards' && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-mono font-bold text-stone-200">
                  Reinforcement Learning Reward Function Tuner
                </h3>
                <p className="text-[11px] text-stone-400">
                  Shape agent motivations: Positive points incentivize habits; negative penalties deter death.
                </p>
              </div>
              <button
                onClick={() =>
                  onUpdateRewardWeights({
                    gatherWood: 5.0,
                    mineOre: 8.0,
                    killHostile: 12.0,
                    survivalPerSec: 0.1,
                    eatWhenHungry: 4.0,
                    takeDamagePenalty: -6.0,
                    deathPenalty: -50.0,
                    lavaPenalty: -10.0,
                  })
                }
                className="text-[11px] font-mono text-stone-400 hover:text-stone-200 underline"
              >
                Reset to Defaults
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Wood */}
              <div className="bg-stone-900 p-2.5 rounded-lg border border-stone-800 flex flex-col gap-1">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-stone-300 flex items-center gap-1">
                    <TreePine className="w-3.5 h-3.5 text-amber-500" /> Wood Harvest
                  </span>
                  <span className="font-bold text-emerald-400">+{rewardWeights.gatherWood}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="20"
                  step="0.5"
                  value={rewardWeights.gatherWood}
                  onChange={(e) => onUpdateRewardWeights({ gatherWood: parseFloat(e.target.value) })}
                  className="accent-emerald-500 cursor-pointer"
                />
              </div>

              {/* Ore */}
              <div className="bg-stone-900 p-2.5 rounded-lg border border-stone-800 flex flex-col gap-1">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-stone-300 flex items-center gap-1">
                    ⛏ Iron & Coal Mining
                  </span>
                  <span className="font-bold text-emerald-400">+{rewardWeights.mineOre}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="25"
                  step="0.5"
                  value={rewardWeights.mineOre}
                  onChange={(e) => onUpdateRewardWeights({ mineOre: parseFloat(e.target.value) })}
                  className="accent-emerald-500 cursor-pointer"
                />
              </div>

              {/* Mob Kill */}
              <div className="bg-stone-900 p-2.5 rounded-lg border border-stone-800 flex flex-col gap-1">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-stone-300 flex items-center gap-1">
                    <Swords className="w-3.5 h-3.5 text-red-400" /> Slaying Hostile Mob
                  </span>
                  <span className="font-bold text-emerald-400">+{rewardWeights.killHostile}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="30"
                  step="1"
                  value={rewardWeights.killHostile}
                  onChange={(e) => onUpdateRewardWeights({ killHostile: parseFloat(e.target.value) })}
                  className="accent-emerald-500 cursor-pointer"
                />
              </div>

              {/* Eating */}
              <div className="bg-stone-900 p-2.5 rounded-lg border border-stone-800 flex flex-col gap-1">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-stone-300 flex items-center gap-1">
                    🍖 Eating Food when Low
                  </span>
                  <span className="font-bold text-emerald-400">+{rewardWeights.eatWhenHungry}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="15"
                  step="0.5"
                  value={rewardWeights.eatWhenHungry}
                  onChange={(e) =>
                    onUpdateRewardWeights({ eatWhenHungry: parseFloat(e.target.value) })
                  }
                  className="accent-emerald-500 cursor-pointer"
                />
              </div>

              {/* Damage Penalty */}
              <div className="bg-stone-900 p-2.5 rounded-lg border border-stone-800 flex flex-col gap-1">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-stone-300 flex items-center gap-1">
                    <Heart className="w-3.5 h-3.5 text-red-500" /> Damage Taken Penalty
                  </span>
                  <span className="font-bold text-red-400">{rewardWeights.takeDamagePenalty}</span>
                </div>
                <input
                  type="range"
                  min="-25"
                  max="0"
                  step="0.5"
                  value={rewardWeights.takeDamagePenalty}
                  onChange={(e) =>
                    onUpdateRewardWeights({ takeDamagePenalty: parseFloat(e.target.value) })
                  }
                  className="accent-red-500 cursor-pointer"
                />
              </div>

              {/* Death Penalty */}
              <div className="bg-stone-900 p-2.5 rounded-lg border border-stone-800 flex flex-col gap-1">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-stone-300 flex items-center gap-1">
                    <ShieldAlert className="w-3.5 h-3.5 text-red-600" /> Death Catastrophe
                  </span>
                  <span className="font-bold text-red-500">{rewardWeights.deathPenalty}</span>
                </div>
                <input
                  type="range"
                  min="-100"
                  max="-10"
                  step="5"
                  value={rewardWeights.deathPenalty}
                  onChange={(e) =>
                    onUpdateRewardWeights({ deathPenalty: parseFloat(e.target.value) })
                  }
                  className="accent-red-500 cursor-pointer"
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: Hyperparameters Tuner */}
        {activeTab === 'hyperparams' && (
          <div className="flex flex-col gap-3 font-mono text-xs">
            <h3 className="font-bold text-stone-200">DQN Neural Network Hyperparameters</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-stone-900 p-3 rounded-lg border border-stone-800 flex flex-col gap-1">
                <div className="flex justify-between">
                  <span className="text-stone-400">Learning Rate (α)</span>
                  <span className="font-bold text-emerald-400">{hyperparams.learningRate}</span>
                </div>
                <input
                  type="range"
                  min="0.001"
                  max="0.02"
                  step="0.001"
                  value={hyperparams.learningRate}
                  onChange={(e) =>
                    onUpdateHyperparams({ learningRate: parseFloat(e.target.value) })
                  }
                  className="accent-emerald-500 cursor-pointer"
                />
              </div>

              <div className="bg-stone-900 p-3 rounded-lg border border-stone-800 flex flex-col gap-1">
                <div className="flex justify-between">
                  <span className="text-stone-400">Discount Factor (γ)</span>
                  <span className="font-bold text-emerald-400">{hyperparams.gamma}</span>
                </div>
                <input
                  type="range"
                  min="0.80"
                  max="0.99"
                  step="0.01"
                  value={hyperparams.gamma}
                  onChange={(e) => onUpdateHyperparams({ gamma: parseFloat(e.target.value) })}
                  className="accent-emerald-500 cursor-pointer"
                />
              </div>

              <div className="bg-stone-900 p-3 rounded-lg border border-stone-800 flex flex-col gap-1">
                <div className="flex justify-between">
                  <span className="text-stone-400">Current Epsilon (ε)</span>
                  <span className="font-bold text-amber-400">{hyperparams.epsilon.toFixed(3)}</span>
                </div>
                <input
                  type="range"
                  min="0.05"
                  max="1.0"
                  step="0.05"
                  value={hyperparams.epsilon}
                  onChange={(e) => onUpdateHyperparams({ epsilon: parseFloat(e.target.value) })}
                  className="accent-amber-500 cursor-pointer"
                />
              </div>

              <div className="bg-stone-900 p-3 rounded-lg border border-stone-800 flex flex-col gap-1">
                <div className="flex justify-between">
                  <span className="text-stone-400">Replay Batch Size</span>
                  <span className="font-bold text-emerald-400">{hyperparams.batchSize}</span>
                </div>
                <input
                  type="range"
                  min="8"
                  max="64"
                  step="8"
                  value={hyperparams.batchSize}
                  onChange={(e) => onUpdateHyperparams({ batchSize: parseInt(e.target.value) })}
                  className="accent-emerald-500 cursor-pointer"
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: Imitation Learning Demonstrations */}
        {activeTab === 'imitation' && (
          <div className="flex flex-col gap-3 font-mono text-xs">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-stone-200">Human Demonstration Cloning</h3>
                <p className="text-[11px] text-stone-400">
                  Switch to "Human Controlling (WASD)" above to play and record actions, then clone your playstyle!
                </p>
              </div>
              <span className="px-2 py-1 bg-stone-900 rounded border border-stone-800 text-emerald-400 font-bold">
                {demonstrationCount} Samples Recorded
              </span>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={onTrainImitation}
                disabled={demonstrationCount === 0}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold rounded-lg shadow-md flex items-center gap-1.5 transition-colors"
              >
                <Sparkles className="w-4 h-4" />
                Train Model on Demonstrations
              </button>

              <button
                onClick={onClearDemonstrations}
                disabled={demonstrationCount === 0}
                className="px-3 py-2 bg-stone-800 hover:bg-stone-700 disabled:opacity-40 text-stone-300 rounded-lg transition-colors"
              >
                Clear Buffer
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
