'use client';

import React from 'react';
import { 
  JevStats, 
  BehaviorDirective, 
  getStatUpgradeCost, 
  STAT_MAX_LEVEL 
} from '@escape-the-matrix/shared-types';
import { Cpu, Eye, Activity, Key, Shield, Zap, X, Award, CheckCircle2 } from 'lucide-react';

interface OperatorLabModalProps {
  isOpen: boolean;
  onClose: () => void;
  stats: JevStats | null;
  dataPoints: number;
  onUpgradeStat: (statKey: keyof Omit<JevStats, 'behaviorDirective'>) => void;
  onChangeDirective: (directive: BehaviorDirective) => void;
}

export const OperatorLabModal: React.FC<OperatorLabModalProps> = ({
  isOpen,
  onClose,
  stats,
  dataPoints,
  onUpgradeStat,
  onChangeDirective,
}) => {
  if (!isOpen || !stats) return null;

  const statDefs: Array<{
    key: keyof Omit<JevStats, 'behaviorDirective'>;
    label: string;
    desc: string;
    icon: any;
    color: string;
  }> = [
    {
      key: 'stealthMatrix',
      label: 'STEALTH MATRIX',
      desc: 'Decreases noise footprint & slows enemy vision spot speed',
      icon: Eye,
      color: 'text-matrix-cyan border-matrix-cyan',
    },
    {
      key: 'processingHz',
      label: 'PROCESSING SPEED',
      desc: 'Gives Jev extra action ticks and faster movement traversal',
      icon: Activity,
      color: 'text-matrix-green border-matrix-green',
    },
    {
      key: 'hackBypass',
      label: 'HACK BYPASS PROTOCOL',
      desc: 'Accelerates time required to bypass security gates and terminals',
      icon: Key,
      color: 'text-matrix-purple border-matrix-purple',
    },
    {
      key: 'armorShield',
      label: 'INTEGRITY ARMOR',
      desc: 'Increases Max Health & grants resistance to corrupted grid tiles',
      icon: Shield,
      color: 'text-matrix-amber border-matrix-amber',
    },
    {
      key: 'energyReactor',
      label: 'ENERGY REACTOR',
      desc: 'Accelerates passive energy recovery for emergency EMP abilities',
      icon: Zap,
      color: 'text-matrix-magenta border-matrix-magenta',
    },
  ];

  const directives: Array<{
    id: BehaviorDirective;
    title: string;
    desc: string;
  }> = [
    {
      id: 'CAUTIOUS',
      title: 'CAUTIOUS CRAWL',
      desc: 'Jev sticks to alley covers, avoiding vision cones even if paths are longer.',
    },
    {
      id: 'SPRINT',
      title: 'AGGRESSIVE SPRINT',
      desc: 'Jev takes the shortest path to extraction, using EMPs when spotted.',
    },
    {
      id: 'SCAVENGER',
      title: 'DATA SCAVENGER',
      desc: 'Jev strays off path to hack extra Data Terminals for maximum upgrade points.',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-matrix-surface border border-matrix-cyan/50 rounded-2xl p-6 shadow-2xl overflow-hidden font-mono">
        {/* Glow corner accent */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-matrix-cyan/10 rounded-full blur-2xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-matrix-border mb-6">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-matrix-cyan/20 border border-matrix-cyan text-matrix-cyan">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-wide">
                OPERATOR CONFIGURATION LAB
              </h2>
              <p className="text-xs text-slate-400">
                Tune Jev's autonomous neural parameters before deployment
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-matrix-panel border border-matrix-border">
              <Award className="w-4 h-4 text-matrix-amber" />
              <span className="text-sm font-bold text-matrix-amber">{dataPoints} DP</span>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-matrix-panel text-slate-400 hover:text-white transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Section 1: Sub-System Stats Upgrade */}
        <div className="space-y-3 mb-6">
          <h3 className="text-xs text-matrix-cyan font-bold tracking-wider">
            // NEURAL SUB-SYSTEMS
          </h3>

          <div className="grid grid-cols-1 gap-2.5 max-h-[260px] overflow-y-auto pr-1">
            {statDefs.map((stat) => {
              const currentLvl = stats[stat.key];
              const cost = getStatUpgradeCost(currentLvl);
              const canAfford = dataPoints >= cost && currentLvl < STAT_MAX_LEVEL;
              const Icon = stat.icon;

              return (
                <div
                  key={stat.key}
                  className="flex items-center justify-between p-3 rounded-xl bg-matrix-panel/60 border border-matrix-border hover:border-matrix-border/80 transition-all"
                >
                  <div className="flex items-start space-x-3">
                    <div className={`p-2 rounded-lg border ${stat.color} bg-black/40 mt-0.5`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold text-slate-200">{stat.label}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-black text-matrix-cyan font-bold">
                          LVL {currentLvl}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                        {stat.desc}
                      </p>
                    </div>
                  </div>

                  <div>
                    {currentLvl >= STAT_MAX_LEVEL ? (
                      <span className="text-xs text-slate-500 font-bold px-3 py-1.5">MAX</span>
                    ) : (
                      <button
                        onClick={() => onUpgradeStat(stat.key)}
                        disabled={!canAfford}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          canAfford
                            ? 'bg-matrix-cyan text-black hover:bg-matrix-cyan/80 shadow-neon-cyan'
                            : 'bg-matrix-panel border border-matrix-border text-slate-500 cursor-not-allowed'
                        }`}
                      >
                        +{cost} DP
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Section 2: Behavior Directives */}
        <div className="mb-6">
          <h3 className="text-xs text-matrix-cyan font-bold tracking-wider mb-2">
            // AUTONOMOUS STRATEGY DIRECTIVE
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {directives.map((dir) => {
              const isSelected = stats.behaviorDirective === dir.id;
              return (
                <button
                  key={dir.id}
                  onClick={() => onChangeDirective(dir.id)}
                  className={`p-3 rounded-xl border text-left transition-all relative ${
                    isSelected
                      ? 'bg-matrix-cyan/15 border-matrix-cyan text-white shadow-neon-cyan'
                      : 'bg-matrix-panel/40 border-matrix-border text-slate-400 hover:border-slate-500'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold">{dir.title}</span>
                    {isSelected && <CheckCircle2 className="w-4 h-4 text-matrix-cyan" />}
                  </div>
                  <p className="text-[10px] text-slate-400 leading-normal">
                    {dir.desc}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Deploy Button */}
        <div className="pt-4 border-t border-matrix-border flex justify-end">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-matrix-green text-black font-bold text-xs tracking-wider hover:bg-matrix-green/90 transition-all shadow-neon-green"
          >
            CONFIRM &amp; RETURN TO MATRIX
          </button>
        </div>
      </div>
    </div>
  );
};
