'use client';

import React, { useEffect } from 'react';
import { SectorState } from '@escape-the-matrix/shared-types';
import confetti from 'canvas-confetti';
import { CheckCircle2, AlertOctagon, Award, ArrowRight, RotateCcw, Cpu } from 'lucide-react';
import { sound } from '../../utils/audio';

interface SectorDebriefModalProps {
  state: SectorState | null;
  onNextSector: () => void;
  onRetry: () => void;
  onOpenLab: () => void;
}

export const SectorDebriefModal: React.FC<SectorDebriefModalProps> = ({
  state,
  onNextSector,
  onRetry,
  onOpenLab,
}) => {
  if (!state || state.status === 'NOT_STARTED' || state.status === 'RUNNING') {
    return null;
  }

  const isSuccess = state.status === 'SUCCESS';
  const isFinalSector = state.sectorId === 5;

  useEffect(() => {
    if (isSuccess) {
      sound.playVictory();
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#00F0FF', '#00FF66', '#FF007F', '#FFB000'],
      });
    } else {
      sound.playAlert();
    }
  }, [isSuccess]);

  // Points calculation breakdown
  const basePoints = state.sectorId * 100;
  const hpBonus = state.jev.hp * 25;
  const timeBonus = state.timeRemaining * 5;
  const terminalsHacked = state.terminals.filter((t) => t.isHacked).length;
  const terminalBonus = terminalsHacked * 50;
  const totalEarned = isSuccess ? basePoints + hpBonus + timeBonus + terminalBonus : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn font-mono">
      <div className="relative w-full max-w-lg bg-matrix-surface border border-matrix-border rounded-2xl p-6 shadow-2xl overflow-hidden">
        {/* Banner Glow */}
        <div
          className={`absolute top-0 inset-x-0 h-1.5 ${
            isSuccess ? 'bg-matrix-green shadow-neon-green' : 'bg-matrix-magenta shadow-neon-magenta'
          }`}
        />

        {/* Header Status */}
        <div className="text-center py-4">
          <div className="inline-flex p-3 rounded-2xl bg-black/40 border border-matrix-border mb-3">
            {isSuccess ? (
              <CheckCircle2 className="w-10 h-10 text-matrix-green animate-bounce" />
            ) : (
              <AlertOctagon className="w-10 h-10 text-matrix-magenta animate-pulse" />
            )}
          </div>

          <h2 className="text-xl font-bold tracking-wide text-white">
            {isSuccess
              ? isFinalSector
                ? 'MATRIX ESCAPED: THE NEO PROTOCOL COMPLETE!'
                : `SECTOR 0${state.sectorId} CLEARED!`
              : state.status === 'FAILED_HP'
              ? 'SIMULATION TERMINATED: INTEGRITY LOST'
              : 'SIMULATION TERMINATED: SECTOR LOCKDOWN'}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {isSuccess
              ? 'Jev successfully breached the local matrix glitch portal.'
              : state.status === 'FAILED_HP'
              ? 'Hostile enforcers or corrupted grid depleted Jev\'s health.'
              : 'Lockdown timer expired before reaching the extraction point.'}
          </p>
        </div>

        {/* Score Breakdown (if success) */}
        {isSuccess ? (
          <div className="p-4 rounded-xl bg-matrix-panel/60 border border-matrix-border space-y-2 mb-6 text-xs">
            <div className="flex justify-between text-slate-300">
              <span>Base Sector Rewards:</span>
              <span className="font-bold text-white">+{basePoints} DP</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>Health Integrity Bonus ({state.jev.hp} HP):</span>
              <span className="font-bold text-matrix-green">+{hpBonus} DP</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>Speed / Time Bonus ({state.timeRemaining}s left):</span>
              <span className="font-bold text-matrix-cyan">+{timeBonus} DP</span>
            </div>
            {terminalsHacked > 0 && (
              <div className="flex justify-between text-slate-300">
                <span>Data Nodes Breached ({terminalsHacked}):</span>
                <span className="font-bold text-matrix-amber">+{terminalBonus} DP</span>
              </div>
            )}
            <div className="pt-2 border-t border-matrix-border/80 flex justify-between text-sm font-bold">
              <span className="text-matrix-amber flex items-center gap-1">
                <Award className="w-4 h-4" /> TOTAL DATA POINTS EARNED:
              </span>
              <span className="text-matrix-amber">+{totalEarned} DP</span>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-matrix-panel/60 border border-matrix-magenta/30 mb-6 text-xs text-slate-300">
            <p className="leading-relaxed">
              Recommendation: Visit the <strong className="text-matrix-cyan">Operator Lab</strong> to upgrade Jev's 
              Stealth Matrix or Processing Speed to outmaneuver security patrols.
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-2 pt-2">
          {isSuccess ? (
            <>
              <button
                onClick={onOpenLab}
                className="flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-xl bg-matrix-panel border border-matrix-border text-matrix-cyan hover:border-matrix-cyan transition-all text-xs font-bold"
              >
                <Cpu className="w-4 h-4" />
                <span>UPGRADE IN LAB</span>
              </button>
              <button
                onClick={onNextSector}
                className="flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-xl bg-matrix-green text-black hover:bg-matrix-green/90 transition-all text-xs font-bold shadow-neon-green"
              >
                <span>{isFinalSector ? 'PLAY AGAIN' : 'NEXT SECTOR'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={onOpenLab}
                className="flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-xl bg-matrix-panel border border-matrix-border text-matrix-cyan hover:border-matrix-cyan transition-all text-xs font-bold"
              >
                <Cpu className="w-4 h-4" />
                <span>TUNE IN LAB</span>
              </button>
              <button
                onClick={onRetry}
                className="flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-xl bg-matrix-magenta text-white hover:bg-matrix-magenta/90 transition-all text-xs font-bold shadow-neon-magenta"
              >
                <RotateCcw className="w-4 h-4" />
                <span>RETRY SECTOR</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
