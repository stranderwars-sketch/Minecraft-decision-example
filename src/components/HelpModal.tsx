import React from 'react';
import { X, Brain, TreePine, Swords, Shield, Zap, BookOpen } from 'lucide-react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden font-mono text-xs">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-800 bg-stone-950">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-emerald-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              CraftBrain Decision Model Architecture Guide
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-stone-400 hover:text-white"
            aria-label="Close guide"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex flex-col gap-5 text-stone-300 leading-relaxed">
          <div className="bg-stone-950 p-4 rounded-xl border border-stone-800">
            <h3 className="text-emerald-400 font-bold mb-1 flex items-center gap-2">
              <Brain className="w-4 h-4" /> 1. Deep Q-Network (Neural Reinforcement Learning)
            </h3>
            <p className="text-stone-400 text-[11px]">
              DQN trains a Multilayer Perceptron neural network to estimate the expected cumulative reward (Q-value) of each possible action given a 16-dimensional observation vector (health, hunger, day/night, inventory, threats, distances). Using Bellman's equation and an experience replay buffer, it discovers optimal survival tactics through trial and error.
            </p>
          </div>

          <div className="bg-stone-950 p-4 rounded-xl border border-stone-800">
            <h3 className="text-emerald-400 font-bold mb-1 flex items-center gap-2">
              <TreePine className="w-4 h-4" /> 2. Hierarchical Behavior Tree (Explainable AI)
            </h3>
            <p className="text-stone-400 text-[11px]">
              Behavior Trees structure decisions into a prioritized cascade of conditions (e.g. Critical Health → Eat Food, Creeper close → Retreat, Nightfall → Barricade). Every decision is 100% explainable and deterministic. You can toggle rules and tune priority numbers in real time.
            </p>
          </div>

          <div className="bg-stone-950 p-4 rounded-xl border border-stone-800">
            <h3 className="text-emerald-400 font-bold mb-1 flex items-center gap-2">
              <Swords className="w-4 h-4" /> 3. Imitation Learning / Behavioral Cloning
            </h3>
            <p className="text-stone-400 text-[11px]">
              Activate "Human Controlling (WASD)" on the canvas, play Minecraft yourself, and let the model record your actions. Then click "Train Model on Demonstrations" to supervise-train the policy to mimic human player reflexes!
            </p>
          </div>

          <div className="bg-emerald-950/30 border border-emerald-800 p-4 rounded-xl">
            <h4 className="text-white font-bold mb-1">Connecting to Real Minecraft</h4>
            <p className="text-stone-300 text-[11px]">
              Click <strong>"Export to Minecraft"</strong> in the top header at any point. CraftBrain packages your trained neural weights or behavior tree into a ready-to-run Mineflayer bot script that joins any Minecraft server and plays using your decision policy!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
