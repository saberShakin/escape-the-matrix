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
      alleyStart: 18,
      alleyEnd: 26,
      ladders: [
        { id: 'fire-escape-ladder-1', x: 5, topBand: 'ROOFTOP', bottomBand: 'STREET' },
        { id: 'fire-escape-ladder-2', x: 14, topBand: 'ROOFTOP', bottomBand: 'STREET' }
      ],
      ramps: [
        { id: 'sub-alley-ramp-down', startX: 16, endX: 18, direction: 'DOWN_TO_ALLEY' }
      ],
      gaps: [],
      clutter: [
        { id: 'rain-alley-rooftop-cover', x: 9.5, band: 'ROOFTOP', type: 'CRATE' },
        { id: 'rain-alley-camera-cover', x: 11, band: 'STREET', type: 'CRATE' },
        { id: 'rain-alley-underground-barrels', x: 22, band: 'ALLEY', type: 'BARRELS' }
      ],
      healthPickups: [
        { id: 'rain-alley-underground-aid', x: 21, band: 'ALLEY', amount: 30, isCollected: false }
      ],
      features: [
        {
          id: 'rain-alley-security-camera',
          type: 'SECURITY_CAMERA',
          x: 7,
          y: 1,
          band: 'STREET',
          state: 'ACTIVE',
          securityLevel: 1,
          minX: 0.5,
          maxX: 15,
          moveSpeed: 1.1,
          moveDirection: 1,
          scanRange: 3.5
        }
      ]
    };

    const enemies: EnemyNPC[] = [
      {
        id: 'rain-alley-rooftop-guard',
        type: 'POLICE',
        x: 10.5,
        y: 0,
        band: 'ROOFTOP',
        direction: 'RIGHT',
        facing: 'LEFT',
        minX: 7,
        maxX: 13,
        state: 'PATROL',
        visionRange: 4,
        visionAngle: 55,
        stunTurns: 0,
        hackLevel: 1
      },
      {
        id: 'rain-alley-lower-guard-1',
        type: 'POLICE',
        x: 15.5,
        y: 1,
        band: 'STREET',
        direction: 'LEFT',
        facing: 'LEFT',
        minX: 14.5,
        maxX: 17,
        state: 'PATROL',
        visionRange: 3.5,
        visionAngle: 55,
        stunTurns: 0,
        hackLevel: 1
      },
      {
        id: 'rain-alley-lower-guard-2',
        type: 'POLICE',
        x: 17,
        y: 1,
        band: 'STREET',
        direction: 'RIGHT',
        facing: 'RIGHT',
        minX: 15,
        maxX: 18,
        state: 'PATROL',
        visionRange: 3.5,
        visionAngle: 55,
        stunTurns: 0,
        hackLevel: 1
      }
    ];

    const gates: SecurityGate[] = [];
    const terminals: DataTerminal[] = [
      {
        id: 'rain-alley-camera-terminal',
        x: 7,
        y: 0,
        band: 'ROOFTOP',
        isHacked: false,
        hackProgress: 0,
        energyReward: 0,
        dataPointsReward: 0,
        hackTargetId: 'rain-alley-security-camera',
        securityLevel: 1
      }
    ];
    const passPickups: PassPickup[] = [];

    return {
      sectorId: 1,
      name: 'Rain Alley',
      gridSize: size,
      timeLimit: 60,
      basePoints: 120,
      tileMapJson: grid,
      layoutJson: layout,
      enemySpawnsJson: enemies,
      gatesJson: gates,
      terminalsJson: terminals,
      passPickupsJson: passPickups,
      extractionPointJson: { x: 25, y: 2, band: 'ALLEY' },
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
        { id: 'skybridge-descent-2', x: 17, topBand: 'ROOFTOP', bottomBand: 'STREET' }
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
        { id: 'plaza-crate-2', x: 6.5, band: 'STREET', type: 'CRATE' },
        { id: 'executive-planter-2', x: 9, band: 'ROOFTOP', type: 'BARRELS' },
        { id: 'skybridge-crate-3', x: 13, band: 'ROOFTOP', type: 'CRATE' },
        { id: 'maintenance-crate-3', x: 20, band: 'ALLEY', type: 'CRATE' }
      ],
      healthPickups: [
        { id: 'plaza-rooftop-aid', x: 13, band: 'ROOFTOP', amount: 25, isCollected: false },
        { id: 'plaza-first-aid', x: 20, band: 'STREET', amount: 25, isCollected: false }
      ],
      features: [
        { id: 'corporate-hologram-1', type: 'HOLOGRAM', x: 11, y: 0, band: 'ROOFTOP', state: 'ACTIVE' },
        { id: 'security-camera-1', type: 'SECURITY_CAMERA', x: 14, y: 1, band: 'STREET', state: 'ACTIVE', securityLevel: 2 },
        { id: 'plaza-smoke-pocket', type: 'SMOKE_CLOUD', x: 23, y: 1, band: 'STREET', state: 'ACTIVE' }
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
        hackLevel: 2,
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
        hackLevel: 1,
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
        securityLevel: 1,
        structureType: 'DOOR',
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

    const terminals: DataTerminal[] = [];

    return {
      sectorId: 2,
      name: 'Skybridge',
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
        { id: 'gantry-ladder-2', x: 19, topBand: 'ROOFTOP', bottomBand: 'STREET' }
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
        { id: 'highway-cover-1', x: 12.5, band: 'STREET', type: 'CRATE' },
        { id: 'gantry-relay-box', x: 11, band: 'ROOFTOP', type: 'BARRELS' },
        { id: 'underpass-drain-pipe', x: 23, band: 'ALLEY', type: 'CRATE' }
      ],
      healthPickups: [
        { id: 'highway-first-aid-street', x: 12.5, band: 'STREET', amount: 25, isCollected: false },
        { id: 'highway-first-aid', x: 22, band: 'ALLEY', amount: 30, isCollected: false }
      ],
      features: [
        { id: 'highway-smoke-pocket', type: 'SMOKE_CLOUD', x: 12, y: 1, band: 'STREET', state: 'ACTIVE' }
      ],
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
        hackLevel: 2,
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
        hackLevel: 2,
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
        hackLevel: 2,
      }
    ];

    const gates: SecurityGate[] = [];
    const terminals: DataTerminal[] = [];
    const passPickups: PassPickup[] = [];

    return {
      sectorId: 3,
      name: 'Highway',
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
        { id: 'vent-shaft-descent', x: 16, topBand: 'ROOFTOP', bottomBand: 'STREET' }
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
        { id: 'vault-crate-1', x: 6, band: 'STREET', type: 'CRATE' },
        { id: 'server-rack-vault-1', x: 7, band: 'ROOFTOP', type: 'SERVER_RACK' },
        { id: 'vault-crate-2', x: 13, band: 'ROOFTOP', type: 'CRATE' },
        { id: 'server-rack-vault-2', x: 20, band: 'ALLEY', type: 'SERVER_RACK' }
      ],
      healthPickups: [
        { id: 'vault-rooftop-aid', x: 10, band: 'ROOFTOP', amount: 25, isCollected: false },
        { id: 'vault-first-aid', x: 22, band: 'ALLEY', amount: 25, isCollected: false }
      ],
      features: [
        { id: 'air-duct-bypass-1', type: 'AIR_DUCT', x: 10, y: 0, band: 'ROOFTOP', state: 'ACTIVE' },
        { id: 'vault-security-camera', type: 'SECURITY_CAMERA', x: 20, y: 1, band: 'STREET', state: 'ACTIVE', securityLevel: 3 },
        { id: 'vault-smoke-pocket', type: 'SMOKE_CLOUD', x: 17, y: 2, band: 'ALLEY', state: 'ACTIVE' }
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
        hackLevel: 3,
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
        hackLevel: 3,
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
        hackLevel: 2,
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
        securityLevel: 3,
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

    const terminals: DataTerminal[] = [];

    return {
      sectorId: 4,
      name: 'Neuro-Corp',
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
        { id: 'glitch-beam-descent', x: 19, topBand: 'ROOFTOP', bottomBand: 'STREET' }
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
        { id: 'citadel-cover-1', x: 6.5, band: 'STREET', type: 'CRATE' },
        { id: 'matrix-data-cube-2', x: 10, band: 'ROOFTOP', type: 'BARRELS' },
        { id: 'citadel-cover-2', x: 15, band: 'ROOFTOP', type: 'CRATE' },
        { id: 'matrix-data-cube-3', x: 24, band: 'ALLEY', type: 'CRATE' }
      ],
      healthPickups: [
        { id: 'citadel-rooftop-aid', x: 10, band: 'ROOFTOP', amount: 25, isCollected: false },
        { id: 'citadel-first-aid', x: 24, band: 'ALLEY', amount: 35, isCollected: false }
      ],
      features: [
        { id: 'citadel-security-camera', type: 'SECURITY_CAMERA', x: 25, y: 2, band: 'ALLEY', state: 'ACTIVE', securityLevel: 4 },
        { id: 'citadel-smoke-pocket', type: 'SMOKE_CLOUD', x: 12, y: 1, band: 'STREET', state: 'ACTIVE' }
      ],
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
        hackLevel: 4,
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
        hackLevel: 3,
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
        hackLevel: 4,
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
        securityLevel: 4,
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

    const terminals: DataTerminal[] = [];

    return {
      sectorId: 5,
      name: 'Citadel',
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
