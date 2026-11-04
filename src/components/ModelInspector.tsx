import React from 'react';
import {
  ACTION_LIST,
  DecisionModelOutput,
  EpisodeStats,
  ModelArchitecture,
} from '../ai/types';
import { STATE_FEATURE_NAMES } from '../ai/featurizer';
import { DQNModel } from '../ai/dqn';
import { DecisionTreeModel } from '../ai/decisionTree';
import { Check, Flame, Sliders, Activity, Zap } from 'lucide-react';

interface ModelInspectorProps {
  architecture: ModelArchitecture;
  dqnModel: DQNModel;
  decisionTreeModel: DecisionTreeModel;
  currentDecision: DecisionModelOutput | null;
  stateVector: number[];
  episodeStats: EpisodeStats[];
  onToggleRule: (ruleId: string) => void;
  onUpdateRulePriority: (ruleId: string, priority: number) => void;
}

export const ModelInspector: React.FC<ModelInspectorProps> = ({
  architecture,
  dqnModel,
  decisionTreeModel,
  currentDecision,
  stateVector,
  episodeStats,
  onToggleRule,
  onUpdateRulePriority,
}) => {
  const latestEpisode = episodeStats[episodeStats.length - 1];

  return (
    <div className="flex flex-col gap-4 bg-stone-950 border border-stone-800 rounded-xl p-4 shadow-xl">
      <div className="flex items-center justify-between border-b border-stone-800 pb-2.5">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-emerald-400" />
          <h2 className="text-sm font-bold font-mono text-stone-200 uppercase tracking-wide">
            Model Decision Inspector
          </h2>
        </div>
        <span className="text-xs font-mono text-stone-400 bg-stone-900 px-2 py-0.5 rounded border border-stone-800">
          Architecture:{' '}
          <span className="text-emerald-400 font-bold">
            {architecture === 'dqn'
              ? 'Deep Q-Network (RL)'
              : architecture === 'decision_tree'
              ? 'Behavior Tree'
              : 'Imitation Learning'}
          </span>
        </span>
      </div>

      {/* 1. Deep Q-Network Inspector (or Imitation Network) */}
      {(architecture === 'dqn' || architecture === 'imitation') && (
        <div className="flex flex-col gap-3">
          {/* Action Q-Values Bar chart */}
          <div className="bg-stone-900/90 rounded-lg p-3 border border-stone-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono font-bold text-stone-300">
                Action Policy Evaluation (Q-Values / Softmax Logits)
              </span>
              {currentDecision && (
                <span className="text-[11px] font-mono text-emerald-400 font-bold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">
                  Chosen: {currentDecision.action} ({(currentDecision.confidence * 100).toFixed(1)}%)
                </span>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              {ACTION_LIST.map((action, idx) => {
                const qVal = currentDecision?.qValues[idx] ?? 0;
                const isWinner = currentDecision?.actionIndex === idx;

                // Scale bar width based on normalized Q
                const minQ = Math.min(...(currentDecision?.qValues ?? [0]));
                const maxQ = Math.max(...(currentDecision?.qValues ?? [1]));
                const range = Math.max(1, maxQ - minQ);
                const normWidth = Math.max(8, Math.min(100, ((qVal - minQ) / range) * 100));

                return (
                  <div key={action} className="flex items-center gap-2 text-xs font-mono">
                    <span
                      className={`w-44 truncate ${
                        isWinner
                          ? 'text-emerald-400 font-bold'
                          : 'text-stone-400'
                      }`}
                    >
                      {isWinner ? '▶ ' : '  '}
                      {action}
                    </span>
                    <div className="flex-1 bg-stone-950 h-4 rounded overflow-hidden p-0.5 border border-stone-800">
                      <div
                        className={`h-full rounded-sm transition-all duration-150 ${
                          isWinner
                            ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50'
                            : 'bg-stone-700'
                        }`}
                        style={{ width: `${normWidth}%` }}
                      />
                    </div>
                    <span
                      className={`w-12 text-right font-mono text-[11px] ${
                        isWinner ? 'text-emerald-300 font-bold' : 'text-stone-500'
                      }`}
                    >
                      {qVal.toFixed(2)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Sensory Feature Inputs Table */}
          <div className="bg-stone-900/90 rounded-lg p-3 border border-stone-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono font-bold text-stone-300">
                Live Sensory Input Vector (16 Features)
              </span>
              <span className="text-[11px] font-mono text-stone-500">
                Normalized [0.0 - 1.0]
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono">
              {STATE_FEATURE_NAMES.map((name, i) => {
                const val = stateVector[i] ?? 0;
                const isHigh = val > 0.5;
                return (
                  <div
                    key={name}
                    className="flex flex-col bg-stone-950 p-1.5 rounded border border-stone-800/80"
                  >
                    <span className="text-stone-400 truncate text-[10px]">{name}</span>
                    <div className="flex items-center justify-between mt-1">
                      <div className="w-16 bg-stone-800 h-1.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${
                            isHigh ? 'bg-emerald-400' : 'bg-stone-600'
                          }`}
                          style={{ width: `${Math.min(100, Math.max(5, val * 100))}%` }}
                        />
                      </div>
                      <span className="font-bold text-stone-300 text-[10px]">
                        {val.toFixed(2)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 2. Hierarchical Behavior Tree Rules Inspector */}
      {architecture === 'decision_tree' && (
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-stone-300">
              Behavior Tree Rules (Evaluated by Priority Order)
            </span>
            <span className="text-[11px] font-mono text-stone-500">
              Top matching rule executes
            </span>
          </div>

          <div className="flex flex-col gap-1.5 max-h-[380px] overflow-y-auto pr-1">
            {decisionTreeModel.rules.map((rule) => {
              const isTriggered =
                currentDecision?.ruleExplanation?.includes(rule.name);

              return (
                <div
                  key={rule.id}
                  className={`p-2.5 rounded-lg border transition-all text-xs font-mono flex flex-col gap-1 ${
                    isTriggered
                      ? 'bg-emerald-950/40 border-emerald-500 shadow-md shadow-emerald-950/50'
                      : 'bg-stone-900 border-stone-800 opacity-90'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={rule.enabled}
                        onChange={() => onToggleRule(rule.id)}
                        className="rounded border-stone-700 bg-stone-950 text-emerald-500 focus:ring-emerald-500 cursor-pointer"
                        title="Enable or disable rule"
                      />
                      <span
                        className={`font-bold ${
                          isTriggered ? 'text-emerald-300' : 'text-stone-200'
                        }`}
                      >
                        {rule.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-stone-500">P:</span>
                      <input
                        type="number"
                        value={rule.priority}
                        onChange={(e) =>
                          onUpdateRulePriority(rule.id, parseInt(e.target.value) || 0)
                        }
                        className="w-12 px-1.5 py-0.5 bg-stone-950 border border-stone-700 rounded text-[11px] font-mono text-stone-200 text-center"
                        title="Rule execution priority"
                      />
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-stone-800 text-emerald-400 border border-stone-700">
                        {rule.action}
                      </span>
                    </div>
                  </div>

                  <div className="text-[11px] text-stone-400 bg-stone-950/70 p-1.5 rounded border border-stone-800/60 flex items-center justify-between">
                    <code>if ({rule.conditionCode})</code>
                    {isTriggered && (
                      <span className="text-emerald-400 font-bold flex items-center gap-1 text-[10px]">
                        <Check className="w-3 h-3" /> MATCHED
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. Training Stats & History Metrics */}
      <div className="bg-stone-900/90 rounded-lg p-3 border border-stone-800 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono font-bold text-stone-300">
            Training History ({episodeStats.length} Episodes Completed)
          </span>
          {latestEpisode && (
            <span className="text-[11px] font-mono text-stone-400">
              Last Reward:{' '}
              <span
                className={`font-bold ${
                  latestEpisode.totalReward >= 0
                    ? 'text-emerald-400'
                    : 'text-red-400'
                }`}
              >
                {latestEpisode.totalReward.toFixed(1)}
              </span>{' '}
              | Loss: {latestEpisode.loss.toFixed(4)} | ε:{' '}
              {latestEpisode.epsilon.toFixed(2)}
            </span>
          )}
        </div>

        {/* Mini Sparkline / Trend visualization */}
        {episodeStats.length > 1 ? (
          <div className="h-14 w-full bg-stone-950 rounded border border-stone-800 p-1 relative flex items-end gap-1">
            {episodeStats.slice(-30).map((ep, i, arr) => {
              const maxR = Math.max(...arr.map((e) => Math.abs(e.totalReward)), 10);
              const heightPercent = Math.min(
                100,
                Math.max(10, (Math.abs(ep.totalReward) / maxR) * 90)
              );
              const isPositive = ep.totalReward >= 0;

              return (
                <div
                  key={ep.episode}
                  className="flex-1 flex flex-col justify-end items-center group relative h-full"
                >
                  <div
                    className={`w-full rounded-t-sm transition-all ${
                      isPositive ? 'bg-emerald-500' : 'bg-red-500'
                    }`}
                    style={{ height: `${heightPercent}%` }}
                  />
                  {/* Tooltip on hover */}
                  <div className="hidden group-hover:block absolute bottom-full mb-1 z-20 bg-stone-900 text-stone-200 text-[9px] font-mono p-1 rounded border border-stone-700 whitespace-nowrap">
                    Ep {ep.episode}: R={ep.totalReward.toFixed(1)} | Steps={ep.stepsSurvived}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-[11px] font-mono text-stone-500 py-2 text-center">
            Run batch training or let simulation run to record episode reward curves.
          </div>
        )}
      </div>
    </div>
  );
};
