import { 
  SectorState, 
  JevStats, 
  JevStateSnapshot, 
  JevEvaluationResponse, 
  Direction,
  Position,
  EnemyNPC,
  HeightBand
} from '@escape-the-matrix/shared-types';
import { SECTOR_DEFINITIONS } from '../maps/sectors.js';
import { evaluateJevState } from '../services/jev/evaluator.js';

export function initSectorState(sectorId: number, stats: JevStats): SectorState {
  const def = SECTOR_DEFINITIONS[sectorId] || SECTOR_DEFINITIONS[1];

  const maxHp = 3 + Math.floor((stats.armorShield - 1) / 3);
  const maxEnergy = 100 + (stats.energyReactor - 1) * 10;

  const jev = {
    id: 'jev-agent',
    x: def.jevSpawnJson.x || 0.5,
    y: 1, // 0 = rooftop, 1 = street, 2 = alley
    band: 'STREET' as HeightBand,
    facing: 'RIGHT' as const,
    direction: 'RIGHT' as Direction,
    hp: maxHp,
    maxHp,
    energy: maxEnergy,
    maxEnergy,
    status: 'IDLE' as const,
    keycards: [],
    noiseRadius: Math.max(1, 4 - Math.floor(stats.stealthMatrix / 3)),
    consecutiveAlertTurns: 0,
    targetFocus: 'EXTRACTION_DOOR',
    jumpProgress: 0,
    climbProgress: 0,
    rampProgress: 0,
  };

  // Clone enemies, gates, terminals, pass pickups
  const enemies: EnemyNPC[] = def.enemySpawnsJson.map((e) => ({
    ...e,
    facing: e.facing || 'RIGHT',
    turretAngle: e.turretAngle !== undefined ? e.turretAngle : -20,
    turretSweepDir: e.turretSweepDir || 1,
  }));
  const gates = def.gatesJson.map((g) => ({ ...g }));
  const terminals = def.terminalsJson.map((t) => ({ ...t }));
  const passPickups = def.passPickupsJson.map((p) => ({ ...p }));

  const visibleTiles: boolean[][] = [];
  for (let y = 0; y < def.gridSize; y++) {
    visibleTiles.push(new Array(def.gridSize).fill(true));
  }

  return {
    sectorId: def.sectorId,
    name: def.name,
    theme: def.layoutJson?.theme || 'SLUMS',
    weather: def.layoutJson?.weather || 'NONE',
    gridSize: def.gridSize,
    timeLimit: def.timeLimit,
    timeRemaining: def.timeLimit,
    matrixAlert: 0,
    isLockdown: false,
    tiles: def.tileMapJson,
    layout: def.layoutJson,
    jev,
    enemies,
    gates,
    terminals,
    passPickups,
    extractionPoint: { ...def.extractionPointJson, band: 'STREET' },
    status: 'NOT_STARTED',
    ticksElapsed: 0,
    visibleTiles,
  };
}


export async function tickSimulation(
  state: SectorState,
  stats: JevStats,
  runId: string
): Promise<{ state: SectorState; evaluation: JevEvaluationResponse }> {
  if (state.status === 'SUCCESS' || state.status === 'FAILED_HP' || state.status === 'FAILED_TIME') {
    return {
      state,
      evaluation: {
        detectionRisk: 0,
        recommendedAction: 'WAIT',
        tacticalThought: `Sector simulation ended with status: ${state.status}`,
        targetFocus: 'EXTRACTION_DOOR',
      },
    };
  }

  state.status = 'RUNNING';
  state.ticksElapsed += 1;

  // 1. Time decrement
  state.timeRemaining = Math.max(0, state.timeRemaining - 1);
  if (state.timeRemaining <= 0) {
    state.status = 'FAILED_TIME';
    state.jev.status = 'TERMINATED';
  }

  // 2. Passive energy recovery (boosted by energyReactor)
  const energyGain = 2 + Math.floor(stats.energyReactor / 2);
  state.jev.energy = Math.min(state.jev.maxEnergy, state.jev.energy + energyGain);

  // 3. Prepare AI State Snapshot
  const enemySnapshots = state.enemies.map((e) => ({
    id: e.id,
    type: e.type,
    x: e.x,
    y: e.y,
    band: e.band,
    direction: e.direction,
    state: e.state,
    distanceToJev: Math.hypot(e.x - state.jev.x, (e.y - state.jev.y) * 2),
  }));

  const nearbyHazards = [
    ...(state.layout?.gaps.map(g => ({ x: (g.startX + g.endX) / 2, y: 1, band: 'STREET' as HeightBand, type: 'GAP' })) || []),
    ...(state.layout?.ladders.map(l => ({ x: l.x, y: 1, band: 'STREET' as HeightBand, type: 'LADDER' })) || []),
    ...(state.layout?.ramps.map(r => ({ x: (r.startX + r.endX) / 2, y: 1, band: 'STREET' as HeightBand, type: r.direction === 'DOWN_TO_ALLEY' ? 'RAMP_DOWN' : 'RAMP_UP' })) || []),
    ...state.gates.filter((g) => !g.isUnlocked).map((g) => ({ x: g.x, y: g.y, band: g.band, type: 'GATE' })),
    ...state.terminals.filter((t) => !t.isHacked).map((t) => ({ x: t.x, y: t.y, band: t.band, type: 'TERMINAL' })),
  ];

  const snapshot: JevStateSnapshot = {
    sectorId: state.sectorId,
    jevPosition: { x: state.jev.x, y: state.jev.y },
    jevBand: state.jev.band,
    jevHealth: state.jev.hp,
    jevEnergy: state.jev.energy,
    keycards: state.jev.keycards,
    timeRemaining: state.timeRemaining,
    matrixAlert: state.matrixAlert,
    directives: stats.behaviorDirective,
    enemies: enemySnapshots,
    nearbyHazards,
    targetGlitch: { x: state.extractionPoint.x, y: state.extractionPoint.y },
    targetFocus: state.jev.targetFocus,
  };

  // 4. Query Jev Evaluator (with Token & Cost Metrics)
  const evaluation = await evaluateJevState(snapshot);
  state.jev.targetFocus = evaluation.targetFocus;

  // 5. Execute Traversal Action
  const speedMult = 1 + (stats.processingHz - 1) * 0.08;
  const currentAction = evaluation.recommendedAction;

  switch (currentAction) {
    case 'TAKE_COVER': {
      state.jev.status = 'HIDING_IN_COVER';
      state.jev.isHidingInCover = true;
      // Jev crouches safely behind cover; does not advance into the approaching patrol
      break;
    }

    case 'USE_EMP': {
      if (state.jev.energy >= 40) {
        state.jev.energy -= 40;
        for (const enemy of state.enemies) {
          const dist = Math.hypot(enemy.x - state.jev.x, (enemy.y - state.jev.y) * 2);
          if (dist <= 6) {
            enemy.state = 'STUNNED';
            enemy.stunTurns = 3;
            enemy.speechBubble = null;
          }
        }
      }
      break;
    }


    case 'JUMP_GAP': {
      // Leap across gap hazard
      state.jev.status = 'JUMPING';
      state.jev.facing = 'RIGHT';
      const gap = state.layout?.gaps.find(g => Math.abs(g.startX - state.jev.x) <= 2.5);
      if (gap) {
        state.jev.x = gap.endX + 0.6;
      } else {
        state.jev.x += 2.0 * speedMult;
      }
      break;
    }

    case 'CLIMB_LADDER': {
      // Climb up ladder onto Rooftop
      const ladder = state.layout?.ladders.find(l => Math.abs(l.x - state.jev.x) <= 1.8);
      if (ladder) {
        state.jev.status = 'CLIMBING';
        state.jev.band = 'ROOFTOP';
        state.jev.y = 0;
        state.jev.x = ladder.x + 0.8;
      } else {
        state.jev.x += 1.0 * speedMult;
      }
      break;
    }

    case 'DESCEND_RAMP': {
      // Descend into sunken Service Alley
      const ramp = state.layout?.ramps.find(r => r.direction === 'DOWN_TO_ALLEY' && Math.abs(r.startX - state.jev.x) <= 2.2);
      if (ramp) {
        state.jev.status = 'DESCENDING';
        state.jev.band = 'ALLEY';
        state.jev.y = 2;
        state.jev.x = ramp.endX + 0.8;
      } else {
        state.jev.x += 1.0 * speedMult;
      }
      break;
    }

    case 'ASCEND_RAMP': {
      // Ascend back to Street Level
      const ramp = state.layout?.ramps.find(r => r.direction === 'UP_TO_STREET' && Math.abs(r.startX - state.jev.x) <= 2.2);
      if (ramp) {
        state.jev.status = 'RUNNING';
        state.jev.band = 'STREET';
        state.jev.y = 1;
        state.jev.x = ramp.endX + 0.8;
      } else {
        state.jev.x += 1.0 * speedMult;
      }
      break;
    }

    case 'HACK_GATE': {
      const gate = state.gates.find(g => !g.isUnlocked && Math.abs(g.x - state.jev.x) <= 1.5 && g.band === state.jev.band);
      if (gate) {
        state.jev.status = 'HACKING';
        if (state.jev.keycards.includes(gate.requiredPass)) {
          gate.isUnlocked = true;
          state.jev.x = gate.x + 1.0;
        } else {
          // Bypass hack progress
          const bypassSpeed = 35 + (stats.hackBypass - 1) * 15;
          if (bypassSpeed >= 50) {
            gate.isUnlocked = true;
            state.jev.x = gate.x + 1.0;
          }
        }
      } else {
        state.jev.x += 0.8 * speedMult;
      }
      break;
    }

    case 'HACK_TERMINAL': {
      const terminal = state.terminals.find(t => !t.isHacked && Math.abs(t.x - state.jev.x) <= 2.0 && t.band === state.jev.band);
      if (terminal) {
        state.jev.status = 'HACKING';
        terminal.isHacked = true;
        state.jev.energy = Math.min(state.jev.maxEnergy, state.jev.energy + terminal.energyReward);
      } else {
        state.jev.x += 0.8 * speedMult;
      }
      break;
    }

    case 'MOVE_SPRINT': {
      state.jev.status = 'RUNNING';
      state.jev.facing = 'RIGHT';
      // Check if blocked by locked gate
      const gateAhead = state.gates.find(g => !g.isUnlocked && g.band === state.jev.band && g.x > state.jev.x && g.x - state.jev.x <= 1.2);
      if (!gateAhead) {
        state.jev.x += 1.4 * speedMult;
      }
      break;
    }

    case 'MOVE_STEALTH':
    default: {
      state.jev.status = 'RUNNING';
      state.jev.facing = 'RIGHT';
      const gateAhead = state.gates.find(g => !g.isUnlocked && g.band === state.jev.band && g.x > state.jev.x && g.x - state.jev.x <= 1.2);
      if (!gateAhead) {
        state.jev.x += 0.9 * speedMult;
      }
      break;
    }
  }

  // 6. Automatic Pass Keycard Collection
  for (const pass of state.passPickups) {
    if (!pass.collected && pass.band === state.jev.band && Math.abs(pass.x - state.jev.x) <= 1.2) {
      pass.collected = true;
      if (!state.jev.keycards.includes(pass.passType)) {
        state.jev.keycards.push(pass.passType);
      }
    }
  }

  // If Jev was on rooftop and reaches rooftop end, climb down to street
  if (state.jev.band === 'ROOFTOP' && state.layout && state.jev.x >= state.layout.rooftopEnd) {
    state.jev.band = 'STREET';
    state.jev.y = 1;
    state.jev.status = 'DESCENDING';
  }

  // 7. Enemy AI & Patrol Cycle Simulation
  for (const enemy of state.enemies) {
    if (enemy.stunTurns > 0) {
      enemy.stunTurns -= 1;
      if (enemy.stunTurns === 0) enemy.state = 'PATROL';
      continue;
    }

    switch (enemy.type) {
      case 'DRONE': {
        // Horizontal hovering patrol
        const minX = enemy.minX || (enemy.x - 2);
        const maxX = enemy.maxX || (enemy.x + 2);
        const droneSpeed = 0.5;

        if (enemy.facing === 'RIGHT') {
          enemy.x += droneSpeed;
          if (enemy.x >= maxX) enemy.facing = 'LEFT';
        } else {
          enemy.x -= droneSpeed;
          if (enemy.x <= minX) enemy.facing = 'RIGHT';
        }
        break;
      }

      case 'POLICE': {
        // Horizontal street or rooftop walking patrol
        const minX = enemy.minX || (enemy.x - 3);
        const maxX = enemy.maxX || (enemy.x + 3);
        const patrolSpeed = 0.4;

        if (enemy.facing === 'RIGHT') {
          enemy.x += patrolSpeed;
          if (enemy.x >= maxX) enemy.facing = 'LEFT';
        } else {
          enemy.x -= patrolSpeed;
          if (enemy.x <= minX) enemy.facing = 'RIGHT';
        }
        break;
      }

      case 'TURRET': {
        // Wall-mounted sweeping vertical arc
        const sweepSpeed = 4;
        const currentAngle = enemy.turretAngle || 0;
        const sweepDir = enemy.turretSweepDir || 1;

        let nextAngle = currentAngle + sweepDir * sweepSpeed;
        if (nextAngle >= 40) {
          nextAngle = 40;
          enemy.turretSweepDir = -1;
        } else if (nextAngle <= -40) {
          nextAngle = -40;
          enemy.turretSweepDir = 1;
        }
        enemy.turretAngle = nextAngle;
        break;
      }

      case 'AGENT_HUNTER': {
        // Relentless A* style pursuit along X
        const hunterSpeed = 1.1;
        if (enemy.x < state.jev.x) {
          enemy.x += hunterSpeed;
          enemy.facing = 'RIGHT';
        } else {
          enemy.x -= hunterSpeed;
          enemy.facing = 'LEFT';
        }
        enemy.band = state.jev.band;
        enemy.y = state.jev.y;
        break;
      }
    }
  }

  // 8. Detection & Alert Recalculation
  let spottedThisTick = false;
  if (!state.jev.isHidingInCover) {
    for (const enemy of state.enemies) {
      if (enemy.stunTurns > 0) continue;

      if (enemy.type === 'DRONE') {
        if (Math.abs(enemy.x - state.jev.x) <= 2.2) {
          spottedThisTick = true;
          enemy.speechBubble = '!';
        } else {
          enemy.speechBubble = enemy.speechBubble === '!' ? '?' : null;
        }
      } else if (enemy.type === 'TURRET') {
        if (state.jev.band === 'ALLEY' && Math.abs(enemy.x - state.jev.x) <= 4.0) {
          spottedThisTick = true;
          enemy.speechBubble = '!';
        } else {
          enemy.speechBubble = null;
        }
      } else if (enemy.type === 'POLICE') {
        if (enemy.band === state.jev.band) {
          const inFront = enemy.facing === 'RIGHT' ? (state.jev.x >= enemy.x && state.jev.x - enemy.x <= enemy.visionRange) : (state.jev.x <= enemy.x && enemy.x - state.jev.x <= enemy.visionRange);
          if (inFront) {
            spottedThisTick = true;
            enemy.speechBubble = '!';
          } else {
            enemy.speechBubble = enemy.speechBubble === '!' ? '?' : null;
          }
        }
      } else if (enemy.type === 'AGENT_HUNTER') {
        if (Math.abs(enemy.x - state.jev.x) <= 5.0) {
          spottedThisTick = true;
          enemy.speechBubble = '!';
        }
      }
    }
  } else {
    // When Jev is hiding in cover, enemies do not spot him
    for (const enemy of state.enemies) {
      if (enemy.speechBubble === '!') enemy.speechBubble = '?';
      else enemy.speechBubble = null;
    }
  }

  if (spottedThisTick) {
    const alertIncrease = Math.max(5, Math.round(18 * (1 - (stats.stealthMatrix - 1) * 0.07)));
    state.matrixAlert = Math.min(100, state.matrixAlert + alertIncrease);
  } else {
    state.matrixAlert = Math.max(0, state.matrixAlert - 2);
  }


  // 9. Alert Lockdown Trigger
  if (state.matrixAlert >= 100 && !state.isLockdown) {
    state.isLockdown = true;
    if (!state.enemies.some(e => e.type === 'AGENT_HUNTER')) {
      state.enemies.push({
        id: 'lockdown-hunter',
        type: 'AGENT_HUNTER',
        x: Math.max(0, state.jev.x - 6),
        y: state.jev.y,
        band: state.jev.band,
        direction: 'RIGHT',
        facing: 'RIGHT',
        state: 'HUNT',
        visionRange: 8,
        visionAngle: 90,
        stunTurns: 0,
      });
    }
  }

  // 10. Damage Resolution (Enemy proximity collision)
  for (const enemy of state.enemies) {
    if (enemy.stunTurns === 0 && enemy.band === state.jev.band && Math.abs(enemy.x - state.jev.x) <= 0.8) {
      const damage = Math.max(1, 1 - Math.floor(stats.armorShield / 8));
      state.jev.hp = Math.max(0, state.jev.hp - damage);
      if (state.jev.hp <= 0) {
        state.status = 'FAILED_HP';
        state.jev.status = 'TERMINATED';
      }
    }
  }

  // 11. Extraction Glitch Door Success Condition
  if (state.jev.x >= state.extractionPoint.x - 0.6) {
    state.status = 'SUCCESS';
    state.jev.status = 'EXTRACTED';
  }

  return { state, evaluation };
}

export function executeEmergencyOverride(
  state: SectorState,
  overrideType: 'OVERDRIVE_EMP' | 'EMERGENCY_REROUTE'
): { success: boolean; message: string } {
  if (overrideType === 'OVERDRIVE_EMP') {
    if (state.jev.energy < 40) {
      return { success: false, message: 'Insufficient energy for Overdrive EMP (Requires 40).' };
    }
    state.jev.energy -= 40;
    for (const enemy of state.enemies) {
      enemy.state = 'STUNNED';
      enemy.stunTurns = 4;
    }
    return { success: true, message: 'Overdrive EMP Discharged! All sector hostiles stunned.' };
  } else if (overrideType === 'EMERGENCY_REROUTE') {
    if (state.jev.energy < 20) {
      return { success: false, message: 'Insufficient energy for Emergency Cloak (Requires 20).' };
    }
    state.jev.energy -= 20;
    state.matrixAlert = Math.max(0, state.matrixAlert - 30);
    return { success: true, message: 'Emergency Cloak activated. Alert reduced by 30%.' };
  }

  return { success: false, message: 'Unknown override directive.' };
}
