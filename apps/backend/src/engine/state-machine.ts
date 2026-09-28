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

  const maxHp = 100 + (stats.health - 1) * 20;
  const maxStamina = 100 + (stats.stamina - 1) * 20;
  const maxEnergy = 100;
  const layout = def.layoutJson ? JSON.parse(JSON.stringify(def.layoutJson)) : undefined;

  const jev = {
    id: 'jev-agent',
    x: def.jevSpawnJson.x || 0.5,
    y: 1, // 0 = rooftop, 1 = street, 2 = alley
    band: 'STREET' as HeightBand,
    facing: 'RIGHT' as const,
    direction: 'RIGHT' as Direction,
    hp: maxHp,
    maxHp,
    stamina: maxStamina,
    maxStamina,
    energy: maxEnergy,
    maxEnergy,
    status: 'IDLE' as const,
    keycards: [],
    noiseRadius: stats.behaviorDirective === 'STEALTH' ? 1 : 3,
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
    health: e.type === 'POLICE' ? 100 : 45,
    maxHealth: e.type === 'POLICE' ? 100 : 45,
    attackCooldown: 0,
    netExposure: 0,
    netCooldown: 0,
    netWarning: 0,
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
    layout,
    jev,
    enemies,
    nets: [],
    gates,
    terminals,
    passPickups,
    extractionPoint: { ...def.extractionPointJson, band: def.extractionPointJson.band ?? 'STREET' },
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
  if (state.status === 'SUCCESS' || state.status.startsWith('FAILED')) {
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
  const energyGain = 2;
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
    facing: e.facing,
    hackLevel: e.hackLevel,
    distanceToJev: Math.hypot(e.x - state.jev.x, (e.y - state.jev.y) * 2),
  }));

  const nearbyHazards = [
    ...(state.layout?.gaps.map(g => ({ x: (g.startX + g.endX) / 2, y: 1, band: 'STREET' as HeightBand, type: 'GAP' })) || []),
    ...(state.layout?.ladders.map(l => ({ x: l.x, y: state.jev.band === 'ROOFTOP' ? 0 : 1, band: state.jev.band, type: state.jev.band === 'ROOFTOP' ? 'LADDER_DOWN' : 'LADDER' })) || []),
    ...(state.layout?.clutter.filter((item) => item.type === 'CRATE' || item.type === 'DUMPSTER').map((item) => ({ x: item.x, y: item.band === 'ROOFTOP' ? 0 : item.band === 'ALLEY' ? 2 : 1, band: item.band, type: 'COVER' })) || []),
    ...(state.layout?.ramps.map(r => ({ x: (r.startX + r.endX) / 2, y: 1, band: 'STREET' as HeightBand, type: r.direction === 'DOWN_TO_ALLEY' ? 'RAMP_DOWN' : 'RAMP_UP' })) || []),
    ...state.gates.filter((g) => !g.isUnlocked).map((g) => ({ x: g.x, y: g.y, band: g.band, type: g.structureType ?? 'GATE', securityLevel: g.securityLevel ?? 1 })),
    ...state.enemies.filter((e) => e.type === 'DRONE' && e.state !== 'HACKED').map((e) => ({ x: e.x, y: e.y, band: e.band, type: 'DRONE', securityLevel: e.hackLevel ?? 1 })),
    ...(state.layout?.features?.filter((f) => f.type === 'SECURITY_CAMERA' && !f.isHacked).map((f) => ({ x: f.x, y: f.y, band: f.band, type: 'SECURITY_CAMERA', securityLevel: f.securityLevel ?? 1 })) || []),
    ...(state.layout?.healthPickups?.filter((p) => !p.isCollected).map((p) => ({ x: p.x, y: p.band === 'ROOFTOP' ? 0 : p.band === 'ALLEY' ? 2 : 1, band: p.band, type: 'HEALTH' })) || []),
  ];

  const snapshot: JevStateSnapshot = {
    sectorId: state.sectorId,
    jevPosition: { x: state.jev.x, y: state.jev.y },
    jevBand: state.jev.band,
    jevHealth: state.jev.hp,
    jevMaxHealth: state.jev.maxHp,
    jevStamina: state.jev.stamina,
    jevIntellect: stats.intellect,
    canUseLadders: !state.jev.hasExitedRooftop,
    platformStart: state.jev.band === 'ROOFTOP' ? state.layout?.rooftopStart : state.jev.band === 'ALLEY' ? state.layout?.alleyStart : 0,
    platformEnd: state.jev.band === 'ROOFTOP' ? state.layout?.rooftopEnd : state.jev.band === 'ALLEY' ? state.layout?.alleyEnd : state.layout?.widthUnits,
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

  if (state.jev.band === 'ROOFTOP' && state.layout?.ladders.length && !state.jev.ladderTargetId) {
    const midpoint = (state.layout.rooftopStart + state.layout.rooftopEnd) / 2;
    const entryIsLeft = state.jev.rooftopEntryX !== undefined && state.jev.rooftopEntryX <= midpoint;
    const oppositeSideLadders = state.jev.rooftopEntryX === undefined
      ? []
      : state.layout.ladders.filter(ladder => entryIsLeft ? ladder.x > midpoint : ladder.x < midpoint);
    const atBoundary = state.jev.x <= state.layout.rooftopStart + 0.4 || state.jev.x >= state.layout.rooftopEnd - 0.4;
    if (oppositeSideLadders.length > 0) {
      state.jev.ladderTargetId = oppositeSideLadders.reduce((farthest, ladder) =>
        Math.abs(ladder.x - state.jev.rooftopEntryX!) > Math.abs(farthest.x - state.jev.rooftopEntryX!) ? ladder : farthest
      ).id;
    } else if (atBoundary || evaluation.recommendedAction === 'DESCEND_LADDER') {
      state.jev.ladderTargetId = state.layout.ladders.reduce((nearest, ladder) =>
        Math.abs(ladder.x - state.jev.x) < Math.abs(nearest.x - state.jev.x) ? ladder : nearest
      ).id;
    }
  }

  // 5. Execute Traversal Action
  const speedMult = stats.behaviorDirective === 'AGGRESSIVE' ? 1.35 : stats.behaviorDirective === 'STEALTH' ? 0.75 : 1;
  if (evaluation.recommendedAction === 'CLIMB_LADDER' && state.jev.band === 'STREET' &&
    !state.jev.hasExitedRooftop && !state.jev.ladderTargetId) {
    const nearestLadder = state.layout?.ladders.reduce((nearest, ladder) =>
      Math.abs(ladder.x - state.jev.x) < Math.abs(nearest.x - state.jev.x) ? ladder : nearest
    );
    state.jev.ladderTargetId = nearestLadder?.id;
  }
  const currentAction = state.jev.hasExitedRooftop && state.jev.band === 'STREET' && evaluation.recommendedAction === 'CLIMB_LADDER'
    ? 'MOVE_WALK'
    : state.jev.ladderTargetId
    ? state.jev.band === 'ROOFTOP' ? 'DESCEND_LADDER' : 'CLIMB_LADDER'
    : evaluation.recommendedAction;
  if (currentAction === 'DESCEND_LADDER' && state.jev.band === 'ROOFTOP' && !state.jev.ladderTargetId) {
    const nearestLadder = state.layout?.ladders.reduce((nearest, ladder) =>
      Math.abs(ladder.x - state.jev.x) < Math.abs(nearest.x - state.jev.x) ? ladder : nearest
    );
    state.jev.ladderTargetId = nearestLadder?.id;
  }

  switch (currentAction) {
    case 'HIDE':
    case 'TAKE_COVER': {
      const cover = state.layout?.clutter.find((item) =>
        (item.type === 'CRATE' || item.type === 'DUMPSTER') && item.band === state.jev.band && Math.abs(item.x - state.jev.x) <= 1.2
      );
      if (cover) {
        state.jev.status = 'HIDING_IN_COVER';
        state.jev.isHidingInCover = true;
        state.jev.hiddenByCoverId = cover.id;
        state.jev.stamina = Math.min(state.jev.maxStamina, state.jev.stamina + 12);
      } else {
        state.jev.status = 'WALKING';
        state.jev.x += 0.5;
      }
      break;
    }

    case 'REST': {
      state.jev.status = 'RESTING';
      state.jev.stamina = Math.min(state.jev.maxStamina, state.jev.stamina + 28);
      break;
    }

    case 'KNOCKOUT': {
      const guard = state.enemies.find((enemy) => enemy.type === 'POLICE' && enemy.band === state.jev.band && Math.abs(enemy.x - state.jev.x) <= 1.5);
      const behind = guard && (guard.facing === 'RIGHT' ? state.jev.x < guard.x : state.jev.x > guard.x);
      if (guard && behind) {
        guard.health = 0;
        guard.state = 'STUNNED';
        guard.stunTurns = 999;
        guard.combatActive = false;
        guard.isKnockedOut = true;
        state.jev.status = 'KNOCKING_OUT';
      } else {
        state.jev.x += 0.4;
      }
      break;
    }

    case 'FIGHT': {
      const guard = state.enemies.find((enemy) => enemy.type === 'POLICE' && enemy.band === state.jev.band && Math.abs(enemy.x - state.jev.x) <= 1.5);
      if (guard) {
        guard.health = Math.max(0, (guard.health ?? 100) - 12 - stats.combatPower * 5);
        guard.combatActive = true;
        state.jev.status = 'FIGHTING';
        state.jev.stamina = Math.max(0, state.jev.stamina - 5);
        if (guard.health === 0) {
          guard.state = 'STUNNED';
          guard.stunTurns = 999;
          guard.combatActive = false;
          guard.isKnockedOut = true;
          state.jev.status = 'RUNNING';
        }
      }
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
      const ladder = state.layout?.ladders.find(candidate => candidate.id === state.jev.ladderTargetId) ??
        state.layout?.ladders.reduce((nearest, candidate) =>
          Math.abs(candidate.x - state.jev.x) < Math.abs(nearest.x - state.jev.x) ? candidate : nearest
        );
      if (ladder) {
        const direction = ladder.x < state.jev.x ? -1 : 1;
        if (Math.abs(ladder.x - state.jev.x) > 0.6) {
          state.jev.status = 'WALKING';
          state.jev.facing = direction < 0 ? 'LEFT' : 'RIGHT';
          state.jev.x += direction * 0.9 * speedMult;
        } else {
          state.jev.status = 'CLIMBING';
          state.jev.band = 'ROOFTOP';
          state.jev.y = 0;
          state.jev.x = ladder.x + direction * 0.25;
          state.jev.rooftopEntryX = ladder.x;
          state.jev.ladderTargetId = undefined;
        }
      } else {
        state.jev.x += 1.0 * speedMult;
      }
      break;
    }

    case 'DESCEND_LADDER': {
      const ladder = state.layout?.ladders.find(l => l.id === state.jev.ladderTargetId) ??
        state.layout?.ladders.reduce((nearest, candidate) =>
          Math.abs(candidate.x - state.jev.x) < Math.abs(nearest.x - state.jev.x) ? candidate : nearest
        );
      if (ladder && state.jev.band === 'ROOFTOP') {
        const direction = ladder.x < state.jev.x ? -1 : 1;
        if (Math.abs(ladder.x - state.jev.x) > 0.6) {
          state.jev.status = 'WALKING';
          state.jev.facing = direction < 0 ? 'LEFT' : 'RIGHT';
          state.jev.x += direction * 0.9 * speedMult;
        } else {
          state.jev.status = 'DESCENDING_LADDER';
          state.jev.band = 'STREET';
          state.jev.y = 1;
          state.jev.x = ladder.x + direction * 0.25;
          state.jev.hasExitedRooftop = true;
          state.jev.ladderTargetId = undefined;
        }
      } else {
        state.jev.x += 0.5 * speedMult;
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

    case 'HACK_GATE':
    case 'OPEN_DOOR': {
      const gate = state.gates.find(g => !g.isUnlocked && Math.abs(g.x - state.jev.x) <= 1.5 && g.band === state.jev.band);
      if (gate) {
        state.jev.status = 'HACKING';
        if (stats.intellect >= (gate.securityLevel ?? 1)) {
          gate.isUnlocked = true;
          state.jev.x = gate.x + 1.0;
        }
      } else {
        state.jev.x += 0.8 * speedMult;
      }
      break;
    }

    case 'HACK_DRONE': {
      const drone = state.enemies.find((enemy) => enemy.type === 'DRONE' && enemy.state !== 'HACKED' && enemy.band === state.jev.band && Math.abs(enemy.x - state.jev.x) <= 1.5);
      if (drone && stats.intellect >= (drone.hackLevel ?? 1)) drone.state = 'HACKED';
      break;
    }

    case 'HACK_CAMERA': {
      const camera = state.layout?.features?.find((feature) => feature.type === 'SECURITY_CAMERA' && !feature.isHacked && feature.band === state.jev.band && Math.abs(feature.x - state.jev.x) <= 1.5);
      if (camera && stats.intellect >= (camera.securityLevel ?? 1)) camera.isHacked = true;
      break;
    }

    case 'HACK_TERMINAL': {
      const terminal = state.terminals.find(t => !t.isHacked && Math.abs(t.x - state.jev.x) <= 2.0 && t.band === state.jev.band);
      if (terminal) {
        state.jev.status = 'HACKING';
        if (stats.intellect >= (terminal.securityLevel ?? 1)) {
          terminal.isHacked = true;
          const camera = terminal.hackTargetId && state.layout?.features?.find(feature => feature.id === terminal.hackTargetId);
          if (camera) camera.isHacked = true;
          state.jev.energy = Math.min(state.jev.maxEnergy, state.jev.energy + terminal.energyReward);
        }
      } else {
        state.jev.x += 0.8 * speedMult;
      }
      break;
    }

    case 'MOVE_SPRINT': {
      const sprinting = state.jev.stamina > 0;
      state.jev.status = sprinting ? 'RUNNING' : 'WALKING';
      state.jev.facing = 'RIGHT';
      state.jev.stamina = sprinting ? Math.max(0, state.jev.stamina - 20) : Math.min(state.jev.maxStamina, state.jev.stamina + 12);
      // Check if blocked by locked gate
      const gateAhead = state.gates.find(g => !g.isUnlocked && g.band === state.jev.band && g.x > state.jev.x && g.x - state.jev.x <= 1.2);
      if (!gateAhead) {
        state.jev.x += (sprinting ? 1.4 : 0.9) * speedMult;
      }
      break;
    }

    case 'MOVE_BACKWARD': {
      state.jev.status = 'WALKING';
      state.jev.facing = 'LEFT';
      state.jev.stamina = Math.min(state.jev.maxStamina, state.jev.stamina + 12);
      const gateBehind = state.gates.find(g => !g.isUnlocked && g.band === state.jev.band && g.x < state.jev.x && state.jev.x - g.x <= 1.2);
      if (!gateBehind) state.jev.x -= 0.9 * speedMult;
      break;
    }

    case 'MOVE_STEALTH':
    case 'MOVE_WALK':
    default: {
      state.jev.status = 'WALKING';
      state.jev.facing = 'RIGHT';
      state.jev.stamina = Math.min(state.jev.maxStamina, state.jev.stamina + 12);
      const gateAhead = state.gates.find(g => !g.isUnlocked && g.band === state.jev.band && g.x > state.jev.x && g.x - state.jev.x <= 1.2);
      if (!gateAhead) {
        state.jev.x += 0.9 * speedMult;
      }
      break;
    }
  }

  if (state.jev.band === 'ROOFTOP' && state.layout) {
    state.jev.x = Math.max(state.layout.rooftopStart, Math.min(state.layout.rooftopEnd, state.jev.x));
  } else if (state.jev.band === 'ALLEY' && state.layout) {
    state.jev.x = Math.max(state.layout.alleyStart, Math.min(state.layout.alleyEnd, state.jev.x));
  } else if (state.layout) {
    state.jev.x = Math.max(0, Math.min(state.layout.widthUnits - 1, state.jev.x));
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

  for (const pickup of state.layout?.healthPickups ?? []) {
    if (!pickup.isCollected && pickup.band === state.jev.band && Math.abs(pickup.x - state.jev.x) <= 0.8) {
      pickup.isCollected = true;
      state.jev.hp = Math.min(state.jev.maxHp, state.jev.hp + pickup.amount);
    }
  }

  // 7. Enemy AI & Patrol Cycle Simulation
  for (const enemy of state.enemies) {
    if (enemy.state === 'HACKED') continue;
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
  for (const camera of state.layout?.features ?? []) {
    if (camera.type !== 'SECURITY_CAMERA' || camera.isHacked || camera.minX === undefined || camera.maxX === undefined) continue;
    const direction = camera.moveDirection ?? 1;
    const nextX = camera.x + direction * (camera.moveSpeed ?? 1);
    if (nextX >= camera.maxX) {
      camera.x = camera.maxX;
      camera.moveDirection = -1;
    } else if (nextX <= camera.minX) {
      camera.x = camera.minX;
      camera.moveDirection = 1;
    } else {
      camera.x = nextX;
    }
  }

  const inSmoke = (state.layout?.features ?? []).some((feature) =>
    feature.type === 'SMOKE_CLOUD' && feature.state !== 'INACTIVE' && feature.band === state.jev.band && Math.abs(feature.x - state.jev.x) <= 1.4
  );
  if (!state.jev.isHidingInCover && !inSmoke) {
    for (const enemy of state.enemies) {
      if (enemy.stunTurns > 0 || enemy.state === 'HACKED') continue;

      if (enemy.type === 'DRONE') {
        const inRange = enemy.band === state.jev.band && Math.abs(enemy.x - state.jev.x) <= enemy.visionRange;
        if (inRange) {
          spottedThisTick = true;
          enemy.speechBubble = '!';
          enemy.netExposure = (enemy.netExposure ?? 0) + 1;
          if ((enemy.netWarning ?? 0) > 0) {
            enemy.netWarning = Math.max(0, (enemy.netWarning ?? 0) - 1);
            if (enemy.netWarning === 0) {
              state.nets ??= [];
              state.nets.push({ id: `${enemy.id}-net-${state.ticksElapsed}`, x: enemy.x, band: enemy.band, remaining: 5 });
              enemy.netCooldown = 6;
              enemy.netExposure = 0;
            }
          } else if (enemy.netExposure >= 3 && (enemy.netCooldown ?? 0) <= 0) {
            enemy.netWarning = 1;
            enemy.speechBubble = 'SCAN';
          }
        } else {
          enemy.netExposure = 0;
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

    for (const camera of state.layout?.features ?? []) {
      if (camera.type === 'SECURITY_CAMERA' && !camera.isHacked && camera.state !== 'INACTIVE' &&
        camera.band === state.jev.band && Math.abs(camera.x - state.jev.x) <= (camera.scanRange ?? 4) &&
        ((camera.moveDirection ?? 1) > 0 ? state.jev.x >= camera.x : state.jev.x <= camera.x)) {
        spottedThisTick = true;
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
    const alertIncrease = stats.behaviorDirective === 'STEALTH' ? 8 : 18;
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
    if (enemy.type !== 'POLICE') continue;
    const distance = Math.abs(enemy.x - state.jev.x);
    const inFront = enemy.facing === 'RIGHT' ? state.jev.x >= enemy.x : state.jev.x <= enemy.x;
    const canSeeJev = !state.jev.isHidingInCover && !inSmoke && enemy.stunTurns === 0 && enemy.state !== 'HACKED' &&
      enemy.band === state.jev.band && inFront && distance <= enemy.visionRange;
    enemy.attackCooldown = Math.max(0, (enemy.attackCooldown ?? 0) - 1);
    enemy.combatActive = canSeeJev && distance <= 1.15;
    if (enemy.combatActive && enemy.attackCooldown <= 0) {
      state.jev.hp = Math.max(0, state.jev.hp - 10);
      enemy.attackCooldown = 1;
      if (state.jev.hp <= 0) {
        state.status = 'FAILED_HP';
        state.jev.status = 'TERMINATED';
      }
    }
  }

  state.nets ??= [];
  state.nets = state.nets.filter((net) => {
    net.remaining -= 1;
    if (net.band === state.jev.band && Math.abs(net.x - state.jev.x) <= 0.55) {
      state.status = 'FAILED_NET';
      state.jev.status = 'CAUGHT_IN_NET';
      return true;
    }
    return net.remaining > 0;
  });

  // 11. Extraction Glitch Door Success Condition
  if (state.status.startsWith('FAILED')) return { state, evaluation };
  if (state.jev.band === (state.extractionPoint.band ?? 'STREET') && state.jev.x >= state.extractionPoint.x - 0.6) {
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
