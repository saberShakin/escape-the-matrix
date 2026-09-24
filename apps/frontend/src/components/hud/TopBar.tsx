'use client';

import React from 'react';
import { SectorState } from '@escape-the-matrix/shared-types';
import { Shield, Zap, Clock, AlertTriangle, Key, Cpu, Award } from 'lucide-react';

interface TopBarProps {
  state: SectorState | null;
  dataPoints: number;
  onOpenLab: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ state, dataPoints, onOpenLab }) => {
  if (!state) return null;

  const isLowTime = state.timeRemaining <= 15;
  const isHighAlert = state.matrixAlert >= 75;

  return (
    <header className="w-full bg-matrix-surface/90 backdrop-blur-md border-b border-matrix-border px-4 py-3 shadow-lg">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
        {/* Sector Info */}
        <div className="flex items-center space-x-3">
          <div className="px-2.5 py-1 rounded bg-matrix-cyan/10 border border-matrix-cyan text-matrix-cyan text-xs font-mono font-bold tracking-wider">
            SECTOR 0{state.sectorId}
          </div>
          <div>
            <h1 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
              {state.name}
              {state.isLockdown && (
                <span className="text-xs px-2 py-0.5 rounded bg-matrix-magenta/20 border border-matrix-magenta text-matrix-magenta animate-pulse">
                  TOTAL LOCKDOWN
                </span>
              )}
            </h1>
            <p className="text-xs text-slate-400 font-mono">
              Autonomous Infiltration Protocol
            </p>
          </div>
        </div>

        {/* Center Gauges: Timer & Matrix Alert */}
        <div className="flex items-center space-x-6">
          {/* Time Remaining */}
          <div className="flex items-center space-x-2">
            <Clock className={`w-4 h-4 ${isLowTime ? 'text-matrix-magenta animate-bounce' : 'text-matrix-cyan'}`} />
            <div>
              <div className="text-[10px] text-slate-400 font-mono">LOCKDOWN TIMER</div>
              <div className={`text-base font-mono font-bold ${isLowTime ? 'text-matrix-magenta' : 'text-white'}`}>
                {state.timeRemaining}s
              </div>
            </div>
          </div>

          {/* Matrix Alert Gauge */}
          <div className="flex items-center space-x-2">
            <AlertTriangle className={`w-4 h-4 ${isHighAlert ? 'text-matrix-magenta animate-pulse' : 'text-matrix-amber'}`} />
            <div>
              <div className="text-[10px] text-slate-400 font-mono">MATRIX ALERT</div>
              <div className="flex items-center space-x-2">
                <div className="w-24 h-2 bg-matrix-panel rounded-full overflow-hidden border border-matrix-border">
                  <div
                    className={`h-full transition-all duration-300 ${
                      isHighAlert ? 'bg-matrix-magenta' : 'bg-matrix-amber'
                    }`}
                    style={{ width: `${state.matrixAlert}%` }}
                  />
                </div>
                <span className={`text-xs font-mono font-bold ${isHighAlert ? 'text-matrix-magenta' : 'text-matrix-amber'}`}>
                  {state.matrixAlert}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Jev Vitals & Data Points */}
        <div className="flex items-center space-x-5">
          {/* Jev HP */}
          <div className="flex items-center space-x-1.5">
            <Shield className="w-4 h-4 text-matrix-green" />
            <div className="flex space-x-1">
              {Array.from({ length: state.jev.maxHp }).map((_, i) => (
                <div
                  key={i}
                  className={`w-3.5 h-3.5 rounded-sm border ${
                    i < state.jev.hp
                      ? 'bg-matrix-green border-matrix-green shadow-neon-green'
                      : 'bg-transparent border-slate-700'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Jev Energy */}
          <div className="flex items-center space-x-2">
            <Zap className="w-4 h-4 text-matrix-cyan" />
            <div className="text-xs font-mono font-bold text-matrix-cyan">
              {state.jev.energy}/{state.jev.maxEnergy}
            </div>
          </div>

          {/* Keycards */}
          {state.jev.keycards.length > 0 && (
            <div className="flex items-center space-x-1">
              <Key className="w-4 h-4 text-matrix-amber" />
              <span className="text-xs font-mono text-matrix-amber">
                {state.jev.keycards.length}
              </span>
            </div>
          )}

          {/* Data Points */}
          <div className="flex items-center space-x-1.5 px-3 py-1 rounded bg-matrix-panel border border-matrix-border">
            <Award className="w-4 h-4 text-matrix-amber" />
            <span className="text-xs font-mono font-bold text-matrix-amber">
              {dataPoints} DP
            </span>
          </div>

          {/* Operator Lab Button */}
          <button
            onClick={onOpenLab}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-matrix-cyan/20 border border-matrix-cyan text-matrix-cyan hover:bg-matrix-cyan hover:text-black transition-all font-mono text-xs font-bold shadow-neon-cyan"
          >
            <Cpu className="w-4 h-4" />
            <span>OPERATOR LAB</span>
          </button>
        </div>
      </div>
    </header>
  );
};
