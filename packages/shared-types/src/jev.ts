import { Position, HeightBand } from './game';

export type JevActionType = 
  | 'MOVE_STEALTH'
  | 'MOVE_SPRINT'
  | 'MOVE_WALK'
  | 'MOVE_BACKWARD'
  | 'JUMP_GAP'
  | 'CLIMB_LADDER'
  | 'DESCEND_LADDER'
  | 'DESCEND_RAMP'
  | 'ASCEND_RAMP'
  | 'TAKE_COVER'
  | 'HIDE'
  | 'KNOCKOUT'
  | 'FIGHT'
  | 'REST'
  | 'CRAWL_DUCT'
  | 'OPEN_DOOR'
  | 'HACK_GATE'
  | 'HACK_TERMINAL'
  | 'HACK_DRONE'
  | 'HACK_CAMERA'
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
  facing?: 'LEFT' | 'RIGHT';
  hackLevel?: number;
}

export interface JevHazardSnapshot {
  x: number;
  y: number;
  band?: HeightBand;
  type: string;
  securityLevel?: number;
}

export interface JevStateSnapshot {
  sectorId: number;
  jevPosition: Position;
  jevBand?: HeightBand;
  jevHealth: number;
  jevMaxHealth?: number;
  jevStamina?: number;
  jevIntellect?: number;
  platformStart?: number;
  platformEnd?: number;
  rooftopEntryX?: number;
  canUseLadders?: boolean;
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

