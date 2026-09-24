import { 
  SectorDefinitionEntity, 
  TileType, 
  EnemyNPC, 
  SecurityGate, 
  DataTerminal, 
  PassPickup, 
  Position 
} from '@escape-the-matrix/shared-types';

function createEmptyGrid(size: number): TileType[][] {
  const grid: TileType[][] = [];
  for (let y = 0; y < size; y++) {
    const row: TileType[] = [];
    for (let x = 0; x < size; x++) {
      row.push('EMPTY');
    }
    grid.push(row);
  }
  return grid;
}

export const SECTOR_DEFINITIONS: Record<number, SectorDefinitionEntity> = {
  1: (() => {
    const size = 8;
    const grid = createEmptyGrid(size);

    // Build alley walls
    grid[2][1] = 'WALL';
    grid[2][2] = 'WALL';
    grid[2][3] = 'WALL';
    grid[2][4] = 'WALL';
    grid[5][3] = 'WALL';
    grid[5][4] = 'WALL';
    grid[5][5] = 'WALL';
    grid[5][6] = 'WALL';
    grid[3][6] = 'LOW_COVER';
    grid[4][1] = 'LOW_COVER';

    const enemies: EnemyNPC[] = [
      {
        id: 'drone-01',
        type: 'DRONE',
        x: 4,
        y: 2,
        direction: 'RIGHT',
        state: 'PATROL',
        visionRange: 3,
        visionAngle: 90,
        stunTurns: 0,
        patrolPath: [
          { x: 4, y: 2 },
          { x: 4, y: 3 },
          { x: 4, y: 4 },
        ],
        patrolIndex: 0,
        patrolForward: true,
      },
    ];

    const gates: SecurityGate[] = [];
    const terminals: DataTerminal[] = [
      {
        id: 'term-1-1',
        x: 1,
        y: 6,
        isHacked: false,
        hackProgress: 0,
        energyReward: 25,
        dataPointsReward: 50,
      },
    ];
    const passPickups: PassPickup[] = [];

    return {
      sectorId: 1,
      name: 'Sub-Grid Slums',
      gridSize: size,
      timeLimit: 60,
      basePoints: 100,
      tileMapJson: grid,
      enemySpawnsJson: enemies,
      gatesJson: gates,
      terminalsJson: terminals,
      passPickupsJson: passPickups,
      extractionPointJson: { x: 7, y: 7 },
      jevSpawnJson: { x: 0, y: 0 },
    };
  })(),

  2: (() => {
    const size = 10;
    const grid = createEmptyGrid(size);

    // Downtown perimeter walls
    for (let x = 2; x <= 7; x++) grid[4][x] = 'WALL';
    grid[4][5] = 'SECURITY_GATE'; // Alpha security gate

    grid[7][2] = 'WALL';
    grid[7][3] = 'WALL';
    grid[7][7] = 'WALL';
    grid[7][8] = 'WALL';

    grid[2][5] = 'LOW_COVER';
    grid[6][2] = 'LOW_COVER';

    const gates: SecurityGate[] = [
      {
        id: 'gate-2-alpha',
        x: 5,
        y: 4,
        requiredPass: 'ALPHA_PASS',
        isUnlocked: false,
      },
    ];

    const passPickups: PassPickup[] = [
      {
        id: 'pass-2-alpha',
        x: 1,
        y: 8,
        passType: 'ALPHA_PASS',
        collected: false,
      },
    ];

    const enemies: EnemyNPC[] = [
      {
        id: 'police-2-1',
        type: 'POLICE',
        x: 2,
        y: 2,
        direction: 'DOWN',
        state: 'PATROL',
        visionRange: 4,
        visionAngle: 90,
        stunTurns: 0,
        patrolPath: [
          { x: 2, y: 2 },
          { x: 5, y: 2 },
          { x: 8, y: 2 },
        ],
        patrolIndex: 0,
        patrolForward: true,
      },
      {
        id: 'police-2-2',
        type: 'POLICE',
        x: 7,
        y: 6,
        direction: 'LEFT',
        state: 'PATROL',
        visionRange: 4,
        visionAngle: 90,
        stunTurns: 0,
        patrolPath: [
          { x: 7, y: 6 },
          { x: 7, y: 8 },
        ],
        patrolIndex: 0,
        patrolForward: true,
      },
    ];

    const terminals: DataTerminal[] = [
      {
        id: 'term-2-1',
        x: 8,
        y: 1,
        isHacked: false,
        hackProgress: 0,
        energyReward: 30,
        dataPointsReward: 75,
      },
    ];

    return {
      sectorId: 2,
      name: 'Downtown Financial Plaza',
      gridSize: size,
      timeLimit: 50,
      basePoints: 150,
      tileMapJson: grid,
      enemySpawnsJson: enemies,
      gatesJson: gates,
      terminalsJson: terminals,
      passPickupsJson: passPickups,
      extractionPointJson: { x: 9, y: 9 },
      jevSpawnJson: { x: 0, y: 0 },
    };
  })(),

  3: (() => {
    const size = 12;
    const grid = createEmptyGrid(size);

    // Highway lanes & corrupted grid tiles
    grid[3][3] = 'CORRUPTED_GRID';
    grid[3][4] = 'CORRUPTED_GRID';
    grid[3][5] = 'CORRUPTED_GRID';
    grid[6][7] = 'CORRUPTED_GRID';
    grid[6][8] = 'CORRUPTED_GRID';
    grid[7][7] = 'CORRUPTED_GRID';

    // Highway barriers
    for (let y = 1; y <= 5; y++) grid[y][6] = 'WALL';
    for (let y = 7; y <= 10; y++) grid[y][6] = 'WALL';

    grid[4][2] = 'LOW_COVER';
    grid[8][9] = 'LOW_COVER';

    const enemies: EnemyNPC[] = [
      {
        id: 'drone-3-1',
        type: 'DRONE',
        x: 4,
        y: 1,
        direction: 'DOWN',
        state: 'PATROL',
        visionRange: 4,
        visionAngle: 90,
        stunTurns: 0,
        patrolPath: [
          { x: 4, y: 1 },
          { x: 4, y: 5 },
        ],
        patrolIndex: 0,
        patrolForward: true,
      },
      {
        id: 'drone-3-2',
        type: 'DRONE',
        x: 8,
        y: 8,
        direction: 'RIGHT',
        state: 'PATROL',
        visionRange: 4,
        visionAngle: 90,
        stunTurns: 0,
        patrolPath: [
          { x: 8, y: 8 },
          { x: 10, y: 8 },
        ],
        patrolIndex: 0,
        patrolForward: true,
      },
      {
        id: 'police-3-1',
        type: 'POLICE',
        x: 7,
        y: 4,
        direction: 'LEFT',
        state: 'PATROL',
        visionRange: 4,
        visionAngle: 90,
        stunTurns: 0,
        patrolPath: [
          { x: 7, y: 4 },
          { x: 10, y: 4 },
        ],
        patrolIndex: 0,
        patrolForward: true,
      },
    ];

    const terminals: DataTerminal[] = [
      {
        id: 'term-3-1',
        x: 2,
        y: 8,
        isHacked: false,
        hackProgress: 0,
        energyReward: 35,
        dataPointsReward: 100,
      },
      {
        id: 'term-3-2',
        x: 10,
        y: 2,
        isHacked: false,
        hackProgress: 0,
        energyReward: 35,
        dataPointsReward: 100,
      },
    ];

    return {
      sectorId: 3,
      name: 'High-Riot Cyber Highway',
      gridSize: size,
      timeLimit: 45,
      basePoints: 200,
      tileMapJson: grid,
      enemySpawnsJson: enemies,
      gatesJson: [],
      terminalsJson: terminals,
      passPickupsJson: [],
      extractionPointJson: { x: 11, y: 11 },
      jevSpawnJson: { x: 0, y: 0 },
    };
  })(),

  4: (() => {
    const size = 14;
    const grid = createEmptyGrid(size);

    // Corporate Core walls & Turrets
    for (let x = 3; x <= 10; x++) grid[5][x] = 'WALL';
    grid[5][7] = 'SECURITY_GATE'; // Beta Gate
    for (let x = 4; x <= 11; x++) grid[9][x] = 'WALL';

    grid[3][4] = 'LOW_COVER';
    grid[7][11] = 'LOW_COVER';
    grid[11][4] = 'LOW_COVER';

    const gates: SecurityGate[] = [
      {
        id: 'gate-4-beta',
        x: 7,
        y: 5,
        requiredPass: 'BETA_PASS',
        isUnlocked: false,
      },
    ];

    const passPickups: PassPickup[] = [
      {
        id: 'pass-4-beta',
        x: 2,
        y: 11,
        passType: 'BETA_PASS',
        collected: false,
      },
    ];

    const enemies: EnemyNPC[] = [
      {
        id: 'turret-4-1',
        type: 'TURRET',
        x: 4,
        y: 3,
        direction: 'RIGHT',
        state: 'PATROL',
        visionRange: 5,
        visionAngle: 90,
        stunTurns: 0,
      },
      {
        id: 'turret-4-2',
        type: 'TURRET',
        x: 10,
        y: 11,
        direction: 'UP',
        state: 'PATROL',
        visionRange: 5,
        visionAngle: 90,
        stunTurns: 0,
      },
      {
        id: 'police-4-1',
        type: 'POLICE',
        x: 2,
        y: 7,
        direction: 'DOWN',
        state: 'PATROL',
        visionRange: 4,
        visionAngle: 90,
        stunTurns: 0,
        patrolPath: [
          { x: 2, y: 7 },
          { x: 5, y: 7 },
        ],
        patrolIndex: 0,
        patrolForward: true,
      },
    ];

    const terminals: DataTerminal[] = [
      {
        id: 'term-4-1',
        x: 11,
        y: 2,
        isHacked: false,
        hackProgress: 0,
        energyReward: 40,
        dataPointsReward: 150,
      },
    ];

    return {
      sectorId: 4,
      name: 'Corporate Central Core',
      gridSize: size,
      timeLimit: 40,
      basePoints: 250,
      tileMapJson: grid,
      enemySpawnsJson: enemies,
      gatesJson: gates,
      terminalsJson: terminals,
      passPickupsJson: passPickups,
      extractionPointJson: { x: 13, y: 13 },
      jevSpawnJson: { x: 0, y: 0 },
    };
  })(),

  5: (() => {
    const size = 16;
    const grid = createEmptyGrid(size);

    // Citadel inner sanctum
    for (let x = 5; x <= 12; x++) {
      grid[4][x] = 'WALL';
      grid[11][x] = 'WALL';
    }
    for (let y = 5; y <= 10; y++) {
      grid[y][5] = 'WALL';
      grid[y][12] = 'WALL';
    }

    grid[11][8] = 'SECURITY_GATE'; // Master Gate
    grid[7][7] = 'CORRUPTED_GRID';
    grid[7][9] = 'CORRUPTED_GRID';
    grid[9][8] = 'CORRUPTED_GRID';

    grid[3][8] = 'LOW_COVER';
    grid[13][8] = 'LOW_COVER';

    const gates: SecurityGate[] = [
      {
        id: 'gate-5-master',
        x: 8,
        y: 11,
        requiredPass: 'MASTER_PASS',
        isUnlocked: false,
      },
    ];

    const passPickups: PassPickup[] = [
      {
        id: 'pass-5-master',
        x: 2,
        y: 14,
        passType: 'MASTER_PASS',
        collected: false,
      },
    ];

    const enemies: EnemyNPC[] = [
      {
        id: 'hunter-5-boss',
        type: 'AGENT_HUNTER',
        x: 8,
        y: 8,
        direction: 'DOWN',
        state: 'PATROL',
        visionRange: 5,
        visionAngle: 90,
        stunTurns: 0,
        patrolPath: [
          { x: 8, y: 7 },
          { x: 9, y: 8 },
          { x: 8, y: 9 },
          { x: 7, y: 8 },
        ],
        patrolIndex: 0,
        patrolForward: true,
      },
      {
        id: 'police-5-1',
        type: 'POLICE',
        x: 2,
        y: 4,
        direction: 'RIGHT',
        state: 'PATROL',
        visionRange: 4,
        visionAngle: 90,
        stunTurns: 0,
        patrolPath: [
          { x: 2, y: 4 },
          { x: 4, y: 4 },
        ],
        patrolIndex: 0,
        patrolForward: true,
      },
      {
        id: 'police-5-2',
        type: 'POLICE',
        x: 13,
        y: 5,
        direction: 'DOWN',
        state: 'PATROL',
        visionRange: 4,
        visionAngle: 90,
        stunTurns: 0,
        patrolPath: [
          { x: 13, y: 5 },
          { x: 13, y: 9 },
        ],
        patrolIndex: 0,
        patrolForward: true,
      },
      {
        id: 'turret-5-1',
        type: 'TURRET',
        x: 13,
        y: 13,
        direction: 'LEFT',
        state: 'PATROL',
        visionRange: 5,
        visionAngle: 90,
        stunTurns: 0,
      },
    ];

    const terminals: DataTerminal[] = [
      {
        id: 'term-5-master',
        x: 8,
        y: 6,
        isHacked: false,
        hackProgress: 0,
        energyReward: 50,
        dataPointsReward: 300,
      },
    ];

    return {
      sectorId: 5,
      name: 'The Citadel Extraction Glitch',
      gridSize: size,
      timeLimit: 35,
      basePoints: 500,
      tileMapJson: grid,
      enemySpawnsJson: enemies,
      gatesJson: gates,
      terminalsJson: terminals,
      passPickupsJson: passPickups,
      extractionPointJson: { x: 15, y: 15 },
      jevSpawnJson: { x: 0, y: 0 },
    };
  })(),
};
