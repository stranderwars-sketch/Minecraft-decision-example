/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Header } from './components/Header';
import { MinecraftCanvas } from './components/MinecraftCanvas';
import { TrainingStudio } from './components/TrainingStudio';
import { ModelInspector } from './components/ModelInspector';
import { ExportModal } from './components/ExportModal';
import { HelpModal } from './components/HelpModal';
import {
  MinecraftEnvironment,
  WORLD_WIDTH,
  WORLD_HEIGHT,
  DEFAULT_REWARD_WEIGHTS,
} from './ai/environment';
import { DQNModel } from './ai/dqn';
import { DecisionTreeModel } from './ai/decisionTree';
import { ImitationModel } from './ai/imitationLearning';
import { extractStateVector } from './ai/featurizer';
import {
  DecisionModelOutput,
  DemonstrationSample,
  EpisodeStats,
  MinecraftAction,
  MinecraftState,
  ModelArchitecture,
  RewardWeights,
  TrainingHyperparameters,
} from './ai/types';

export default function App() {
  // Environments & Models (stored in refs for persistent state without teardowns)
  const envRef = useRef<MinecraftEnvironment>(new MinecraftEnvironment());
  const dqnRef = useRef<DQNModel>(new DQNModel());
  const treeRef = useRef<DecisionTreeModel>(new DecisionTreeModel());
  const imitationRef = useRef<ImitationModel>(new ImitationModel());

  // UI States
  const [architecture, setArchitecture] = useState<ModelArchitecture>('dqn');
  const [currentState, setCurrentState] = useState<MinecraftState>(() =>
    envRef.current.getState()
  );
  const [currentDecision, setCurrentDecision] = useState<DecisionModelOutput | null>(
    null
  );
  const [isRunning, setIsRunning] = useState<boolean>(true);
  const [speed, setSpeed] = useState<number>(2);
  const [isGreedyEval, setIsGreedyEval] = useState<boolean>(false);

  // Batch Training State
  const [isBatchTraining, setIsBatchTraining] = useState<boolean>(false);
  const [batchProgress, setBatchProgress] = useState<number>(0);
  const [episodeStats, setEpisodeStats] = useState<EpisodeStats[]>([]);

  // Imitation Demonstrations
  const [demonstrations, setDemonstrations] = useState<DemonstrationSample[]>([]);
  const [manualTakeover, setManualTakeover] = useState<boolean>(false);

  // Rewards & Hyperparams
  const [rewardWeights, setRewardWeights] = useState<RewardWeights>(
    DEFAULT_REWARD_WEIGHTS
  );
  const [hyperparams, setHyperparams] = useState<TrainingHyperparameters>(
    dqnRef.current.hyperparams
  );

  // Modals
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  // Running tracking
  const episodeRewardRef = useRef<number>(0);
  const episodeCountRef = useRef<number>(0);
  const totalStepsRef = useRef<number>(0);

  // Compute next action based on active architecture
  const decideAction = useCallback(
    (state: MinecraftState, greedy: boolean = false): DecisionModelOutput => {
      const stateVector = extractStateVector(state);

      if (architecture === 'decision_tree') {
        return treeRef.current.selectAction(state);
      } else if (architecture === 'imitation') {
        const pred = imitationRef.current.predictAction(stateVector);
        return {
          action: pred.action,
          actionIndex: pred.actionIndex,
          qValues: pred.qValues,
          confidence: 0.9,
          ruleExplanation: 'Cloned human player policy',
        };
      }

      // Default: DQN
      return dqnRef.current.selectAction(stateVector, greedy);
    },
    [architecture]
  );

  // Single Simulation Tick
  const stepSimulation = useCallback(() => {
    const env = envRef.current;
    if (env.isDead) {
      // Record episode end stats
      const stats: EpisodeStats = {
        episode: episodeCountRef.current++,
        totalReward: episodeRewardRef.current,
        stepsSurvived: env.stepCount,
        woodGathered: env.playerInventory.wood,
        mobsDefeated: env.score,
        loss: 0,
        epsilon: dqnRef.current.hyperparams.epsilon,
        died: true,
      };
      setEpisodeStats((prev) => [...prev.slice(-49), stats]);
      episodeRewardRef.current = 0;

      // Reset world
      env.reset();
      const freshState = env.getState();
      setCurrentState(freshState);
      setCurrentDecision(null);
      return;
    }

    const sState = env.getState();
    const sVector = extractStateVector(sState);

    // Get model decision
    const decision = decideAction(sState, isGreedyEval);
    setCurrentDecision(decision);

    // Step the environment
    const { nextState, reward, done } = env.step(decision.action);
    episodeRewardRef.current += reward;
    totalStepsRef.current++;

    const nextVector = extractStateVector(nextState);

    // DQN Experience Replay Storage & Training
    if (architecture === 'dqn') {
      dqnRef.current.storeTransition({
        state: sVector,
        action: decision.actionIndex,
        reward,
        nextState: nextVector,
        done,
      });

      // Periodic training step
      if (!isGreedyEval && totalStepsRef.current % 4 === 0) {
        dqnRef.current.trainStep();
        dqnRef.current.decayEpsilon();
      }
    }

    if (done) {
      const stats: EpisodeStats = {
        episode: episodeCountRef.current++,
        totalReward: episodeRewardRef.current,
        stepsSurvived: env.stepCount,
        woodGathered: env.playerInventory.wood,
        mobsDefeated: env.score,
        loss: 0,
        epsilon: dqnRef.current.hyperparams.epsilon,
        died: env.isDead,
      };
      setEpisodeStats((prev) => [...prev.slice(-49), stats]);
      episodeRewardRef.current = 0;
      env.reset();
    }

    setCurrentState({ ...env.getState() });
  }, [decideAction, isGreedyEval, architecture]);

  // Simulation timer loop
  useEffect(() => {
    if (!isRunning || isBatchTraining || manualTakeover) return;

    const delayMap: Record<number, number> = {
      1: 600,
      2: 300,
      5: 120,
      20: 35,
    };
    const intervalMs = delayMap[speed] || 300;

    const timer = setInterval(() => {
      stepSimulation();
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isRunning, isBatchTraining, manualTakeover, speed, stepSimulation]);

  // Reset Environment
  const handleResetEnv = useCallback(() => {
    envRef.current.reset();
    setCurrentState(envRef.current.getState());
    setCurrentDecision(null);
    episodeRewardRef.current = 0;
  }, []);

  // Preset Scenarios Loader
  const handleLoadScenario = useCallback((scenario: 'forest' | 'night' | 'mine' | 'lava') => {
    const env = envRef.current;
    env.reset();

    if (scenario === 'forest') {
      // Dense forest
      for (let y = 3; y < WORLD_HEIGHT - 3; y++) {
        for (let x = 3; x < WORLD_WIDTH - 3; x++) {
          if (Math.random() < 0.35) {
            env.grid[y][x] = 'wood';
          }
        }
      }
      env.playerInventory.wood = 0;
      env.timeOfDay = 2000;
    } else if (scenario === 'night') {
      // Dusk / Night with hostile mobs
      env.timeOfDay = 15000;
      env.entities = [
        { id: 'z1', type: 'zombie', x: 7, y: 7, hp: 20, maxHp: 20, isHostile: true },
        { id: 'z2', type: 'zombie', x: 14, y: 14, hp: 20, maxHp: 20, isHostile: true },
        { id: 'c1', type: 'creeper', x: 6, y: 13, hp: 12, maxHp: 12, isHostile: true },
        { id: 's1', type: 'skeleton', x: 13, y: 6, hp: 16, maxHp: 16, isHostile: true },
      ];
      env.playerInventory.hasSword = true;
      env.playerInventory.torches = 4;
    } else if (scenario === 'mine') {
      // Cave with veins
      for (let y = 1; y < WORLD_HEIGHT - 1; y++) {
        for (let x = 1; x < WORLD_WIDTH - 1; x++) {
          if (x > 5 && y > 5) {
            const r = Math.random();
            if (r < 0.2) env.grid[y][x] = 'iron_ore';
            else if (r < 0.4) env.grid[y][x] = 'coal_ore';
            else env.grid[y][x] = 'stone';
          }
        }
      }
      env.playerInventory.hasPickaxe = true;
    } else if (scenario === 'lava') {
      // Lava lake obstacle course
      for (let y = 7; y < 13; y++) {
        for (let x = 5; x < 15; x++) {
          if (x !== 10) env.grid[y][x] = 'lava';
        }
      }
    }

    setCurrentState({ ...env.getState() });
    setCurrentDecision(null);
  }, []);

  // High-Speed Headless Batch Training Runner
  const handleRunBatchTraining = useCallback(
    async (targetEpisodes: number) => {
      setIsBatchTraining(true);
      setBatchProgress(0);

      const headlessEnv = new MinecraftEnvironment(rewardWeights);
      let completed = 0;
      const dqn = dqnRef.current;
      const newStats: EpisodeStats[] = [];

      const runBatchChunk = () => {
        const chunkSize = 5;
        const currentTarget = Math.min(completed + chunkSize, targetEpisodes);

        for (let ep = completed; ep < currentTarget; ep++) {
          headlessEnv.reset();
          let epReward = 0;
          let epLoss = 0;
          let trainSteps = 0;

          while (!headlessEnv.isDead && headlessEnv.stepCount < 250) {
            const state = headlessEnv.getState();
            const sVector = extractStateVector(state);
            const decision = dqn.selectAction(sVector, false);

            const { nextState, reward, done } = headlessEnv.step(decision.action);
            epReward += reward;

            const nextVector = extractStateVector(nextState);
            dqn.storeTransition({
              state: sVector,
              action: decision.actionIndex,
              reward,
              nextState: nextVector,
              done,
            });

            if (headlessEnv.stepCount % 2 === 0) {
              const res = dqn.trainStep();
              epLoss += res.loss;
              trainSteps++;
              dqn.decayEpsilon();
            }

            if (done) break;
          }

          newStats.push({
            episode: episodeCountRef.current++,
            totalReward: epReward,
            stepsSurvived: headlessEnv.stepCount,
            woodGathered: headlessEnv.playerInventory.wood,
            mobsDefeated: headlessEnv.score,
            loss: trainSteps > 0 ? epLoss / trainSteps : 0,
            epsilon: dqn.hyperparams.epsilon,
            died: headlessEnv.isDead,
          });
        }

        completed = currentTarget;
        setBatchProgress(Math.floor((completed / targetEpisodes) * 100));

        if (completed < targetEpisodes) {
          setTimeout(runBatchChunk, 0);
        } else {
          setEpisodeStats((prev) => [...prev, ...newStats].slice(-50));
          setIsBatchTraining(false);
          setBatchProgress(100);
          // Sync live state
          setCurrentState({ ...envRef.current.getState() });
        }
      };

      runBatchChunk();
    },
    [rewardWeights]
  );

  // Manual Player Action
  const handleManualAction = useCallback(
    (action: MinecraftAction) => {
      const env = envRef.current;
      const sVector = extractStateVector(env.getState());

      // Record demonstration for imitation learning
      setDemonstrations((prev) => [
        ...prev,
        {
          stateVector: sVector,
          action,
          timestamp: Date.now(),
        },
      ]);
      imitationRef.current.addSample({
        stateVector: sVector,
        action,
        timestamp: Date.now(),
      });

      // Step environment with player's action
      const { reward } = env.step(action);
      episodeRewardRef.current += reward;
      setCurrentState({ ...env.getState() });
      setCurrentDecision({
        action,
        actionIndex: 0,
        qValues: new Array(9).fill(0),
        confidence: 1.0,
        ruleExplanation: 'Manual player command',
      });
    },
    []
  );

  // Human Feedback RLHF
  const handleHumanFeedbackReward = useCallback((rewardDelta: number) => {
    episodeRewardRef.current += rewardDelta;
    envRef.current.addCombatEvent(
      rewardDelta > 0 ? `+${rewardDelta} Good Bot! 👍` : `${rewardDelta} Bad Move! 👎`,
      rewardDelta > 0 ? '#10b981' : '#ef4444',
      envRef.current.playerX,
      envRef.current.playerY
    );
    // Reinforce most recent transition in DQN buffer
    if (dqnRef.current.replayBuffer.length > 0) {
      const last = dqnRef.current.replayBuffer[dqnRef.current.replayBuffer.length - 1];
      last.reward += rewardDelta;
      dqnRef.current.trainStep();
    }
  }, []);

  // Imitation Learning Trainer
  const handleTrainImitation = useCallback(() => {
    const res = imitationRef.current.trainEpoch(0.02);
    alert(
      `Imitation Policy Trained! Accuracy: ${(res.accuracy * 100).toFixed(
        1
      )}% | Loss: ${res.loss.toFixed(4)}`
    );
    setArchitecture('imitation');
  }, []);

  // Update Reward Weights
  const handleUpdateRewardWeights = useCallback((newWeights: Partial<RewardWeights>) => {
    setRewardWeights((prev) => {
      const merged = { ...prev, ...newWeights };
      envRef.current.rewardWeights = merged;
      return merged;
    });
  }, []);

  // Update Hyperparameters
  const handleUpdateHyperparams = useCallback((newHyper: Partial<TrainingHyperparameters>) => {
    setHyperparams((prev) => {
      const merged = { ...prev, ...newHyper };
      dqnRef.current.hyperparams = merged;
      return merged;
    });
  }, []);

  // Behavior Tree toggles
  const handleToggleRule = useCallback((ruleId: string) => {
    const tree = treeRef.current;
    const rule = tree.rules.find((r) => r.id === ruleId);
    if (rule) {
      rule.enabled = !rule.enabled;
      setCurrentState((s) => ({ ...s }));
    }
  }, []);

  const handleUpdateRulePriority = useCallback((ruleId: string, priority: number) => {
    const tree = treeRef.current;
    const rule = tree.rules.find((r) => r.id === ruleId);
    if (rule) {
      rule.priority = priority;
      tree.sortRules();
      setCurrentState((s) => ({ ...s }));
    }
  }, []);

  const stateVector = extractStateVector(currentState);

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col font-sans">
      {/* Top Header */}
      <Header
        architecture={architecture}
        setArchitecture={setArchitecture}
        episodeCount={episodeStats.length}
        totalSteps={totalStepsRef.current}
        onResetEnv={handleResetEnv}
        onLoadScenario={handleLoadScenario}
        onOpenExport={() => setIsExportOpen(true)}
        onOpenHelp={() => setIsHelpOpen(true)}
      />

      {/* Main Grid Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 flex flex-col lg:flex-row gap-5">
        {/* Left Column: Minecraft Voxel Sandbox Canvas & Training Controls */}
        <div className="flex-1 flex flex-col gap-4">
          <MinecraftCanvas
            env={envRef.current}
            currentState={currentState}
            currentDecision={currentDecision}
            manualTakeover={manualTakeover}
            onToggleManualTakeover={() => setManualTakeover(!manualTakeover)}
            onManualAction={handleManualAction}
            onHumanFeedbackReward={handleHumanFeedbackReward}
          />

          <TrainingStudio
            isRunning={isRunning}
            onTogglePlay={() => setIsRunning(!isRunning)}
            onStepOnce={stepSimulation}
            speed={speed}
            onSetSpeed={setSpeed}
            onRunBatchTraining={handleRunBatchTraining}
            isBatchTraining={isBatchTraining}
            batchProgress={batchProgress}
            isGreedyEval={isGreedyEval}
            onToggleGreedyEval={() => setIsGreedyEval(!isGreedyEval)}
            rewardWeights={rewardWeights}
            onUpdateRewardWeights={handleUpdateRewardWeights}
            hyperparams={hyperparams}
            onUpdateHyperparams={handleUpdateHyperparams}
            architecture={architecture}
            demonstrationCount={demonstrations.length}
            onTrainImitation={handleTrainImitation}
            onClearDemonstrations={() => {
              setDemonstrations([]);
              imitationRef.current.clearSamples();
            }}
          />
        </div>

        {/* Right Column: Model Decision Inspector & Neural Activations */}
        <div className="w-full lg:w-[480px] flex flex-col gap-4">
          <ModelInspector
            architecture={architecture}
            dqnModel={dqnRef.current}
            decisionTreeModel={treeRef.current}
            currentDecision={currentDecision}
            stateVector={stateVector}
            episodeStats={episodeStats}
            onToggleRule={handleToggleRule}
            onUpdateRulePriority={handleUpdateRulePriority}
          />
        </div>
      </main>

      {/* Export Modal */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        architecture={architecture}
        dqnModel={dqnRef.current}
        decisionTreeModel={treeRef.current}
      />

      {/* Help Modal */}
      <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
    </div>
  );
}
