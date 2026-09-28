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
  | 'WALKING'
  | 'RUNNING' 
  | 'JUMPING'
  | 'CLIMBING'
  | 'DESCENDING_LADDER'
  | 'DESCENDING'
  | 'FIGHTING'
  | 'KNOCKING_OUT'
  | 'RESTING'
  | 'CROUCHING'
  | 'HIDING_IN_COVER'
  | 'HACKING' 
  | 'CAUGHT_IN_NET'
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


export interface HealthPickup {
  id: string;
  x: number;
  band: HeightBand;
  amount: number;
  isCollected: boolean;
}

export interface NetTrap {
  id: string;
  x: number;
  band: HeightBand;
  remaining: number;
}
export interface InteractiveFeature {
  id: string;
  type: 'STEAM_VENT' | 'SMOKE_CLOUD' | 'AIR_DUCT' | 'HOLOGRAM' | 'SECURITY_CAMERA';
  x: number;
  y: number;
  band: HeightBand;
  state?: 'ACTIVE' | 'INACTIVE';
  securityLevel?: number;
  isHacked?: boolean;
  minX?: number;
  maxX?: number;
  moveSpeed?: number;
  moveDirection?: -1 | 1;
  scanRange?: number;
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
  stamina: number;
  maxStamina: number;
  energy: number;
  maxEnergy: number;
  status: JevStatus;
  keycards: SecurityPassType[];
  noiseRadius: number;
  consecutiveAlertTurns: number;
  targetFocus?: string;
  isHidingInCover?: boolean;
  hiddenByCoverId?: string;
  activeCombatEnemyId?: string;
  ladderTargetId?: string;
  vx?: number;
  vy?: number;
  jumpProgress?: number;
  climbProgress?: number;
  rampProgress?: number;
  climbTargetBand?: HeightBand;
  climbLadderId?: string;
  rooftopEntryX?: number;
  hasExitedRooftop?: boolean;
  traversalDirection?: -1 | 1;
  hitFlash?: number;
}

export type EnemyType = 'DRONE' | 'POLICE' | 'TURRET' | 'AGENT_HUNTER';

export type EnemyState = 'PATROL' | 'SUSPICIOUS' | 'HUNT' | 'STUNNED' | 'HACKED';

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
  health?: number;
  maxHealth?: number;
  attackCooldown?: number;
  combatActive?: boolean;
  hackLevel?: number;
  netExposure?: number;
  netCooldown?: number;
  netWarning?: number;
  isKnockedOut?: boolean;
  hitFlash?: number;
}

export interface SecurityGate {
  id: string;
  x: number;
  y: number;
  band: HeightBand;
  requiredPass: SecurityPassType;
  isUnlocked: boolean;
  securityLevel?: number;
  structureType?: 'DOOR' | 'GATE';
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
  hackTargetId?: string;
  securityLevel?: number;
}

export interface PassPickup {
  id: string;
  x: number;
  y: number;
  band: HeightBand;
  passType: SecurityPassType;
  collected: boolean;
}

export type SectorRunStatus = 'NOT_STARTED' | 'RUNNING' | 'SUCCESS' | 'FAILED_HP' | 'FAILED_NET' | 'FAILED_TIME';

export interface SectorSideScrollerLayout {
  widthUnits: number; // total horizontal distance (e.g. 26 units)
  theme: SectorTheme;
  weather: WeatherType;
  ladders: Ladder[];
  ramps: Ramp[];
  gaps: GapHazard[];
  clutter: CoverClutter[];
  features?: InteractiveFeature[];
  healthPickups?: HealthPickup[];
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
  nets?: NetTrap[];
  gates: SecurityGate[];
  terminals: DataTerminal[];
  passPickups: PassPickup[];
  extractionPoint: Position & { band?: HeightBand };
  status: SectorRunStatus;
  ticksElapsed: number;
  visibleTiles: boolean[][];
}


