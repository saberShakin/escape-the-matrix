import { Position, TileType, EnemyNPC, SecurityGate, DataTerminal, PassPickup } from './game';
import { BehaviorDirective } from './stats';

/**
 * DB Table Model: operator_sessions
 */
export interface OperatorSessionEntity {
  id: string; // UUID
  currentSectorId: number;
  dataPoints: number;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

/**
 * DB Table Model: jev_stats
 */
export interface JevStatsEntity {
  id: string; // UUID
  sessionId: string;
  stealthMatrix: number;
  processingHz: number;
  hackBypass: number;
  armorShield: number;
  energyReactor: number;
  behaviorDirective: BehaviorDirective;
}

/**
 * DB Table Model: sector_definitions
 */
export interface SectorDefinitionEntity {
  sectorId: number;
  name: string;
  gridSize: number;
  timeLimit: number;
  basePoints: number;
  tileMapJson: TileType[][];
  enemySpawnsJson: EnemyNPC[];
  gatesJson: SecurityGate[];
  terminalsJson: DataTerminal[];
  passPickupsJson: PassPickup[];
  extractionPointJson: Position;
  jevSpawnJson: Position;
}

/**
 * DB Table Model: sector_runs
 */
export interface SectorRunEntity {
  id: string; // UUID
  sessionId: string;
  sectorId: number;
  status: 'SUCCESS' | 'FAILED_HP' | 'FAILED_TIME';
  hpRemaining: number;
  timeRemaining: number;
  terminalsHacked: number;
  dataPointsEarned: number;
  durationMs: number;
  createdAt: string;
}

/**
 * DB Table Model: jev_telemetry_logs
 */
export interface JevTelemetryLogEntity {
  id: string; // UUID
  runId: string;
  tickNumber: number;
  detectionRisk: number;
  actionExecuted: string;
  tacticalThought: string;
  createdAt: string;
}
