'use client';

import React from 'react';
import { Play, Pause, FastForward, RotateCcw, Zap, EyeOff, StepForward } from 'lucide-react';

interface OperatorControlsProps {
  isRunning: boolean;
  onTogglePlay: () => void;
  onStepTick: () => void;
  onReset: () => void;
  speed: number;
  onSpeedChange: (speed: number) => void;
  energy: number;
  onTriggerOverride: (type: 'OVERDRIVE_EMP' | 'EMERGENCY_REROUTE') => void;
}

export const OperatorControls: React.FC<OperatorControlsProps> = ({
  isRunning,
  onTogglePlay,
  onStepTick,
  onReset,
  speed,
  onSpeedChange,
  energy,
  onTriggerOverride,
}) => {
  return (
    <div className="w-full bg-matrix-surface border border-matrix-border rounded-xl p-3 shadow-xl flex flex-wrap items-center justify-between gap-4 font-mono text-xs">
      {/* Primary Simulation Flow Controls */}
      <div className="flex items-center space-x-2">
        {/* Unleash / Pause */}
        <button
          onClick={onTogglePlay}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-lg font-bold tracking-wider transition-all shadow-lg ${
            isRunning
              ? 'bg-matrix-amber/20 border border-matrix-amber text-matrix-amber hover:bg-matrix-amber hover:text-black'
              : 'bg-matrix-green text-black hover:bg-matrix-green/80 shadow-neon-green'
          }`}
        >
          {isRunning ? (
            <>
              <Pause className="w-4 h-4 fill-current" />
              <span>PAUSE RUN</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-current" />
              <span>UNLEASH JEV</span>
            </>
          )}
        </button>

        {/* Step Forward */}
        <button
          onClick={onStepTick}
          disabled={isRunning}
          className="flex items-center space-x-1.5 px-3 py-2.5 rounded-lg bg-matrix-panel border border-matrix-border text-slate-300 hover:text-white hover:border-matrix-cyan disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          title="Execute Single Simulation Tick"
        >
          <StepForward className="w-4 h-4" />
          <span>STEP</span>
        </button>

        {/* Reset */}
        <button
          onClick={onReset}
          className="flex items-center space-x-1.5 px-3 py-2.5 rounded-lg bg-matrix-panel border border-matrix-border text-slate-300 hover:text-matrix-magenta hover:border-matrix-magenta transition-all"
          title="Restart Current Sector"
        >
          <RotateCcw className="w-4 h-4" />
          <span>RETRY</span>
        </button>
      </div>

      {/* Speed Controls */}
      <div className="flex items-center space-x-1 bg-matrix-void p-1 rounded-lg border border-matrix-border">
        <span className="text-[10px] text-slate-500 px-2 flex items-center gap-1">
          <FastForward className="w-3 h-3" /> SPEED:
        </span>
        {[1, 2, 4].map((s) => (
          <button
            key={s}
            onClick={() => onSpeedChange(s)}
            className={`px-2.5 py-1 rounded text-xs font-bold transition-all ${
              speed === s
                ? 'bg-matrix-cyan text-black'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {s}x
          </button>
        ))}
      </div>

      {/* Emergency Overrides */}
      <div className="flex items-center space-x-2">
        <span className="text-[10px] text-slate-400 hidden sm:inline">EMERGENCY OVERRIDES:</span>
        
        {/* Overdrive EMP */}
        <button
          onClick={() => onTriggerOverride('OVERDRIVE_EMP')}
          disabled={energy < 40}
          className="flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-matrix-cyan/10 border border-matrix-cyan text-matrix-cyan hover:bg-matrix-cyan hover:text-black disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-neon-cyan"
          title="Stuns all nearby hostiles (Requires 40 Energy)"
        >
          <Zap className="w-3.5 h-3.5" />
          <span>OVERDRIVE EMP [40E]</span>
        </button>

        {/* Emergency Reroute / Cloak */}
        <button
          onClick={() => onTriggerOverride('EMERGENCY_REROUTE')}
          disabled={energy < 20}
          className="flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-matrix-purple/20 border border-matrix-purple text-matrix-purple hover:bg-matrix-purple hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          title="Drops Matrix Alert by 25% (Requires 20 Energy)"
        >
          <EyeOff className="w-3.5 h-3.5" />
          <span>CLOAK [20E]</span>
        </button>
      </div>
    </div>
  );
};
