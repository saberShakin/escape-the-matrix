import { Position } from './game';

export type JevActionType = 
  | 'MOVE_STEALTH'
  | 'MOVE_SPRINT'
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
  direction: string;
  state: string;
  distanceToJev: number;
}

export interface JevHazardSnapshot {
  x: number;
  y: number;
  type: string;
}

export interface JevStateSnapshot {
  sectorId: number;
  jevPosition: Position;
  jevHealth: number;
  jevEnergy: number;
  keycards: string[];
  timeRemaining: number;
  matrixAlert: number;
  directives: string;
  enemies: JevEnemySnapshot[];
  nearbyHazards: JevHazardSnapshot[];
  targetGlitch: Position;
}

export interface JevEvaluationResponse {
  detectionRisk: number; // 0.0 - 1.0
  recommendedAction: JevActionType;
  tacticalThought: string;
}
