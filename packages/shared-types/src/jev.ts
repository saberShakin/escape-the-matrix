import { Position, HeightBand } from './game';

export type JevActionType = 
  | 'MOVE_STEALTH'
  | 'MOVE_SPRINT'
  | 'JUMP_GAP'
  | 'CLIMB_LADDER'
  | 'DESCEND_RAMP'
  | 'ASCEND_RAMP'
  | 'TAKE_COVER'
  | 'CRAWL_DUCT'
  | 'HACK_GATE'
  | 'HACK_TERMINAL'
  | 'USE_EMP'
  | 'USE_DECOY'
  | 'WAIT';


export interface JevEnemySnapshot {
  id: string;
  type: string;
  x: number;
  y: number;
  band?: HeightBand;
  direction: string;
  state: string;
  distanceToJev: number;
}

export interface JevHazardSnapshot {
  x: number;
  y: number;
  band?: HeightBand;
  type: string;
}

export interface JevStateSnapshot {
  sectorId: number;
  jevPosition: Position;
  jevBand?: HeightBand;
  jevHealth: number;
  jevEnergy: number;
  keycards: string[];
  timeRemaining: number;
  matrixAlert: number;
  directives: string;
  enemies: JevEnemySnapshot[];
  nearbyHazards: JevHazardSnapshot[];
  targetGlitch: Position;
  targetFocus?: string;
}

export interface JevAiMetrics {
  model: string;
  tokensIn: number;
  tokensOut: number;
  totalTokens: number;
  latencyMs: number;
  estimatedCostUsd: number;
  providerStatus: 'ONLINE' | 'SIMULATED' | 'OFFLINE';
}

export interface JevEvaluationResponse {
  detectionRisk: number; // 0.0 - 1.0
  recommendedAction: JevActionType;
  tacticalThought: string;
  targetFocus: string;
  metrics?: JevAiMetrics;
}

