import React, { useState } from 'react';
import {
  X,
  Copy,
  Check,
  Download,
  Terminal,
  FileCode,
  FileJson,
  ExternalLink,
  BookOpen,
} from 'lucide-react';
import { DQNModel } from '../ai/dqn';
import { DecisionTreeModel } from '../ai/decisionTree';
import { ModelArchitecture } from '../ai/types';
import {
  generateMineflayerBotJs,
  generatePythonScript,
} from '../ai/exportMineflayer';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  architecture: ModelArchitecture;
  dqnModel: DQNModel;
  decisionTreeModel: DecisionTreeModel;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  architecture,
  dqnModel,
  decisionTreeModel,
}) => {
  const [activeTab, setActiveTab] = useState<'mineflayer' | 'model_json' | 'python' | 'guide'>(
    'mineflayer'
  );
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const effectiveType = architecture === 'decision_tree' ? 'decision_tree' : 'dqn';
  const botJsCode = generateMineflayerBotJs(
    effectiveType === 'decision_tree' ? decisionTreeModel : dqnModel,
    effectiveType
  );
  const modelJson = JSON.stringify(
    effectiveType === 'decision_tree' ? decisionTreeModel.toJSON() : dqnModel.toJSON(),
    null,
    2
  );
  const pythonCode = generatePythonScript(dqnModel);

  const getActiveContent = () => {
    switch (activeTab) {
      case 'mineflayer':
        return botJsCode;
      case 'model_json':
        return modelJson;
      case 'python':
        return pythonCode;
      default:
        return '';
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getActiveContent());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    let filename = 'bot.js';
    let mime = 'text/javascript';
    let content = botJsCode;

    if (activeTab === 'model_json') {
      filename = 'minecraft-decision-model.json';
      mime = 'application/json';
      content = modelJson;
    } else if (activeTab === 'python') {
      filename = 'agent.py';
      mime = 'text/x-python';
      content = pythonCode;
    }

    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-800 bg-stone-950">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600/30 border border-emerald-500/50 flex items-center justify-center text-emerald-400">
              <Download className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold font-mono text-white">
                Export Decision Model to Minecraft
              </h2>
              <p className="text-xs text-stone-400">
                Run your trained model as an autonomous bot inside any real Minecraft server!
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-colors"
            aria-label="Close export dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex items-center justify-between px-6 py-2.5 bg-stone-950/70 border-b border-stone-800 text-xs font-mono">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab('mineflayer')}
              className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors ${
                activeTab === 'mineflayer'
                  ? 'bg-emerald-600 text-white font-bold'
                  : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              Mineflayer Bot (`bot.js`)
            </button>
            <button
              onClick={() => setActiveTab('model_json')}
              className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors ${
                activeTab === 'model_json'
                  ? 'bg-emerald-600 text-white font-bold'
                  : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800'
              }`}
            >
              <FileJson className="w-3.5 h-3.5" />
              Model Weights (`model.json`)
            </button>
            <button
              onClick={() => setActiveTab('python')}
              className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors ${
                activeTab === 'python'
                  ? 'bg-emerald-600 text-white font-bold'
                  : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              Python PyTorch (`agent.py`)
            </button>
            <button
              onClick={() => setActiveTab('guide')}
              className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors ${
                activeTab === 'guide'
                  ? 'bg-emerald-600 text-white font-bold'
                  : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              3-Minute Setup Guide
            </button>
          </div>

          {activeTab !== 'guide' && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                className="px-2.5 py-1 rounded bg-stone-800 hover:bg-stone-700 text-stone-200 flex items-center gap-1 transition-colors"
                title="Copy code to clipboard"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
              <button
                onClick={handleDownload}
                className="px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1 transition-colors"
                title="Download file"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download</span>
              </button>
            </div>
          )}
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 font-mono text-xs">
          {activeTab === 'guide' ? (
            <div className="flex flex-col gap-4 text-stone-300">
              <div className="bg-emerald-950/40 border border-emerald-800/80 p-4 rounded-xl">
                <h3 className="text-sm font-bold text-emerald-300 mb-1">
                  How to Run Your Trained Decision Model in Real Minecraft
                </h3>
                <p className="text-stone-300">
                  This bot connects directly via the official Minecraft client network protocol.
                  It works with vanilla Minecraft servers, Spigot, Paper, Fabric, or even a Singleplayer "Open to LAN" world!
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <div className="bg-stone-950 p-4 rounded-xl border border-stone-800">
                  <h4 className="font-bold text-white mb-2 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs">
                      1
                    </span>
                    Install Mineflayer Dependencies
                  </h4>
                  <p className="text-stone-400 mb-2">
                    Open your terminal and run:
                  </p>
                  <pre className="bg-stone-900 p-2.5 rounded border border-stone-800 text-emerald-400 select-all">
                    npm install mineflayer mineflayer-pathfinder mineflayer-pvp mineflayer-auto-eat minecraft-data
                  </pre>
                </div>

                <div className="bg-stone-950 p-4 rounded-xl border border-stone-800">
                  <h4 className="font-bold text-white mb-2 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs">
                      2
                    </span>
                    Save the Generated `bot.js`
                  </h4>
                  <p className="text-stone-400">
                    Click the <strong>"Download"</strong> button in the `bot.js` tab to save the script containing your trained neural weights or behavior tree into your project folder.
                  </p>
                </div>

                <div className="bg-stone-950 p-4 rounded-xl border border-stone-800">
                  <h4 className="font-bold text-white mb-2 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs">
                      3
                    </span>
                    Launch Bot into Your Server
                  </h4>
                  <pre className="bg-stone-900 p-2.5 rounded border border-stone-800 text-emerald-400 select-all">
                    node bot.js localhost 25565 CraftBrainBot
                  </pre>
                  <p className="text-stone-400 mt-2">
                    The bot will spawn, scan its surrounding voxels, compute the policy decisions in real time using your trained model weights, and begin playing autonomously!
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="relative">
              <pre className="p-4 bg-stone-950 rounded-xl border border-stone-800 text-stone-300 overflow-x-auto whitespace-pre font-mono text-[11px] leading-relaxed">
                {getActiveContent()}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
