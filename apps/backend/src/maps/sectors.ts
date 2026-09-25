import { 
  SectorDefinitionEntity, 
  TileType, 
  EnemyNPC, 
  SecurityGate, 
  DataTerminal, 
  PassPickup, 
  Position,
  SectorSideScrollerLayout 
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
  // =========================================================================
  // SECTOR 01: Sub-Grid Slums (Rainy Neon Alleyways & Fire Escapes)
  // =========================================================================
  1: (() => {
    const size = 26;
    const grid = createEmptyGrid(size);

    const layout: SectorSideScrollerLayout = {
      widthUnits: 26,
      theme: 'SLUMS',
      weather: 'RAIN',
      description: 'Rain-slicked neon back-alleys with steam vents, fire escape scaffolding, and low puddle-scanning drones.',
      rooftopStart: 4,
      rooftopEnd: 14,
      alleyStart: 13,
      alleyEnd: 22,
      ladders: [
        { id: 'fire-escape-ladder-1', x: 5, topBand: 'ROOFTOP', bottomBand: 'STREET' }
      ],
      ramps: [
        { id: 'sub-alley-ramp-down', startX: 13, endX: 15, direction: 'DOWN_TO_ALLEY' },
        { id: 'sub-alley-ramp-up', startX: 20, endX: 22, direction: 'UP_TO_STREET' }
      ],
      gaps: [
        { id: 'flooded-trench-gap', startX: 8, endX: 11, band: 'STREET' }
      ],
      clutter: [
        { id: 'slum-dumpster-1', x: 3, band: 'STREET', type: 'DUMPSTER' },
        { id: 'scaffold-crate-2', x: 8, band: 'ROOFTOP', type: 'CRATE' },
        { id: 'sub-alley-barrel-3', x: 17, band: 'ALLEY', type: 'BARRELS' }
      ],
      features: [
        { id: 'steam-vent-1', type: 'STEAM_VENT', x: 7, y: 1, band: 'STREET', state: 'ACTIVE' },
        { id: 'steam-vent-2', type: 'STEAM_VENT', x: 19, y: 2, band: 'ALLEY', state: 'ACTIVE' }
      ]
    };

    const enemies: EnemyNPC[] = [
      {
        id: 'puddle-recon-drone',
        type: 'DRONE',
        x: 9.5,
        y: 1,
        band: 'STREET',
        direction: 'RIGHT',
        facing: 'RIGHT',
        state: 'PATROL',
        minX: 8.5,
        maxX: 11.5,
        visionRange: 3.5,
        visionAngle: 75,
        stunTurns: 0,
      }
    ];

    const gates: SecurityGate[] = [];
    const terminals: DataTerminal[] = [
      {
        id: 'slum-data-tap',
        x: 18,
        y: 2,
        band: 'ALLEY',
        isHacked: false,
        hackProgress: 0,
        energyReward: 30,
        dataPointsReward: 60,
      }
    ];
    const passPickups: PassPickup[] = [];

    return {
      sectorId: 1,
      name: 'Sub-Grid Slums (Rain Alleys)',
      gridSize: size,
      timeLimit: 60,
      basePoints: 120,
      tileMapJson: grid,
      layoutJson: layout,
      enemySpawnsJson: enemies,
      gatesJson: gates,
      terminalsJson: terminals,
      passPickupsJson: passPickups,
      extractionPointJson: { x: 25, y: 1 },
      jevSpawnJson: { x: 0.5, y: 1 },
    };
  })(),

  // =========================================================================
  // SECTOR 02: Downtown Sky-Bridge Plaza (Corporate Checkpoints)
  // =========================================================================
  2: (() => {
    const size = 28;
    const grid = createEmptyGrid(size);

    const layout: SectorSideScrollerLayout = {
      widthUnits: 28,
      theme: 'SKY_BRIDGE',
      weather: 'HAZE',
      description: 'High-altitude corporate glass towers. Upper Sky-Bridge bypass vs. lower transit tunnel with laser checkpoint.',
      rooftopStart: 4,
      rooftopEnd: 17,
      alleyStart: 16,
      alleyEnd: 24,
      ladders: [
        { id: 'skybridge-ascent-1', x: 5, topBand: 'ROOFTOP', bottomBand: 'STREET' },
        { id: 'skybridge-descent-2', x: 16, topBand: 'ROOFTOP', bottomBand: 'STREET' }
      ],
      ramps: [
        { id: 'metro-ramp-down', startX: 16, endX: 18, direction: 'DOWN_TO_ALLEY' },
        { id: 'metro-ramp-up', startX: 23, endX: 25, direction: 'UP_TO_STREET' }
      ],
      gaps: [
        { id: 'atrium-skylight-gap', startX: 9, endX: 12, band: 'STREET' }
      ],
      clutter: [
        { id: 'plaza-bench-1', x: 2, band: 'STREET', type: 'CRATE' },
        { id: 'executive-planter-2', x: 9, band: 'ROOFTOP', type: 'BARRELS' },
        { id: 'maintenance-crate-3', x: 20, band: 'ALLEY', type: 'CRATE' }
      ],
      features: [
        { id: 'corporate-hologram-1', type: 'HOLOGRAM', x: 11, y: 0, band: 'ROOFTOP', state: 'ACTIVE' },
        { id: 'security-camera-1', type: 'SECURITY_CAMERA', x: 14, y: 1, band: 'STREET', state: 'ACTIVE' }
      ]
    };

    const enemies: EnemyNPC[] = [
      {
        id: 'skybridge-enforcer',
        type: 'POLICE',
        x: 11,
        y: 0,
        band: 'ROOFTOP',
        direction: 'RIGHT',
        facing: 'RIGHT',
        minX: 7,
        maxX: 15,
        state: 'PATROL',
        visionRange: 4.5,
        visionAngle: 60,
        stunTurns: 0,
      },
      {
        id: 'plaza-ground-guard',
        type: 'POLICE',
        x: 19,
        y: 1,
        band: 'STREET',
        direction: 'LEFT',
        facing: 'LEFT',
        minX: 17,
        maxX: 22,
        state: 'PATROL',
        visionRange: 4,
        visionAngle: 60,
        stunTurns: 0,
      }
    ];

    const gates: SecurityGate[] = [
      {
        id: 'laser-checkpoint-alpha',
        x: 14,
        y: 1,
        band: 'STREET',
        requiredPass: 'ALPHA_PASS',
        isUnlocked: false,
      }
    ];

    const passPickups: PassPickup[] = [
      {
        id: 'alpha-security-card',
        x: 8,
        y: 0,
        band: 'ROOFTOP',
        passType: 'ALPHA_PASS',
        collected: false,
      }
    ];

    const terminals: DataTerminal[] = [
      {
        id: 'financial-ledger-node',
        x: 21,
        y: 2,
        band: 'ALLEY',
        isHacked: false,
        hackProgress: 0,
        energyReward: 35,
        dataPointsReward: 90,
      }
    ];

    return {
      sectorId: 2,
      name: 'Downtown Sky-Bridge Plaza',
      gridSize: size,
      timeLimit: 50,
      basePoints: 220,
      tileMapJson: grid,
      layoutJson: layout,
      enemySpawnsJson: enemies,
      gatesJson: gates,
      terminalsJson: terminals,
      passPickupsJson: passPickups,
      extractionPointJson: { x: 27, y: 1 },
      jevSpawnJson: { x: 0.5, y: 1 },
    };
  })(),

  // =========================================================================
  // SECTOR 03: High-Riot Mag-Rail Expressway (Fast Traffic & Aerial Drones)
  // =========================================================================
  3: (() => {
    const size = 30;
    const grid = createEmptyGrid(size);

    const layout: SectorSideScrollerLayout = {
      widthUnits: 30,
      theme: 'HIGHWAY',
      weather: 'NONE',
      description: 'Multi-lane cyber expressway. Moving autonomous hover-cars roar across highway gaps; container hop routes.',
      rooftopStart: 3,
      rooftopEnd: 19,
      alleyStart: 18,
      alleyEnd: 27,
      ladders: [
        { id: 'gantry-ladder-1', x: 4, topBand: 'ROOFTOP', bottomBand: 'STREET' },
        { id: 'gantry-ladder-2', x: 18, topBand: 'ROOFTOP', bottomBand: 'STREET' }
      ],
      ramps: [
        { id: 'undercarriage-ramp-down', startX: 19, endX: 21, direction: 'DOWN_TO_ALLEY' },
        { id: 'undercarriage-ramp-up', startX: 25, endX: 27, direction: 'UP_TO_STREET' }
      ],
      gaps: [
        { id: 'highway-lane-gap-1', startX: 7, endX: 11, band: 'STREET', isMovingTraffic: true },
        { id: 'highway-lane-gap-2', startX: 14, endX: 17, band: 'STREET', isMovingTraffic: true }
      ],
      clutter: [
        { id: 'cargo-container-1', x: 2, band: 'STREET', type: 'CRATE' },
        { id: 'gantry-relay-box', x: 11, band: 'ROOFTOP', type: 'BARRELS' },
        { id: 'underpass-drain-pipe', x: 23, band: 'ALLEY', type: 'CRATE' }
      ]
    };

    const enemies: EnemyNPC[] = [
      {
        id: 'highway-patrol-drone-1',
        type: 'DRONE',
        x: 9,
        y: 1,
        band: 'STREET',
        direction: 'RIGHT',
        facing: 'RIGHT',
        minX: 7,
        maxX: 11,
        state: 'PATROL',
        visionRange: 4,
        visionAngle: 80,
        stunTurns: 0,
      },
      {
        id: 'highway-patrol-drone-2',
        type: 'DRONE',
        x: 15.5,
        y: 1,
        band: 'STREET',
        direction: 'LEFT',
        facing: 'LEFT',
        minX: 14,
        maxX: 17.5,
        state: 'PATROL',
        visionRange: 4,
        visionAngle: 80,
        stunTurns: 0,
      },
      {
        id: 'overpass-highway-patrol',
        type: 'POLICE',
        x: 12,
        y: 0,
        band: 'ROOFTOP',
        direction: 'RIGHT',
        facing: 'RIGHT',
        minX: 7,
        maxX: 16,
        state: 'PATROL',
        visionRange: 4.5,
        visionAngle: 60,
        stunTurns: 0,
      }
    ];

    const gates: SecurityGate[] = [];
    const terminals: DataTerminal[] = [
      {
        id: 'traffic-control-hub',
        x: 13,
        y: 0,
        band: 'ROOFTOP',
        isHacked: false,
        hackProgress: 0,
        energyReward: 40,
        dataPointsReward: 100,
      },
      {
        id: 'sub-highway-grid-node',
        x: 22,
        y: 2,
        band: 'ALLEY',
        isHacked: false,
        hackProgress: 0,
        energyReward: 40,
        dataPointsReward: 100,
      }
    ];
    const passPickups: PassPickup[] = [];

    return {
      sectorId: 3,
      name: 'High-Riot Cyber Highway',
      gridSize: size,
      timeLimit: 45,
      basePoints: 320,
      tileMapJson: grid,
      layoutJson: layout,
      enemySpawnsJson: enemies,
      gatesJson: gates,
      terminalsJson: terminals,
      passPickupsJson: passPickups,
      extractionPointJson: { x: 29, y: 1 },
      jevSpawnJson: { x: 0.5, y: 1 },
    };
  })(),

  // =========================================================================
  // SECTOR 04: Neuro-Corp Executive Vaults (Interior Stealth & Air Ducts)
  // =========================================================================
  4: (() => {
    const size = 30;
    const grid = createEmptyGrid(size);

    const layout: SectorSideScrollerLayout = {
      widthUnits: 30,
      theme: 'OFFICE_VAULT',
      weather: 'NONE',
      description: 'Corporate executive offices and server bank. Automated ceiling turrets, executive desk cover, and air-duct bypasses.',
      rooftopStart: 3,
      rooftopEnd: 16,
      alleyStart: 15,
      alleyEnd: 27,
      ladders: [
        { id: 'vent-shaft-ascent', x: 4, topBand: 'ROOFTOP', bottomBand: 'STREET' },
        { id: 'vent-shaft-descent', x: 15, topBand: 'ROOFTOP', bottomBand: 'STREET' }
      ],
      ramps: [
        { id: 'sub-basement-ramp-down', startX: 16, endX: 18, direction: 'DOWN_TO_ALLEY' },
        { id: 'sub-basement-ramp-up', startX: 25, endX: 27, direction: 'UP_TO_STREET' }
      ],
      gaps: [
        { id: 'server-cooling-pit', startX: 9, endX: 12, band: 'STREET' }
      ],
      clutter: [
        { id: 'exec-desk-1', x: 2, band: 'STREET', type: 'DESK' },
        { id: 'server-rack-vault-1', x: 7, band: 'ROOFTOP', type: 'SERVER_RACK' },
        { id: 'server-rack-vault-2', x: 20, band: 'ALLEY', type: 'SERVER_RACK' }
      ],
      features: [
        { id: 'air-duct-bypass-1', type: 'AIR_DUCT', x: 10, y: 0, band: 'ROOFTOP', state: 'ACTIVE' }
      ]
    };

    const enemies: EnemyNPC[] = [
      {
        id: 'vault-ceiling-turret',
        type: 'TURRET',
        x: 18,
        y: 2,
        band: 'ALLEY',
        direction: 'DOWN',
        facing: 'RIGHT',
        turretAngle: -25,
        turretSweepDir: 1,
        state: 'PATROL',
        visionRange: 6.5,
        visionAngle: 45,
        stunTurns: 0,
      },
      {
        id: 'neuro-executive-guard',
        type: 'POLICE',
        x: 10,
        y: 0,
        band: 'ROOFTOP',
        direction: 'LEFT',
        facing: 'LEFT',
        minX: 6,
        maxX: 14,
        state: 'PATROL',
        visionRange: 4.5,
        visionAngle: 60,
        stunTurns: 0,
      },
      {
        id: 'office-patrol-drone',
        type: 'DRONE',
        x: 23,
        y: 1,
        band: 'STREET',
        direction: 'RIGHT',
        facing: 'RIGHT',
        minX: 20,
        maxX: 26,
        state: 'PATROL',
        visionRange: 3.5,
        visionAngle: 75,
        stunTurns: 0,
      }
    ];

    const gates: SecurityGate[] = [
      {
        id: 'vault-laser-barrier-beta',
        x: 14,
        y: 1,
        band: 'STREET',
        requiredPass: 'BETA_PASS',
        isUnlocked: false,
      }
    ];

    const passPickups: PassPickup[] = [
      {
        id: 'beta-vault-keycard',
        x: 11,
        y: 0,
        band: 'ROOFTOP',
        passType: 'BETA_PASS',
        collected: false,
      }
    ];

    const terminals: DataTerminal[] = [
      {
        id: 'master-server-terminal',
        x: 23,
        y: 2,
        band: 'ALLEY',
        isHacked: false,
        hackProgress: 0,
        energyReward: 45,
        dataPointsReward: 120,
      }
    ];

    return {
      sectorId: 4,
      name: 'Neuro-Corp Executive Vaults',
      gridSize: size,
      timeLimit: 40,
      basePoints: 420,
      tileMapJson: grid,
      layoutJson: layout,
      enemySpawnsJson: enemies,
      gatesJson: gates,
      terminalsJson: terminals,
      passPickupsJson: passPickups,
      extractionPointJson: { x: 29, y: 1 },
      jevSpawnJson: { x: 0.5, y: 1 },
    };
  })(),

  // =========================================================================
  // SECTOR 05: The Citadel Glitch (Matrix Reality Breakdown)
  // =========================================================================
  5: (() => {
    const size = 32;
    const grid = createEmptyGrid(size);

    const layout: SectorSideScrollerLayout = {
      widthUnits: 32,
      theme: 'CITADEL_GLITCH',
      weather: 'CODE_RAIN',
      description: 'Reality breakdown at the Matrix core. Dissolving floating digital blocks, relentless Agent Hunter pursuit, and Extraction Glitch.',
      rooftopStart: 3,
      rooftopEnd: 19,
      alleyStart: 18,
      alleyEnd: 29,
      ladders: [
        { id: 'glitch-beam-ascent', x: 4, topBand: 'ROOFTOP', bottomBand: 'STREET' },
        { id: 'glitch-beam-descent', x: 18, topBand: 'ROOFTOP', bottomBand: 'STREET' }
      ],
      ramps: [
        { id: 'code-void-ramp-down', startX: 19, endX: 21, direction: 'DOWN_TO_ALLEY' },
        { id: 'code-void-ramp-up', startX: 27, endX: 29, direction: 'UP_TO_STREET' }
      ],
      gaps: [
        { id: 'dissolved-code-void-1', startX: 8, endX: 11, band: 'STREET' },
        { id: 'dissolved-code-void-2', startX: 14, endX: 17, band: 'STREET' }
      ],
      clutter: [
        { id: 'matrix-data-cube-1', x: 2, band: 'STREET', type: 'CRATE' },
        { id: 'matrix-data-cube-2', x: 10, band: 'ROOFTOP', type: 'BARRELS' },
        { id: 'matrix-data-cube-3', x: 24, band: 'ALLEY', type: 'CRATE' }
      ]
    };

    const enemies: EnemyNPC[] = [
      {
        id: 'agent-hunter-prime',
        type: 'AGENT_HUNTER',
        x: 0,
        y: 1,
        band: 'STREET',
        direction: 'RIGHT',
        facing: 'RIGHT',
        state: 'HUNT',
        visionRange: 14,
        visionAngle: 120,
        stunTurns: 0,
      },
      {
        id: 'citadel-core-turret',
        type: 'TURRET',
        x: 21,
        y: 2,
        band: 'ALLEY',
        direction: 'DOWN',
        facing: 'RIGHT',
        turretAngle: -35,
        turretSweepDir: 1,
        state: 'PATROL',
        visionRange: 7.5,
        visionAngle: 50,
        stunTurns: 0,
      },
      {
        id: 'citadel-aerial-scanner',
        type: 'DRONE',
        x: 9.5,
        y: 1,
        band: 'STREET',
        direction: 'RIGHT',
        facing: 'RIGHT',
        minX: 8,
        maxX: 12,
        state: 'PATROL',
        visionRange: 4.5,
        visionAngle: 80,
        stunTurns: 0,
      },
      {
        id: 'citadel-matrix-enforcer',
        type: 'POLICE',
        x: 13,
        y: 0,
        band: 'ROOFTOP',
        direction: 'LEFT',
        facing: 'LEFT',
        minX: 7,
        maxX: 17,
        state: 'PATROL',
        visionRange: 5,
        visionAngle: 60,
        stunTurns: 0,
      }
    ];

    const gates: SecurityGate[] = [
      {
        id: 'master-firewall-gate',
        x: 17,
        y: 1,
        band: 'STREET',
        requiredPass: 'MASTER_PASS',
        isUnlocked: false,
      }
    ];

    const passPickups: PassPickup[] = [
      {
        id: 'master-override-key',
        x: 12,
        y: 0,
        band: 'ROOFTOP',
        passType: 'MASTER_PASS',
        collected: false,
      }
    ];

    const terminals: DataTerminal[] = [
      {
        id: 'matrix-core-mainframe',
        x: 25,
        y: 2,
        band: 'ALLEY',
        isHacked: false,
        hackProgress: 0,
        energyReward: 60,
        dataPointsReward: 200,
      }
    ];

    return {
      sectorId: 5,
      name: 'The Citadel Glitch (Matrix Core)',
      gridSize: size,
      timeLimit: 35,
      basePoints: 500,
      tileMapJson: grid,
      layoutJson: layout,
      enemySpawnsJson: enemies,
      gatesJson: gates,
      terminalsJson: terminals,
      passPickupsJson: passPickups,
      extractionPointJson: { x: 31, y: 1 },
      jevSpawnJson: { x: 0.5, y: 1 },
    };
  })(),
};
