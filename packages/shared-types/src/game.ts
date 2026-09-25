export type HeightBand = 'ROOFTOP' | 'STREET' | 'ALLEY';

export type SectorTheme = 'SLUMS' | 'SKY_BRIDGE' | 'HIGHWAY' | 'OFFICE_VAULT' | 'CITADEL_GLITCH';

export type WeatherType = 'RAIN' | 'HAZE' | 'CODE_RAIN' | 'NONE';

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

export type JevStatus = 
  | 'IDLE' 
  | 'RUNNING' 
  | 'JUMPING'
  | 'CLIMBING'
  | 'DESCENDING'
  | 'CROUCHING'
  | 'HIDING_IN_COVER'
  | 'HACKING' 
  | 'EXTRACTED' 
  | 'TERMINATED';

export interface Ladder {
  id: string;
  x: number;
  topBand: 'ROOFTOP';
  bottomBand: 'STREET';
}

export interface Ramp {
  id: string;
  startX: number;
  endX: number;
  direction: 'DOWN_TO_ALLEY' | 'UP_TO_STREET';
}

export interface GapHazard {
  id: string;
  startX: number;
  endX: number;
  band: 'STREET';
  isMovingTraffic?: boolean; // For Sector 3 highway hover-cars
}

export interface CoverClutter {
  id: string;
  x: number;
  band: HeightBand;
  type: 'CRATE' | 'BARRELS' | 'DUMPSTER' | 'SERVER_RACK' | 'DESK';
}

export interface InteractiveFeature {
  id: string;
  type: 'STEAM_VENT' | 'AIR_DUCT' | 'HOLOGRAM' | 'SECURITY_CAMERA';
  x: number;
  y: number;
  band: HeightBand;
  state?: 'ACTIVE' | 'INACTIVE';
}

export interface JevState {
  id: string;
  x: number;
  y: number; // 0 = rooftop, 1 = street, 2 = alley
  band: HeightBand;
  facing: 'LEFT' | 'RIGHT';
  direction: Direction;
  hp: number;
  maxHp: number;
  energy: number;
  maxEnergy: number;
  status: JevStatus;
  keycards: SecurityPassType[];
  noiseRadius: number;
  consecutiveAlertTurns: number;
  targetFocus?: string;
  isHidingInCover?: boolean;
  vx?: number;
  vy?: number;
  jumpProgress?: number;
  climbProgress?: number;
  rampProgress?: number;
}

export type EnemyType = 'DRONE' | 'POLICE' | 'TURRET' | 'AGENT_HUNTER';

export type EnemyState = 'PATROL' | 'SUSPICIOUS' | 'HUNT' | 'STUNNED';

export interface EnemyNPC {
  id: string;
  type: EnemyType;
  x: number;
  y: number;
  band: HeightBand;
  direction: Direction;
  facing: 'LEFT' | 'RIGHT';
  patrolPath?: Position[];
  minX?: number;
  maxX?: number;
  patrolIndex?: number;
  patrolForward?: boolean;
  state: EnemyState;
  alertMeter?: number; // 0 to 100
  speechBubble?: '?' | '!' | 'SCAN' | null;
  visionRange: number;
  visionAngle: number; // in degrees
  turretAngle?: number; // vertical arc sweep in degrees for wall-mounted turrets
  turretSweepDir?: 1 | -1;
  stunTurns: number;
  suspectedTarget?: Position;
}

export interface SecurityGate {
  id: string;
  x: number;
  y: number;
  band: HeightBand;
  requiredPass: SecurityPassType;
  isUnlocked: boolean;
}

export interface DataTerminal {
  id: string;
  x: number;
  y: number;
  band: HeightBand;
  isHacked: boolean;
  hackProgress: number; // 0 to 100
  energyReward: number;
  dataPointsReward: number;
}

export interface PassPickup {
  id: string;
  x: number;
  y: number;
  band: HeightBand;
  passType: SecurityPassType;
  collected: boolean;
}

export type SectorRunStatus = 'NOT_STARTED' | 'RUNNING' | 'SUCCESS' | 'FAILED_HP' | 'FAILED_TIME';

export interface SectorSideScrollerLayout {
  widthUnits: number; // total horizontal distance (e.g. 26 units)
  theme: SectorTheme;
  weather: WeatherType;
  ladders: Ladder[];
  ramps: Ramp[];
  gaps: GapHazard[];
  clutter: CoverClutter[];
  features?: InteractiveFeature[];
  rooftopStart: number;
  rooftopEnd: number;
  alleyStart: number;
  alleyEnd: number;
  description?: string;
}

export interface SectorState {
  sectorId: number;
  name: string;
  theme?: SectorTheme;
  weather?: WeatherType;
  gridSize: number;
  timeLimit: number;
  timeRemaining: number;
  matrixAlert: number; // 0 - 100
  isLockdown: boolean;
  tiles: TileType[][];
  layout?: SectorSideScrollerLayout;
  jev: JevState;
  enemies: EnemyNPC[];
  gates: SecurityGate[];
  terminals: DataTerminal[];
  passPickups: PassPickup[];
  extractionPoint: Position & { band?: HeightBand };
  status: SectorRunStatus;
  ticksElapsed: number;
  visibleTiles: boolean[][];
}


