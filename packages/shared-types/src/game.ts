export interface Position {
  x: number;
  y: number;
}

export type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

export type TileType = 
  | 'EMPTY'
  | 'WALL'
  | 'LOW_COVER'
  | 'SECURITY_GATE'
  | 'CORRUPTED_GRID'
  | 'DATA_TERMINAL'
  | 'EXTRACTION_GLITCH';

export type SecurityPassType = 'ALPHA_PASS' | 'BETA_PASS' | 'MASTER_PASS';

export type JevStatus = 'IDLE' | 'RUNNING' | 'CROUCHING' | 'HACKING' | 'EXTRACTED' | 'TERMINATED';

export interface JevState {
  id: string;
  x: number;
  y: number;
  direction: Direction;
  hp: number;
  maxHp: number;
  energy: number;
  maxEnergy: number;
  status: JevStatus;
  keycards: SecurityPassType[];
  noiseRadius: number;
  consecutiveAlertTurns: number;
}

export type EnemyType = 'DRONE' | 'POLICE' | 'TURRET' | 'AGENT_HUNTER';

export type EnemyState = 'PATROL' | 'SUSPICIOUS' | 'HUNT' | 'STUNNED';

export interface EnemyNPC {
  id: string;
  type: EnemyType;
  x: number;
  y: number;
  direction: Direction;
  patrolPath?: Position[];
  patrolIndex?: number;
  patrolForward?: boolean;
  state: EnemyState;
  visionRange: number;
  visionAngle: number; // in degrees
  stunTurns: number;
  suspectedTarget?: Position;
}

export interface SecurityGate {
  id: string;
  x: number;
  y: number;
  requiredPass: SecurityPassType;
  isUnlocked: boolean;
}

export interface DataTerminal {
  id: string;
  x: number;
  y: number;
  isHacked: boolean;
  hackProgress: number; // 0 to 100
  energyReward: number;
  dataPointsReward: number;
}

export interface PassPickup {
  id: string;
  x: number;
  y: number;
  passType: SecurityPassType;
  collected: boolean;
}

export type SectorRunStatus = 'NOT_STARTED' | 'RUNNING' | 'SUCCESS' | 'FAILED_HP' | 'FAILED_TIME';

export interface SectorState {
  sectorId: number;
  name: string;
  gridSize: number;
  timeLimit: number;
  timeRemaining: number;
  matrixAlert: number; // 0 - 100
  isLockdown: boolean;
  tiles: TileType[][];
  jev: JevState;
  enemies: EnemyNPC[];
  gates: SecurityGate[];
  terminals: DataTerminal[];
  passPickups: PassPickup[];
  extractionPoint: Position;
  status: SectorRunStatus;
  ticksElapsed: number;
  visibleTiles: boolean[][]; // computed for client display
}
