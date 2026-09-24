import { 
  SectorState, 
  JevStats, 
  JevStateSnapshot, 
  JevEvaluationResponse, 
  Direction,
  Position,
  EnemyNPC
} from '@escape-the-matrix/shared-types';
import { SECTOR_DEFINITIONS } from '../maps/sectors.js';
import { findPath } from './pathfinding.js';
import { euclideanDistance } from './grid.js';
import { calculateDetectionRisk, getEnemyVisionTiles } from './vision.js';
import { evaluateJevState } from '../services/jev/evaluator.js';
import { sessionStore } from '../services/game/session-store.js';

export function initSectorState(sectorId: number, stats: JevStats): SectorState {
  const def = SECTOR_DEFINITIONS[sectorId] || SECTOR_DEFINITIONS[1];

  const maxHp = 3 + Math.floor((stats.armorShield - 1) / 3);
  const maxEnergy = 100 + (stats.energyReactor - 1) * 10;

  const jev = {
    id: 'jev-agent',
    x: def.jevSpawnJson.x,
    y: def.jevSpawnJson.y,
    direction: 'RIGHT' as Direction,
    hp: maxHp,
    maxHp,
    energy: maxEnergy,
    maxEnergy,
    status: 'IDLE' as const,
    keycards: [],
    noiseRadius: Math.max(1, 4 - Math.floor(stats.stealthMatrix / 3)),
    consecutiveAlertTurns: 0,
  };

  // Deep clone tiles, enemies, gates, terminals, pass pickups
  const tiles = def.tileMapJson.map((row) => [...row]);
  const enemies: EnemyNPC[] = def.enemySpawnsJson.map((e) => ({
    ...e,
    patrolPath: e.patrolPath ? [...e.patrolPath] : undefined,
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
    gridSize: def.gridSize,
    timeLimit: def.timeLimit,
    timeRemaining: def.timeLimit,
    matrixAlert: 0,
    isLockdown: false,
    tiles,
    jev,
    enemies,
    gates,
    terminals,
    passPickups,
    extractionPoint: { ...def.extractionPointJson },
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
      },
    };
  }

  state.status = 'RUNNING';
  state.ticksElapsed += 1;

  // 1. Time decrement (1s per tick)
  state.timeRemaining = Math.max(0, state.timeRemaining - 1);
  if (state.timeRemaining <= 0) {
    state.status = 'FAILED_TIME';
    state.jev.status = 'TERMINATED';
  }

  // 2. Passive energy recovery (boosted by energyReactor)
  const energyGain = 1 + Math.floor(stats.energyReactor / 2);
  state.jev.energy = Math.min(state.jev.maxEnergy, state.jev.energy + energyGain);

  // 3. Prepare AI State Snapshot
  const enemySnapshots = state.enemies.map((e) => ({
    id: e.id,
    type: e.type,
    x: e.x,
    y: e.y,
    direction: e.direction,
    state: e.state,
    distanceToJev: euclideanDistance({ x: e.x, y: e.y }, { x: state.jev.x, y: state.jev.y }),
  }));

  const nearbyHazards = [
    ...state.gates.filter((g) => !g.isUnlocked).map((g) => ({ x: g.x, y: g.y, type: 'GATE' })),
    ...state.terminals.filter((t) => !t.isHacked).map((t) => ({ x: t.x, y: t.y, type: 'TERMINAL' })),
  ];

  const snapshot: JevStateSnapshot = {
    sectorId: state.sectorId,
    jevPosition: { x: state.jev.x, y: state.jev.y },
    jevHealth: state.jev.hp,
    jevEnergy: state.jev.energy,
    keycards: [...state.jev.keycards],
    timeRemaining: state.timeRemaining,
    matrixAlert: state.matrixAlert,
    directives: stats.behaviorDirective,
    enemies: enemySnapshots,
    nearbyHazards,
    targetGlitch: { ...state.extractionPoint },
  };

  // 4. Jev Evaluator reasoning
  const evaluation = await evaluateJevState(snapshot);

  // Log telemetry in session store
  sessionStore.logTelemetry({
    runId,
    tickNumber: state.ticksElapsed,
    detectionRisk: evaluation.detectionRisk,
    actionExecuted: evaluation.recommendedAction,
    tacticalThought: evaluation.tacticalThought,
  });

  // 5. Jev Action Resolution
  let currentTarget: Position = { ...state.extractionPoint };

  // Check if there is an uncollected pass we need first
  const neededGate = state.gates.find(g => !g.isUnlocked);
  if (neededGate) {
    const matchingPass = state.passPickups.find(p => !p.collected && p.passType === neededGate.requiredPass);
    if (matchingPass && !state.jev.keycards.includes(neededGate.requiredPass)) {
      currentTarget = { x: matchingPass.x, y: matchingPass.y };
    }
  } else if (stats.behaviorDirective === 'SCAVENGER') {
    const unhacked = state.terminals.find(t => !t.isHacked);
    if (unhacked) {
      currentTarget = { x: unhacked.x, y: unhacked.y };
    }
  }

  // Execute EMP ability if triggered
  if (evaluation.recommendedAction === 'USE_EMP' && state.jev.energy >= 50) {
    state.jev.energy -= 50;
    for (const enemy of state.enemies) {
      const dist = euclideanDistance({ x: enemy.x, y: enemy.y }, { x: state.jev.x, y: state.jev.y });
      if (dist <= 3.5) {
        enemy.state = 'STUNNED';
        enemy.stunTurns = 3;
      }
    }
  }

  // Check for adjacent terminal hack
  for (const term of state.terminals) {
    if (!term.isHacked) {
      const dist = euclideanDistance({ x: term.x, y: term.y }, { x: state.jev.x, y: state.jev.y });
      if (dist <= 1.5) {
        const hackPower = 50 + stats.hackBypass * 10;
        term.hackProgress = Math.min(100, term.hackProgress + hackPower);
        if (term.hackProgress >= 100) {
          term.isHacked = true;
          state.jev.energy = Math.min(state.jev.maxEnergy, state.jev.energy + term.energyReward);
        }
      }
    }
  }

  // Check for adjacent gate unlock
  for (const gate of state.gates) {
    if (!gate.isUnlocked) {
      const dist = euclideanDistance({ x: gate.x, y: gate.y }, { x: state.jev.x, y: state.jev.y });
      if (dist <= 1.5 && state.jev.keycards.includes(gate.requiredPass)) {
        gate.isUnlocked = true;
      }
    }
  }

  // Autonomous Pathfinding & Movement
  const path = findPath(
    { x: state.jev.x, y: state.jev.y },
    currentTarget,
    state.tiles,
    state.gates,
    {
      avoidVisionCones: stats.behaviorDirective !== 'SPRINT',
      avoidHazards: stats.armorShield < 5,
      enemies: state.enemies,
    }
  );

  if (path.length > 0) {
    const nextStep = path[0];
    const dx = nextStep.x - state.jev.x;
    const dy = nextStep.y - state.jev.y;

    if (dx > 0) state.jev.direction = 'RIGHT';
    else if (dx < 0) state.jev.direction = 'LEFT';
    else if (dy > 0) state.jev.direction = 'DOWN';
    else if (dy < 0) state.jev.direction = 'UP';

    state.jev.x = nextStep.x;
    state.jev.y = nextStep.y;
    state.jev.status = evaluation.recommendedAction === 'MOVE_SPRINT' ? 'RUNNING' : 'CROUCHING';
  } else {
    state.jev.status = 'IDLE';
  }

  // Check pass pickup
  for (const pass of state.passPickups) {
    if (!pass.collected && pass.x === state.jev.x && pass.y === state.jev.y) {
      pass.collected = true;
      state.jev.keycards.push(pass.passType);
    }
  }

  // Check corrupted tile hazard
  const currentTile = state.tiles[state.jev.y]?.[state.jev.x];
  if (currentTile === 'CORRUPTED_GRID') {
    state.matrixAlert = Math.min(100, state.matrixAlert + 5);
    // Armor Shield reduces hazard damage
    const hazardDamage = stats.armorShield >= 5 ? 0.5 : 1;
    state.jev.hp = Math.max(0, state.jev.hp - hazardDamage);
    if (state.jev.hp <= 0) {
      state.status = 'FAILED_HP';
      state.jev.status = 'TERMINATED';
    }
  }

  // 6. Enemies Turn
  for (const enemy of state.enemies) {
    if (enemy.stunTurns > 0) {
      enemy.stunTurns -= 1;
      if (enemy.stunTurns === 0) enemy.state = 'PATROL';
      continue;
    }

    if (enemy.type === 'TURRET') {
      // Rotate 90 degrees clockwise
      const dirs: Direction[] = ['UP', 'RIGHT', 'DOWN', 'LEFT'];
      const currentIdx = dirs.indexOf(enemy.direction);
      enemy.direction = dirs[(currentIdx + 1) % dirs.length];
    } else if (enemy.type === 'AGENT_HUNTER') {
      // A* tracking directly to Jev
      const hunterPath = findPath(
        { x: enemy.x, y: enemy.y },
        { x: state.jev.x, y: state.jev.y },
        state.tiles,
        state.gates
      );
      if (hunterPath.length > 0) {
        enemy.x = hunterPath[0].x;
        enemy.y = hunterPath[0].y;
      }
    } else if (enemy.patrolPath && enemy.patrolPath.length > 1) {
      // Standard Patrol step
      let idx = enemy.patrolIndex ?? 0;
      let forward = enemy.patrolForward ?? true;

      if (forward) {
        idx += 1;
        if (idx >= enemy.patrolPath.length) {
          idx = enemy.patrolPath.length - 2;
          forward = false;
        }
      } else {
        idx -= 1;
        if (idx < 0) {
          idx = 1;
          forward = true;
        }
      }

      enemy.patrolIndex = idx;
      enemy.patrolForward = forward;
      const nextPos = enemy.patrolPath[idx];
      if (nextPos) {
        const dx = nextPos.x - enemy.x;
        const dy = nextPos.y - enemy.y;
        if (dx > 0) enemy.direction = 'RIGHT';
        else if (dx < 0) enemy.direction = 'LEFT';
        else if (dy > 0) enemy.direction = 'DOWN';
        else if (dy < 0) enemy.direction = 'UP';

        enemy.x = nextPos.x;
        enemy.y = nextPos.y;
      }
    }
  }

  // 7. Recalculate Detection Risk & Matrix Alert
  const detectionRisk = calculateDetectionRisk(state.jev, state.enemies, state.tiles, state.gates);
  if (detectionRisk > 0.4) {
    const alertIncrease = Math.max(3, Math.round(detectionRisk * 15 * (1 - stats.stealthMatrix * 0.05)));
    state.matrixAlert = Math.min(100, state.matrixAlert + alertIncrease);
  }

  // Alert Lockdown Trigger
  if (state.matrixAlert >= 100 && !state.isLockdown) {
    state.isLockdown = true;
    // Spawn Agent Hunter if not present
    if (!state.enemies.some(e => e.type === 'AGENT_HUNTER')) {
      state.enemies.push({
        id: 'lockdown-hunter',
        type: 'AGENT_HUNTER',
        x: state.extractionPoint.x,
        y: state.extractionPoint.y,
        direction: 'LEFT',
        state: 'HUNT',
        visionRange: 6,
        visionAngle: 90,
        stunTurns: 0,
      });
    }
  }

  // Direct enemy contact damage
  for (const enemy of state.enemies) {
    if (enemy.x === state.jev.x && enemy.y === state.jev.y && enemy.stunTurns === 0) {
      state.jev.hp = Math.max(0, state.jev.hp - 1);
      if (state.jev.hp <= 0) {
        state.status = 'FAILED_HP';
        state.jev.status = 'TERMINATED';
      }
    }
  }

  // 8. Extraction Glitch Win Condition
  if (state.jev.x === state.extractionPoint.x && state.jev.y === state.extractionPoint.y) {
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
      return { success: false, message: 'Insufficient energy for Emergency Reroute (Requires 20).' };
    }
    state.jev.energy -= 20;
    state.matrixAlert = Math.max(0, state.matrixAlert - 25);
    return { success: true, message: 'Emergency Cloak activated. Alert reduced by 25%.' };
  }

  return { success: false, message: 'Unknown override directive.' };
}
