'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  SectorState, 
  JevStats, 
  JevEvaluationResponse, 
  DEFAULT_JEV_STATS,
  BehaviorDirective 
} from '@escape-the-matrix/shared-types';
import { TopBar } from '@/components/hud/TopBar';
import { SideScrollerRenderer } from '@/components/canvas/SideScrollerRenderer';
import { TelemetryPanel } from '@/components/hud/TelemetryPanel';
import { OperatorControls } from '@/components/hud/OperatorControls';
import { OperatorLabModal } from '@/components/lab/OperatorLabModal';
import { SectorDebriefModal } from '@/components/hud/SectorDebriefModal';
import { RealtimeSimulationEngine } from '@/engine/RealtimeSimulationEngine';
import { sound } from '@/utils/audio';

export default function GamePage() {
  const [sectorState, setSectorState] = useState<SectorState | null>(null);
  const [stats, setStats] = useState<JevStats>(DEFAULT_JEV_STATS);
  const [dataPoints, setDataPoints] = useState<number>(100);
  const [runId, setRunId] = useState<string>('');
  const [evaluation, setEvaluation] = useState<JevEvaluationResponse | null>(null);
  const [thoughtLogs, setThoughtLogs] = useState<Array<{ text: string; time: string; action: string }>>([]);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [speed, setSpeed] = useState<number>(1);
  const [isLabOpen, setIsLabOpen] = useState<boolean>(false);
  const [hoveredFeature, setHoveredFeature] = useState<string | null>(null);
  const [apiOnline, setApiOnline] = useState<boolean>(true);

  const engineRef = useRef<RealtimeSimulationEngine | null>(null);

  // Initialize session & first sector
  const loadSector = useCallback(async (sectorId: number) => {
    try {
      if (engineRef.current) {
        engineRef.current.pause();
      }
      setIsRunning(false);

      const res = await fetch('/api/game/sector/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sectorId }),
      });
      const data = await res.json();
      if (data.success) {
        setRunId(data.runId);
        setSectorState(data.state);
        setStats(data.stats);
        setEvaluation(null);
        setThoughtLogs([]);
        setApiOnline(true);

        // Instantiate continuous 60 FPS Real-time Simulation Engine
        engineRef.current = new RealtimeSimulationEngine(data.state, data.stats, data.runId, {
          onEvaluation: (newEval) => {
            setEvaluation(newEval);
            const now = new Date();
            const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
            setThoughtLogs((prev) => [
              {
                text: newEval.tacticalThought,
                time: timeStr,
                action: newEval.recommendedAction,
              },
              ...prev.slice(0, 35),
            ]);
          },
          onStateUpdate: (newState) => {
            setSectorState({ ...newState });
          },
          onFinished: async (status, finalState) => {
            setIsRunning(false);
            setSectorState({ ...finalState });
            if (status === 'SUCCESS') {
              sound.playVictory();
              // Award points
              const sessRes = await fetch('/api/game/session');
              const sessData = await sessRes.json();
              if (sessData.success) {
                setDataPoints((prev) => prev + 150);
              }
            }
          },
          onSoundTrigger: (s) => {
            if (s === 'step') sound.playStep();
            else if (s === 'jump' || s === 'land') sound.playStep();
            else if (s === 'hack') sound.playHack();
            else if (s === 'alert') sound.playAlert();
            else if (s === 'emp') sound.playEmp();
            else if (s === 'victory') sound.playVictory();
          },
        });

        engineRef.current.setSpeed(speed);
      }
    } catch {
      setApiOnline(false);
    }
  }, [speed]);

  // Fetch initial session info
  useEffect(() => {
    const fetchSession = async () => {
      try {
        const res = await fetch('/api/game/session');
        const data = await res.json();
        if (data.success) {
          setDataPoints(data.session.dataPoints);
          setStats(data.stats);
          loadSector(data.session.currentSectorId || 1);
        }
      } catch {
        setApiOnline(false);
      }
    };
    fetchSession();
  }, [loadSector]);

  // Handle Play / Pause (Continuous 60 FPS Simulation)
  const handleTogglePlay = () => {
    if (!engineRef.current) return;

    if (isRunning) {
      engineRef.current.pause();
      setIsRunning(false);
    } else {
      engineRef.current.start();
      setIsRunning(true);
    }
  };

  // Handle Simulation Speed Change
  const handleSpeedChange = (newSpeed: number) => {
    setSpeed(newSpeed);
    engineRef.current?.setSpeed(newSpeed);
  };

  // Handle Emergency Overrides
  const handleTriggerOverride = (type: 'OVERDRIVE_EMP' | 'EMERGENCY_REROUTE') => {
    if (!engineRef.current) return;
    const result = engineRef.current.triggerOverride(type);
    if (result.success) {
      const now = new Date();
      const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
      setThoughtLogs((prev) => [
        {
          text: `[OPERATOR MANUAL OVERRIDE]: ${result.message}`,
          time: timeStr,
          action: type,
        },
        ...prev,
      ]);
    }
  };

  // Handle Stat Upgrade in Lab
  const handleUpgradeStat = async (statKey: keyof Omit<JevStats, 'behaviorDirective'>) => {
    try {
      const res = await fetch('/api/game/session/upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statKey }),
      });
      const data = await res.json();
      if (data.success) {
        setStats(data.stats);
        setDataPoints(data.dataPoints);
        sound.playHack();
        if (sectorState) loadSector(sectorState.sectorId);
      }
    } catch {}
  };

  // Handle Directive Change in Lab
  const handleChangeDirective = async (directive: BehaviorDirective) => {
    try {
      const res = await fetch('/api/game/session/upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ directive }),
      });
      const data = await res.json();
      if (data.success) {
        setStats(data.stats);
        if (sectorState) loadSector(sectorState.sectorId);
      }
    } catch {}
  };

  return (
    <div className="min-h-screen flex flex-col bg-matrix-void text-slate-100 selection:bg-matrix-cyan selection:text-black">
      {/* Top HUD Bar */}
      <TopBar
        state={sectorState}
        dataPoints={dataPoints}
        onOpenLab={() => setIsLabOpen(true)}
      />

      {/* Main Viewport Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-5 flex flex-col gap-4">
        {/* Connection warning if backend offline */}
        {!apiOnline && (
          <div className="p-3 rounded-lg bg-matrix-magenta/20 border border-matrix-magenta text-matrix-magenta text-xs font-mono text-center animate-pulse">
            [WARNING]: Simulation Engine server offline on port 5000. Start backend using `npm run dev:backend`.
          </div>
        )}

        {/* Viewport & Telemetry layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start flex-1">
          {/* Left Side-Scroller Viewport (8 Cols) */}
          <div className="lg:col-span-8 flex flex-col gap-3">
            <SideScrollerRenderer
              state={sectorState}
              onFeatureHover={(info) => setHoveredFeature(info)}
            />

            {/* Hovered Feature Inspection Readout */}
            <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-matrix-surface/60 border border-matrix-border text-[11px] font-mono text-slate-400">
              <div className="flex items-center space-x-2">
                <span>INSPECTOR:</span>
                <span className="text-matrix-cyan font-bold">
                  {hoveredFeature
                    ? hoveredFeature
                    : 'HOVER OVER PLATFORMS, LADDERS, RAMPS OR HAZARDS TO INSPECT'}
                </span>
              </div>
              <div className="text-slate-500">
                AI ENGINE:{' '}
                <span className="text-matrix-green font-bold">
                  {evaluation?.metrics?.model || 'typesafe-ai/jev (realtime-engine)'}
                </span>
              </div>
            </div>

            {/* Bottom Operator Controls */}
            <OperatorControls
              isRunning={isRunning}
              onTogglePlay={handleTogglePlay}
              onStepTick={() => {}} // Disabled in continuous 60fps mode
              onReset={() => sectorState && loadSector(sectorState.sectorId)}
              speed={speed}
              onSpeedChange={handleSpeedChange}
              energy={sectorState?.jev.energy ?? 100}
              onTriggerOverride={handleTriggerOverride}
            />
          </div>

          {/* Right Telemetry Stream Terminal (4 Cols) */}
          <div className="lg:col-span-4 h-[450px] lg:h-[660px]">
            <TelemetryPanel
              evaluation={evaluation}
              thoughtLogs={thoughtLogs}
              directive={stats.behaviorDirective}
            />
          </div>
        </div>
      </main>

      {/* Operator Config Lab Modal */}
      <OperatorLabModal
        isOpen={isLabOpen}
        onClose={() => setIsLabOpen(false)}
        stats={stats}
        dataPoints={dataPoints}
        onUpgradeStat={handleUpgradeStat}
        onChangeDirective={handleChangeDirective}
      />

      {/* Sector Debrief (Victory / Failure) Modal */}
      <SectorDebriefModal
        state={sectorState}
        onNextSector={() => {
          if (sectorState) {
            const nextId = sectorState.sectorId >= 5 ? 1 : sectorState.sectorId + 1;
            loadSector(nextId);
          }
        }}
        onRetry={() => {
          if (sectorState) {
            loadSector(sectorState.sectorId);
          }
        }}
        onOpenLab={() => {
          setIsLabOpen(true);
        }}
      />
    </div>
  );
}
