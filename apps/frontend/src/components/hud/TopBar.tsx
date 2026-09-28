'use client';

import React from 'react';
import { SectorState } from '@escape-the-matrix/shared-types';
import { Activity, Heart, Clock, AlertTriangle, Cpu, Award } from 'lucide-react';

interface TopBarProps {
  state: SectorState | null;
  dataPoints: number;
  onOpenLab: () => void;
  onSelectSector: (sectorId: number) => void;
}

export const TopBar: React.FC<TopBarProps> = ({ state, dataPoints, onOpenLab, onSelectSector }) => {
  if (!state) return null;

  const isLowTime = state.timeRemaining <= 15;
  const isHighAlert = state.matrixAlert >= 75;

  return (
    <header className="z-10 w-full flex-shrink-0 border-b border-matrix-border bg-matrix-surface/90 px-3 py-2 shadow-lg backdrop-blur-md sm:px-4">
      <div className="flex w-full flex-wrap items-center justify-between gap-3">
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
          </div>
          <div className="flex items-center gap-0.5 rounded-md border border-matrix-border bg-matrix-void p-0.5" aria-label="Select sector">
            {Array.from({ length: 5 }, (_, index) => index + 1).map((sectorId) => (
              <button
                key={sectorId}
                type="button"
                aria-label={`Load sector ${sectorId}`}
                aria-pressed={sectorId === state.sectorId}
                onClick={() => onSelectSector(sectorId)}
                className={`h-7 min-w-8 rounded px-1.5 font-mono text-[10px] font-bold transition-colors ${
                  sectorId === state.sectorId
                    ? 'bg-matrix-cyan text-black'
                    : 'text-slate-400 hover:bg-matrix-panel hover:text-white'
                }`}
              >
                0{sectorId}
              </button>
            ))}
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
                {Math.max(0, Math.ceil(state.timeRemaining))}s
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
                  {Math.round(state.matrixAlert)}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Jev Vital Bars & Data Points */}
        <div className="flex flex-wrap items-center gap-3">
          {[
            { label: 'HEALTH', value: state.jev.hp, max: state.jev.maxHp, Icon: Heart, color: 'bg-matrix-magenta text-matrix-magenta' },
            { label: 'STAMINA', value: state.jev.stamina, max: state.jev.maxStamina, Icon: Activity, color: 'bg-matrix-green text-matrix-green' },
          ].map(({ label, value, max, Icon, color }) => (
            <div key={label} className="flex items-center gap-1.5" aria-label={`${label} ${Math.round(value)} of ${max}`}>
              <Icon className={`h-4 w-4 ${color.split(' ')[1]}`} />
              <div className="w-20">
                <div className="mb-0.5 flex justify-between text-[9px] font-mono leading-none">
                  <span className="text-slate-400">{label}</span>
                  <span className="text-slate-200">{Math.round(value)}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-matrix-panel">
                  <div className={`h-full ${color.split(' ')[0]}`} style={{ width: `${Math.max(0, Math.min(100, (value / max) * 100))}%` }} />
                </div>
              </div>
            </div>
          ))}

          {/* Data Points */}
          <div className="flex items-center space-x-1.5 px-3 py-1 rounded bg-matrix-panel border border-matrix-border">
            <Award className="w-4 h-4 text-matrix-amber" />
            <span className="text-xs font-mono font-bold text-matrix-amber">
              {Math.round(dataPoints)} DP
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
