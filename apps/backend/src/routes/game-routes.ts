import { Router } from 'express';
import {
  getSession,
  startSession,
  upgradeStat,
  initSector,
  tickSector,
  emergencyOverride,
  evaluateMatrix,
  getTelemetry,
} from '../controllers/game-controller.js';

const router = Router();

// Session & Upgrades
router.get('/session', getSession);
router.post('/session/start', startSession);
router.post('/session/upgrade', upgradeStat);

// Sector Simulation
router.post('/sector/init', initSector);
router.post('/sector/tick', tickSector);
router.post('/sector/override', emergencyOverride);

// Evaluator & Telemetry
router.post('/matrix-eval', evaluateMatrix);
router.get('/telemetry/:runId', getTelemetry);

export default router;
