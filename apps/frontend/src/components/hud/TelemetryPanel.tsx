'use client';

import React from 'react';
import { JevEvaluationResponse } from '@escape-the-matrix/shared-types';
import { 
  Terminal, 
  Activity, 
  Compass, 
  Crosshair, 
  Cpu, 
  DollarSign, 
  Clock, 
  Database 
} from 'lucide-react';

interface TelemetryPanelProps {
  evaluation: JevEvaluationResponse | null;
  thoughtLogs: Array<{ text: string; time: string; action: string }>;
  directive: string;
}

export const TelemetryPanel: React.FC<TelemetryPanelProps> = ({
  evaluation,
  thoughtLogs,
  directive,
}) => {
  const risk = evaluation?.detectionRisk ?? 0.05;
  const riskPercent = Math.round(risk * 100);
  const metrics = evaluation?.metrics;

  const getRiskColor = () => {
    if (riskPercent >= 75) return 'text-matrix-magenta border-matrix-magenta bg-matrix-magenta/10';
    if (riskPercent >= 40) return 'text-matrix-amber border-matrix-amber bg-matrix-amber/10';
    return 'text-matrix-green border-matrix-green bg-matrix-green/10';
  };

  const getActionBadgeColor = (action: string) => {
    switch (action) {
      case 'USE_EMP':
        return 'bg-matrix-cyan text-black font-bold animate-pulse';
      case 'JUMP_GAP':
        return 'bg-matrix-magenta text-white font-bold animate-bounce';
      case 'CLIMB_LADDER':
      case 'DESCEND_RAMP':
      case 'ASCEND_RAMP':
        return 'bg-matrix-cyan/30 text-matrix-cyan border border-matrix-cyan font-bold';
      case 'MOVE_SPRINT':
        return 'bg-matrix-amber text-black font-bold';
      case 'HACK_GATE':
      case 'HACK_TERMINAL':
        return 'bg-matrix-purple text-white';
      default:
        return 'bg-matrix-panel border border-matrix-border text-matrix-cyan';
    }
  };

  return (
    <div className="w-full h-full flex flex-col rounded-xl bg-matrix-surface border border-matrix-border shadow-2xl overflow-hidden font-mono text-xs">
      {/* 1. Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-matrix-panel border-b border-matrix-border">
        <div className="flex items-center space-x-2 text-matrix-cyan">
          <Terminal className="w-4 h-4" />
          <span className="font-bold tracking-wider">JEV_NEURAL_TELEMETRY</span>
        </div>
        <div className="flex items-center space-x-1.5 text-[11px] text-slate-400">
          <Compass className="w-3.5 h-3.5 text-matrix-cyan" />
          <span>DIRECTIVE:</span>
          <span className="text-matrix-cyan font-bold">{directive}</span>
        </div>
      </div>

      {/* 2. Target Reticle Focus Bar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-black/40 border-b border-matrix-border/60 text-[11px]">
        <div className="flex items-center space-x-1.5 text-slate-400">
          <Crosshair className="w-3.5 h-3.5 text-matrix-cyan animate-spin-slow" />
          <span>FOCUS TARGET:</span>
        </div>
        <span className="px-2 py-0.5 rounded bg-matrix-cyan/15 text-matrix-cyan border border-matrix-cyan/40 font-bold tracking-wider">
          {evaluation?.targetFocus || 'SCANNING_ENVIRONMENT'}
        </span>
      </div>

      {/* 3. Primary Threat & Action Metrics */}
      <div className="grid grid-cols-2 gap-2 p-3 border-b border-matrix-border/50 bg-matrix-void/40">
        {/* Detection Probability */}
        <div className="p-2 rounded bg-matrix-panel/50 border border-matrix-border">
          <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
            <span>DETECTION RISK</span>
            <Activity className="w-3 h-3 text-slate-400" />
          </div>
          <div className="flex items-center space-x-2">
            <div className={`px-2 py-0.5 rounded border text-sm font-bold ${getRiskColor()}`}>
              {riskPercent}%
            </div>
            <div className="w-full bg-matrix-panel rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  riskPercent >= 75
                    ? 'bg-matrix-magenta'
                    : riskPercent >= 40
                    ? 'bg-matrix-amber'
                    : 'bg-matrix-green'
                }`}
                style={{ width: `${riskPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Recommended Action */}
        <div className="p-2 rounded bg-matrix-panel/50 border border-matrix-border">
          <div className="text-[10px] text-slate-400 mb-1">CURRENT ACTION</div>
          <div
            className={`inline-block px-2.5 py-1 rounded text-xs font-mono tracking-wider ${getActionBadgeColor(
              evaluation?.recommendedAction || 'MOVE_STEALTH'
            )}`}
          >
            {evaluation?.recommendedAction || 'STANDBY'}
          </div>
        </div>
      </div>

      {/* 4. Model Usage, Tokens & API Cost Panel */}
      <div className="p-3 border-b border-matrix-border/50 bg-matrix-panel/30">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-matrix-cyan" />
            AI EVALUATION METRICS
          </span>
          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-matrix-green/20 text-matrix-green border border-matrix-green/40">
            {metrics?.providerStatus || 'ONLINE'}
          </span>
        </div>

        <div className="grid grid-cols-4 gap-2 text-[10px]">
          {/* Tokens In */}
          <div className="p-1.5 rounded bg-black/40 border border-matrix-border/40">
            <div className="text-slate-500 text-[9px] flex items-center gap-1">
              <Database className="w-2.5 h-2.5 text-matrix-cyan" />
              TOKENS
            </div>
            <div className="font-bold text-slate-200 mt-0.5">
              {metrics?.tokensIn ?? 142} / {metrics?.tokensOut ?? 36}
            </div>
          </div>

          {/* Total Tokens */}
          <div className="p-1.5 rounded bg-black/40 border border-matrix-border/40">
            <div className="text-slate-500 text-[9px]">TOTAL</div>
            <div className="font-bold text-matrix-cyan mt-0.5">
              {metrics?.totalTokens ?? 178}
            </div>
          </div>

          {/* Latency */}
          <div className="p-1.5 rounded bg-black/40 border border-matrix-border/40">
            <div className="text-slate-500 text-[9px] flex items-center gap-1">
              <Clock className="w-2.5 h-2.5 text-matrix-amber" />
              LATENCY
            </div>
            <div className="font-bold text-matrix-amber mt-0.5">
              {metrics?.latencyMs ?? 26}ms
            </div>
          </div>

          {/* Estimated Cost */}
          <div className="p-1.5 rounded bg-black/40 border border-matrix-border/40">
            <div className="text-slate-500 text-[9px] flex items-center gap-1">
              <DollarSign className="w-2.5 h-2.5 text-matrix-green" />
              COST
            </div>
            <div className="font-bold text-matrix-green mt-0.5">
              ${metrics?.estimatedCostUsd ? metrics.estimatedCostUsd.toFixed(5) : '0.00004'}
            </div>
          </div>
        </div>
      </div>

      {/* 5. Real-time Thought Stream Terminal */}
      <div className="flex-1 p-3 overflow-y-auto space-y-2 scanlines bg-black/50">
        <div className="text-[10px] text-matrix-cyan/80 tracking-widest uppercase border-b border-matrix-cyan/20 pb-1 flex items-center justify-between">
          <span>// REAL-TIME INTERNAL REASONING LOG</span>
          <span className="animate-pulse text-matrix-green font-bold">STREAM ACTIVE</span>
        </div>

        {thoughtLogs.length === 0 ? (
          <div className="text-slate-500 py-6 text-center italic">
            Awaiting Operator dispatch. Click [UNLEASH JEV] to engage autonomous side-scroller traversal...
          </div>
        ) : (
          thoughtLogs.map((log, index) => (
            <div key={index} className="flex flex-col space-y-0.5 text-[11px] animate-fadeIn">
              <div className="flex items-center space-x-2 text-[10px] text-slate-500">
                <span>[{log.time}]</span>
                <span className="text-matrix-cyan font-bold">{log.action}</span>
              </div>
              <p className="text-slate-200 leading-relaxed pl-2 border-l border-matrix-cyan/40">
                &gt; {log.text}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
