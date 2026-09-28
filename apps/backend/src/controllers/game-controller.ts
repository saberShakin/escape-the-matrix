import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { JevStats, getStatUpgradeCost, STAT_MAX_LEVEL } from '@escape-the-matrix/shared-types';
import { sessionStore } from '../services/game/session-store.js';
import { initSectorState, tickSimulation, executeEmergencyOverride } from '../engine/state-machine.js';
import { evaluateJevState } from '../services/jev/evaluator.js';

// In-memory active sector runs keyed by runId
const activeRuns = new Map<string, { state: any; stats: JevStats; runId: string; rewardAwarded: boolean }>();

export const getSession = (req: Request, res: Response) => {
  const active = sessionStore.getActiveSession();
  res.json({ success: true, ...active });
};

export const startSession = (req: Request, res: Response) => {
  const session = sessionStore.initDefaultSession();
  const stats = sessionStore.getStats(session.id);
  res.json({ success: true, session, stats });
};

export const upgradeStat = (req: Request, res: Response) => {
  const { statKey, directive } = req.body;
  const { session, stats } = sessionStore.getActiveSession();

  // If changing behavior directive (free)
  if (directive && ['STEALTH', 'AGGRESSIVE', 'BALANCED'].includes(directive)) {
    const updated = sessionStore.updateStats(session.id, { behaviorDirective: directive });
    return res.json({ success: true, stats: updated, dataPoints: session.dataPoints });
  }

  // If upgrading numeric stat
  const validKeys: (keyof Omit<JevStats, 'behaviorDirective'>)[] = [
    'health',
    'stamina',
    'combatPower',
    'intellect',
  ];

  if (!statKey || !validKeys.includes(statKey)) {
    return res.status(400).json({ success: false, error: 'Invalid stat key.' });
  }

  const currentLevel = stats[statKey as keyof JevStats] as number;
  if (currentLevel >= STAT_MAX_LEVEL) {
    return res.status(400).json({ success: false, error: 'Stat is already at max level.' });
  }

  const cost = getStatUpgradeCost(currentLevel);
  if (session.dataPoints < cost) {
    return res.status(400).json({ success: false, error: `Insufficient data points (${cost} required).` });
  }

  // Deduct points and upgrade
  session.dataPoints -= cost;
  const updatePayload: Partial<JevStats> = {};
  updatePayload[statKey as keyof Omit<JevStats, 'behaviorDirective'>] = currentLevel + 1;
  const updatedStats = sessionStore.updateStats(session.id, updatePayload);

  res.json({ success: true, stats: updatedStats, dataPoints: session.dataPoints });
};

export const initSector = (req: Request, res: Response) => {
  const { sectorId = 1 } = req.body;
  const { session, stats } = sessionStore.getActiveSession();

  const runId = uuidv4();
  const state = initSectorState(Number(sectorId), stats);

  activeRuns.set(runId, { state, stats, runId, rewardAwarded: false });

  res.json({
    success: true,
    runId,
    state,
    stats,
  });
};

export const completeRealtimeSector = (req: Request, res: Response) => {
  const { runId, finalState } = req.body;
  const activeRun = activeRuns.get(runId);
  if (!activeRun) {
    return res.status(404).json({ success: false, error: 'Sector run not found.' });
  }
  if (finalState?.status !== 'SUCCESS' || finalState.sectorId !== activeRun.state.sectorId) {
    return res.status(409).json({ success: false, error: 'Only a successful sector awards points.' });
  }
  activeRun.state = finalState;

  const { session } = sessionStore.getActiveSession();
  if (activeRun.rewardAwarded) {
    return res.json({ success: true, dataPoints: session.dataPoints, pointsEarned: 0 });
  }

  const state = activeRun.state;
  const pointsEarned = state.sectorId * 100 + Math.ceil(state.jev.hp) * 25 + Math.floor(state.timeRemaining) * 5;
  const dataPoints = sessionStore.awardDataPoints(session.id, pointsEarned);
  sessionStore.advanceSector(session.id, state.sectorId + 1);
  sessionStore.recordSectorRun({
    sessionId: session.id,
    sectorId: state.sectorId,
    status: 'SUCCESS',
    hpRemaining: Math.ceil(state.jev.hp),
    timeRemaining: Math.floor(state.timeRemaining),
    terminalsHacked: 0,
    dataPointsEarned: pointsEarned,
    durationMs: Math.max(0, (state.timeLimit - state.timeRemaining) * 1000),
  });
  activeRun.rewardAwarded = true;
  return res.json({ success: true, dataPoints, pointsEarned });
};

export const tickSector = async (req: Request, res: Response) => {
  const { runId } = req.body;
  const activeRun = activeRuns.get(runId);

  if (!activeRun) {
    return res.status(404).json({ success: false, error: 'Sector run not found or expired.' });
  }

  const result = await tickSimulation(activeRun.state, activeRun.stats, runId);
  activeRun.state = result.state;

  // If sector finished, record run and award points
  if (result.state.status === 'SUCCESS' || result.state.status.startsWith('FAILED')) {
    const { session } = sessionStore.getActiveSession();
    let pointsEarned = 0;

    if (result.state.status === 'SUCCESS') {
      const basePoints = result.state.sectorId * 100;
      const hpBonus = result.state.jev.hp * 25;
      const timeBonus = result.state.timeRemaining * 5;
      const terminalsHacked = result.state.terminals.filter((t: any) => t.isHacked).length;
      const terminalBonus = terminalsHacked * 50;

      pointsEarned = basePoints + hpBonus + timeBonus + terminalBonus;
      sessionStore.awardDataPoints(session.id, pointsEarned);
      sessionStore.advanceSector(session.id, result.state.sectorId + 1);
      activeRun.rewardAwarded = true;
    }

    sessionStore.recordSectorRun({
      sessionId: session.id,
      sectorId: result.state.sectorId,
      status: result.state.status as 'SUCCESS' | 'FAILED_HP' | 'FAILED_NET' | 'FAILED_TIME',
      hpRemaining: result.state.jev.hp,
      timeRemaining: result.state.timeRemaining,
      terminalsHacked: result.state.terminals.filter((t: any) => t.isHacked).length,
      dataPointsEarned: pointsEarned,
      durationMs: result.state.ticksElapsed * 1000,
    });
  }

  res.json({
    success: true,
    state: result.state,
    evaluation: result.evaluation,
  });
};

export const emergencyOverride = (req: Request, res: Response) => {
  const { runId, overrideType } = req.body;
  const activeRun = activeRuns.get(runId);

  if (!activeRun) {
    return res.status(404).json({ success: false, error: 'Sector run not found.' });
  }

  const result = executeEmergencyOverride(activeRun.state, overrideType);
  res.json({
    success: result.success,
    message: result.message,
    state: activeRun.state,
  });
};

export const evaluateMatrix = async (req: Request, res: Response) => {
  try {
    const snapshot = req.body;
    const response = await evaluateJevState(snapshot);
    res.json({ success: true, ...response });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getTelemetry = (req: Request, res: Response) => {
  const runId = String(req.params.runId);
  const logs = sessionStore.getTelemetry(runId);
  res.json({ success: true, logs });
};
