'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  SectorState, 
  JevStats, 
  JevEvaluationResponse, 
  DEFAULT_JEV_STATS,
  Position,
  BehaviorDirective 
} from '@escape-the-matrix/shared-types';
import { TopBar } from '@/components/hud/TopBar';
import { GridRenderer } from '@/components/canvas/GridRenderer';
import { TelemetryPanel } from '@/components/hud/TelemetryPanel';
import { OperatorControls } from '@/components/hud/OperatorControls';
import { OperatorLabModal } from '@/components/lab/OperatorLabModal';
import { SectorDebriefModal } from '@/components/hud/SectorDebriefModal';
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
  const [hoveredTile, setHoveredTile] = useState<Position | null>(null);
  const [apiOnline, setApiOnline] = useState<boolean>(true);

  const tickIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize session & first sector
  const loadSector = useCallback(async (sectorId: number) => {
    try {
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
      }
    } catch {
      setApiOnline(false);
    }
  }, []);

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

  // Execute a single simulation tick
  const stepTick = useCallback(async () => {
    if (!runId || !sectorState) return;
    if (sectorState.status === 'SUCCESS' || sectorState.status.startsWith('FAILED')) {
      setIsRunning(false);
      return;
    }

    try {
      const res = await fetch('/api/game/sector/tick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runId }),
      });
      const data = await res.json();

      if (data.success) {
        const newState: SectorState = data.state;
        const newEval: JevEvaluationResponse = data.evaluation;

        setSectorState(newState);
        setEvaluation(newEval);

        // Sound effects
        sound.playStep();
        if (newEval.recommendedAction === 'USE_EMP') sound.playEmp();
        if (newState.matrixAlert > sectorState.matrixAlert + 5) sound.playAlert();

        // Add to live thought logs
        const now = new Date();
        const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;

        setThoughtLogs((prev) => [
          {
            text: newEval.tacticalThought,
            time: timeStr,
            action: newEval.recommendedAction,
          },
          ...prev.slice(0, 30),
        ]);

        // Stop loop if finished
        if (newState.status !== 'RUNNING') {
          setIsRunning(false);
          // Refresh session to get updated data points
          const sessRes = await fetch('/api/game/session');
          const sessData = await sessRes.json();
          if (sessData.success) {
            setDataPoints(sessData.session.dataPoints);
          }
        }
      }
    } catch {
      setIsRunning(false);
    }
  }, [runId, sectorState]);

  // Simulation run timer loop
  useEffect(() => {
    if (isRunning) {
      const delay = Math.max(250, 1000 / speed);
      tickIntervalRef.current = setInterval(() => {
        stepTick();
      }, delay);
    } else {
      if (tickIntervalRef.current) clearInterval(tickIntervalRef.current);
    }

    return () => {
      if (tickIntervalRef.current) clearInterval(tickIntervalRef.current);
    };
  }, [isRunning, speed, stepTick]);

  // Handle Emergency Override
  const handleTriggerOverride = async (type: 'OVERDRIVE_EMP' | 'EMERGENCY_REROUTE') => {
    if (!runId) return;
    try {
      const res = await fetch('/api/game/sector/override', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runId, overrideType: type }),
      });
      const data = await res.json();
      if (data.success) {
        setSectorState(data.state);
        if (type === 'OVERDRIVE_EMP') sound.playEmp();
        const now = new Date();
        const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
        setThoughtLogs((prev) => [
          {
            text: `[OPERATOR MANUAL OVERRIDE]: ${data.message}`,
            time: timeStr,
            action: type,
          },
          ...prev,
        ]);
      }
    } catch {}
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

        {/* Viewport Grid & Telemetry layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start flex-1">
          {/* Left Canvas Viewport (8 Cols) */}
          <div className="lg:col-span-8 flex flex-col gap-3">
            <GridRenderer
              state={sectorState}
              onTileHover={(pos) => setHoveredTile(pos)}
            />

            {/* Hovered Tile Inspection Readout */}
            <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-matrix-surface/60 border border-matrix-border text-[11px] font-mono text-slate-400">
              <div className="flex items-center space-x-2">
                <span>INSPECTOR:</span>
                <span className="text-matrix-cyan">
                  {hoveredTile
                    ? `GRID [${hoveredTile.x}, ${hoveredTile.y}] - ${
                        sectorState?.tiles[hoveredTile.y]?.[hoveredTile.x] || 'EMPTY'
                      }`
                    : 'HOVER OVER GRID TILE TO INSPECT'}
                </span>
              </div>
              <div className="text-slate-500">
                AI EVAL ENGINE: <span className="text-matrix-green">typesafe-ai/jev</span>
              </div>
            </div>

            {/* Bottom Operator Controls */}
            <OperatorControls
              isRunning={isRunning}
              onTogglePlay={() => setIsRunning(!isRunning)}
              onStepTick={stepTick}
              onReset={() => sectorState && loadSector(sectorState.sectorId)}
              speed={speed}
              onSpeedChange={(s) => setSpeed(s)}
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
