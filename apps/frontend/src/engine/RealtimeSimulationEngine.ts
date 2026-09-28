import { 
  SectorState, 
  JevStats, 
  JevStateSnapshot, 
  JevEvaluationResponse, 
  Direction, 
  Position, 
  EnemyNPC, 
  HeightBand,
  JevActionType,
  SectorTheme,
  WeatherType
} from '@escape-the-matrix/shared-types';

export interface SimulationEvents {
  onEvaluation: (evaluation: JevEvaluationResponse) => void;
  onStateUpdate: (state: SectorState) => void;
  onFinished: (status: 'SUCCESS' | 'FAILED_HP' | 'FAILED_TIME' | 'FAILED_NET', finalState: SectorState) => void;
  onSoundTrigger: (sound: 'step' | 'jump' | 'land' | 'hack' | 'alert' | 'emp' | 'victory') => void;
}

export class RealtimeSimulationEngine {
  private state: SectorState;
  private stats: JevStats;
  private runId: string;
  private events: SimulationEvents;

  private isRunning: boolean = false;
  private animFrameId: number | null = null;
  private lastTimestamp: number = 0;
  private speedMultiplier: number = 1;

  // AI Evaluation timer
  private aiEvalTimer: number = 0;
  private isEvaluating: boolean = false;
  private currentEvaluation: JevEvaluationResponse | null = null;

  // Jump physics
  private jumpProgress: number = 0;
  private jumpDuration: number = 0.65; // seconds
  private jumpStartX: number = 0;
  private jumpTargetX: number = 0;

  // Ladder climbing physics
  private climbProgress: number = 0;
  private climbDuration: number = 0.8; // seconds

  // Ramp physics
  private rampProgress: number = 0;
  private rampDuration: number = 0.6; // seconds

  // Hacking progress
  private activeHackTargetId: string | null = null;
  private hackProgress: number = 0;
  private combatHitTimer = 0;
  private activeLadderAscentX: number | null = null;
  private activeLadderDescentX: number | null = null;
  private hasExitedRooftop = false;

  constructor(
    initialState: SectorState, 
    stats: JevStats, 
    runId: string, 
    events: SimulationEvents
  ) {
    this.state = JSON.parse(JSON.stringify(initialState));
    this.stats = JSON.parse(JSON.stringify(stats));
    this.runId = runId;
    this.events = events;

    // Ensure state defaults
    this.state.jev.band = this.state.jev.band || 'STREET';
    this.state.jev.facing = 'RIGHT';
    this.state.jev.status = 'IDLE';
    this.hasExitedRooftop = this.state.jev.hasExitedRooftop ?? false;
    this.state.status = 'NOT_STARTED';
  }

  public start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.state.status = 'RUNNING';
    this.state.jev.status = 'RUNNING';
    this.lastTimestamp = performance.now();
    this.aiEvalTimer = 0.3; // Trigger initial AI evaluation soon after start
    this.loop(this.lastTimestamp);
  }

  public pause() {
    this.isRunning = false;
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    if (this.state.status === 'RUNNING') {
      this.state.jev.status = 'IDLE';
      this.events.onStateUpdate(this.getState());
    }
  }

  public setSpeed(speed: number) {
    this.speedMultiplier = Math.max(0.5, Math.min(4, speed));
  }

  public getState(): SectorState {
    return this.state;
  }

  public getEvaluation(): JevEvaluationResponse | null {
    return this.currentEvaluation;
  }

  public triggerOverride(type: 'OVERDRIVE_EMP' | 'EMERGENCY_REROUTE'): { success: boolean; message: string } {
    if (type === 'OVERDRIVE_EMP') {
      if (this.state.jev.energy < 40) {
        return { success: false, message: 'Insufficient energy for Overdrive EMP (Requires 40).' };
      }
      this.state.jev.energy -= 40;
      for (const enemy of this.state.enemies) {
        enemy.state = 'STUNNED';
        enemy.stunTurns = 5;
        enemy.speechBubble = null;
      }
      this.events.onSoundTrigger('emp');
      return { success: true, message: 'Overdrive EMP Discharged! All sector hostiles stunned.' };
    } else if (type === 'EMERGENCY_REROUTE') {
      if (this.state.jev.energy < 20) {
        return { success: false, message: 'Insufficient energy for Emergency Cloak (Requires 20).' };
      }
      this.state.jev.energy -= 20;
      this.state.matrixAlert = Math.max(0, this.state.matrixAlert - 35);
      this.state.jev.isHidingInCover = true;
      return { success: true, message: 'Emergency Cloak activated. Alert reduced by 35%.' };
    }
    return { success: false, message: 'Unknown override.' };
  }

  private loop = (timestamp: number) => {
    if (!this.isRunning) return;

    const rawDt = (timestamp - this.lastTimestamp) / 1000;
    this.lastTimestamp = timestamp;

    // Clamp dt to prevent spiral of death when tab is unfocused
    const dt = Math.min(rawDt, 0.1) * this.speedMultiplier;

    this.update(dt);
    this.events.onStateUpdate(this.getState());

    if (this.state.status === 'SUCCESS' || this.state.status.startsWith('FAILED')) {
      this.isRunning = false;
      this.events.onFinished(this.state.status as any, this.getState());
      return;
    }

    this.animFrameId = requestAnimationFrame(this.loop);
  };

  /**
   * Continuous 60 FPS Physics & Simulation Update
   */
  private update(dt: number) {
    if (dt <= 0) return;

    // 1. Lockdown Timer (Continuous countdown)
    this.state.timeRemaining = Math.max(0, this.state.timeRemaining - dt);
    if (this.state.timeRemaining <= 0) {
      this.state.status = 'FAILED_TIME';
      this.state.jev.status = 'TERMINATED';
      return;
    }

    // 2. Continuous Passive Energy Recharge
    const energyRate = 2.0;
    this.state.jev.energy = Math.min(this.state.jev.maxEnergy, this.state.jev.energy + energyRate * dt);

    // 3. Situational AI Evaluation (Asynchronous, does NOT pause 60 FPS movement)
    this.aiEvalTimer -= dt;
    if (this.aiEvalTimer <= 0 && !this.isEvaluating) {
      this.aiEvalTimer = 0.45; // Evaluate every ~450ms
      this.triggerAsyncAiEvaluation();
    }

    // 4. Jev Continuous Locomotion & Physics
    this.updateJevKinematics(dt);

    // 5. Continuous NPC Patrols & Awareness
    this.updateNpcKinematics(dt);
    this.updateCameraPatrols(dt);
    this.state.jev.hitFlash = Math.max(0, (this.state.jev.hitFlash ?? 0) - dt);
    for (const enemy of this.state.enemies) {
      enemy.hitFlash = Math.max(0, (enemy.hitFlash ?? 0) - dt);
    }

    // 6. Real-Time Vision & Detection Raycasting
    this.updateDetectionAndAlert(dt);
    this.updateDroneNets(dt);
    this.updateCombat(dt);

    if (this.state.status.startsWith('FAILED')) return;

    if (this.state.jev.hp <= 0) {
      this.state.status = 'FAILED_HP';
      this.state.jev.status = 'TERMINATED';
      return;
    }

    // 7. Check Objective & Extraction Door
    if (this.state.jev.band === (this.state.extractionPoint.band ?? 'STREET') &&
      this.state.jev.x >= this.state.extractionPoint.x - 0.4) {
      this.state.status = 'SUCCESS';
      this.state.jev.status = 'EXTRACTED';
      this.events.onSoundTrigger('victory');
    }
  }

  /**
   * Continuous Jev Kinematics, Traversal, Jumping & Cover
   */
  private updateJevKinematics(dt: number) {
    const jev = this.state.jev;
    const layout = this.state.layout;
    const roofBoundaryReached = jev.band === 'ROOFTOP' && layout &&
      (jev.x <= layout.rooftopStart + 0.15 || jev.x >= layout.rooftopEnd - 0.15);
    if (jev.band === 'ROOFTOP' && layout?.ladders.length && this.activeLadderDescentX === null) {
      const midpoint = (layout.rooftopStart + layout.rooftopEnd) / 2;
      const entryIsLeft = jev.rooftopEntryX !== undefined && jev.rooftopEntryX <= midpoint;
      const oppositeSideLadders = jev.rooftopEntryX === undefined
        ? []
        : layout.ladders.filter(ladder => entryIsLeft ? ladder.x > midpoint : ladder.x < midpoint);
      if (oppositeSideLadders.length > 0) {
        this.activeLadderDescentX = oppositeSideLadders.reduce((farthest, ladder) =>
          Math.abs(ladder.x - jev.rooftopEntryX!) > Math.abs(farthest.x - jev.rooftopEntryX!) ? ladder : farthest
        ).x;
      } else if (roofBoundaryReached || this.currentEvaluation?.recommendedAction === 'DESCEND_LADDER') {
        this.activeLadderDescentX = layout.ladders.reduce((nearest, ladder) =>
          Math.abs(ladder.x - jev.x) < Math.abs(nearest.x - jev.x) ? ladder : nearest
        ).x;
      }
    }
    if (!this.hasExitedRooftop && jev.band === 'STREET' && layout?.ladders.length && this.activeLadderAscentX === null &&
      this.currentEvaluation?.recommendedAction === 'CLIMB_LADDER') {
      this.activeLadderAscentX = layout.ladders.reduce((nearest, ladder) =>
        Math.abs(ladder.x - jev.x) < Math.abs(nearest.x - jev.x) ? ladder : nearest
      ).x;
    }
    const action = jev.band === 'ROOFTOP' && this.activeLadderDescentX !== null
      ? 'DESCEND_LADDER'
      : !this.hasExitedRooftop && jev.band === 'STREET' && this.activeLadderAscentX !== null
      ? 'CLIMB_LADDER'
      : this.hasExitedRooftop && this.currentEvaluation?.recommendedAction === 'CLIMB_LADDER'
      ? 'MOVE_WALK'
      : this.currentEvaluation?.recommendedAction;
    const canRun = jev.stamina > 0;
    const isRunning = canRun && (action === 'MOVE_SPRINT' || this.stats.behaviorDirective === 'AGGRESSIVE');
    const speed = isRunning
      ? (this.stats.behaviorDirective === 'AGGRESSIVE' ? 3.4 : 2.5)
      : 1.25;
    const ladderIntent = layout?.ladders && (
      (!this.hasExitedRooftop && action === 'CLIMB_LADDER' && jev.band === 'STREET') ||
      (action === 'DESCEND_LADDER' && jev.band === 'ROOFTOP')
    );
    const targetLadder = ladderIntent
      ? layout.ladders.find(ladder => ladder.x === this.activeLadderDescentX || ladder.x === this.activeLadderAscentX) ??
        layout.ladders.reduce((nearest, ladder) =>
          Math.abs(ladder.x - jev.x) < Math.abs(nearest.x - jev.x) ? ladder : nearest
        )
      : undefined;
    let movementDirection: -1 | 1 = action === 'MOVE_BACKWARD' ? -1 : 1;
    if (targetLadder && Math.abs(targetLadder.x - jev.x) > 0.4) {
      movementDirection = targetLadder.x < jev.x ? -1 : 1;
    }
    const movementDelta = speed * dt * movementDirection;

    if (jev.status === 'FIGHTING') return;

    if (jev.status === 'CLIMBING' || jev.status === 'DESCENDING_LADDER') {
      this.climbProgress += dt / this.climbDuration;
      jev.climbProgress = this.climbProgress;
      if (this.climbProgress >= 1) {
        jev.status = 'RUNNING';
        jev.band = jev.climbTargetBand ?? 'ROOFTOP';
        jev.y = jev.band === 'ROOFTOP' ? 0 : 1;
        if (jev.band === 'ROOFTOP' && jev.climbLadderId) {
          jev.rooftopEntryX = layout?.ladders.find(ladder => ladder.id === jev.climbLadderId)?.x;
        } else if (jev.band === 'STREET') {
          jev.hasExitedRooftop = true;
          this.hasExitedRooftop = true;
          jev.rooftopEntryX = undefined;
        }
        jev.climbProgress = 0;
        this.climbProgress = 0;
        jev.climbTargetBand = undefined;
        jev.climbLadderId = undefined;
        jev.x += (jev.traversalDirection ?? 1) * 0.25;
        jev.traversalDirection = undefined;
      }
      return;
    }

    if (action === 'REST' && !this.isEnemyVisibleToJev()) {
      jev.stamina = Math.min(jev.maxStamina, jev.stamina + 28 * dt);
      jev.status = 'RESTING';
      return;
    }

    if (action === 'WAIT') {
      jev.stamina = Math.min(jev.maxStamina, jev.stamina + 10 * dt);
      jev.status = 'IDLE';
      return;
    }

    const nearbyGuard = this.state.enemies.find(enemy =>
      enemy.type === 'POLICE' && enemy.state !== 'STUNNED' && enemy.state !== 'HACKED' &&
      enemy.band === jev.band && Math.abs(enemy.x - jev.x) <= 1.2
    );

    if (nearbyGuard && action === 'KNOCKOUT' && this.isBehindEnemy(nearbyGuard)) {
      nearbyGuard.health = 0;
      nearbyGuard.state = 'STUNNED';
      nearbyGuard.stunTurns = 999;
      nearbyGuard.combatActive = false;
      nearbyGuard.isKnockedOut = true;
      jev.status = 'KNOCKING_OUT';
      jev.activeCombatEnemyId = undefined;
      jev.isHidingInCover = false;
      return;
    }

    if (nearbyGuard && (action === 'FIGHT' || this.stats.behaviorDirective === 'AGGRESSIVE')) {
      this.startFight(nearbyGuard);
      return;
    }

    // If currently jumping across a gap hazard
    if (jev.status === 'JUMPING') {
      this.jumpProgress += dt / this.jumpDuration;
      const progress = Math.min(1, this.jumpProgress);
      jev.x = this.jumpStartX + (this.jumpTargetX - this.jumpStartX) * progress;
      jev.jumpProgress = Math.sin(progress * Math.PI); // Parabolic curve

      if (progress >= 1) {
        jev.status = 'RUNNING';
        jev.x = this.jumpTargetX;
        jev.jumpProgress = 0;
        this.jumpProgress = 0;
        this.events.onSoundTrigger('land');
      }
      return;
    }

    // If currently descending a ramp into the service alley
    if (jev.status === 'DESCENDING') {
      this.rampProgress += dt / this.rampDuration;
      jev.rampProgress = this.rampProgress;

      if (this.rampProgress >= 1.0) {
        jev.status = 'RUNNING';
        jev.band = 'ALLEY';
        jev.y = 2;
        jev.rampProgress = 0;
        this.rampProgress = 0;
        jev.x += (jev.traversalDirection ?? 1) * 0.5;
        jev.traversalDirection = undefined;
      }
      return;
    }

    // If currently hacking a gate or terminal
    if (jev.status === 'HACKING') {
      jev.stamina = Math.min(jev.maxStamina, jev.stamina + 8 * dt);
      const hackSpeed = 10 + this.stats.intellect * 6;
      this.hackProgress += hackSpeed * dt;

      if (this.hackProgress >= 100) {
        if (this.activeHackTargetId?.startsWith('term:')) {
          const termId = this.activeHackTargetId.slice(5);
          const term = this.state.terminals.find(t => t.id === termId);
          if (term) {
            term.isHacked = true;
            jev.energy = Math.min(jev.maxEnergy, jev.energy + term.energyReward);
            const camera = term.hackTargetId && this.state.layout?.features?.find(f => f.id === term.hackTargetId);
            if (camera) camera.isHacked = true;
          }
        } else if (this.activeHackTargetId?.startsWith('gate:') || this.activeHackTargetId?.startsWith('door:')) {
          const gateId = this.activeHackTargetId.slice(this.activeHackTargetId.indexOf(':') + 1);
          const gate = this.state.gates.find(g => g.id === gateId);
          if (gate) gate.isUnlocked = true;
        } else if (this.activeHackTargetId?.startsWith('drone:')) {
          const drone = this.state.enemies.find(e => e.id === this.activeHackTargetId?.slice(6));
          if (drone) {
            drone.state = 'HACKED';
            drone.netWarning = 0;
          }
        } else if (this.activeHackTargetId?.startsWith('camera:')) {
          const cameraId = this.activeHackTargetId.slice(7);
          const camera = this.state.layout?.features?.find(f => f.id === cameraId);
          if (camera) camera.isHacked = true;
        }
        this.events.onSoundTrigger('hack');
        this.hackProgress = 0;
        this.activeHackTargetId = null;
        jev.status = 'RUNNING';
      }
      return;
    }

    // Check situational obstacle interactions ahead
    // A. Launch as Jev reaches the takeoff edge, then land beyond the far edge.
    if (layout?.gaps) {
      const takeoffMargin = 0.2;
      const approachingGap = layout.gaps.find(g => {
        if (g.band !== jev.band || movementDelta === 0) return false;
        const takeoffX = movementDirection > 0 ? g.startX - takeoffMargin : g.endX + takeoffMargin;
        return movementDirection > 0
          ? jev.x <= takeoffX && jev.x + movementDelta >= takeoffX
          : jev.x >= takeoffX && jev.x + movementDelta <= takeoffX;
      });
      if (approachingGap) {
        jev.status = 'JUMPING';
        this.jumpProgress = 0;
        this.jumpStartX = movementDirection > 0
          ? approachingGap.startX - takeoffMargin
          : approachingGap.endX + takeoffMargin;
        jev.x = this.jumpStartX;
        this.jumpTargetX = movementDirection > 0
          ? approachingGap.endX + 0.4
          : approachingGap.startX - 0.4;
        jev.facing = movementDirection > 0 ? 'RIGHT' : 'LEFT';
        this.jumpDuration = Math.abs(this.jumpTargetX - this.jumpStartX) / speed;
        this.events.onSoundTrigger('jump');
        return;
      }
    }

    // B. Use the nearest ladder regardless of whether it is ahead or behind.
    if (targetLadder && this.isWithinMovementRange(targetLadder.x, 0.4, movementDelta)) {
      if (jev.band === 'STREET' && action === 'CLIMB_LADDER') {
        jev.status = 'CLIMBING';
        jev.x = targetLadder.x;
        jev.climbTargetBand = 'ROOFTOP';
        jev.climbLadderId = targetLadder.id;
        jev.traversalDirection = movementDirection;
        this.activeLadderAscentX = null;
        this.climbProgress = 0;
        return;
      }
      if (jev.band === 'ROOFTOP' && action === 'DESCEND_LADDER') {
        jev.status = 'DESCENDING_LADDER';
        jev.x = targetLadder.x;
        jev.climbTargetBand = 'STREET';
        jev.climbLadderId = targetLadder.id;
        jev.traversalDirection = movementDirection;
        this.activeLadderDescentX = null;
        this.climbProgress = 0;
        return;
      }
    }

    // C. Check Ramp Interaction (If AI decided to descend into service alley)
    if (layout?.ramps && action === 'DESCEND_RAMP') {
      const ramp = layout.ramps.find(r =>
        r.direction === 'DOWN_TO_ALLEY' &&
        jev.band === 'STREET' &&
        this.isWithinMovementRange(r.startX, 0.5, movementDelta)
      );
      if (ramp) {
        jev.status = 'DESCENDING';
        jev.x = ramp.startX;
        jev.traversalDirection = movementDirection;
        this.rampProgress = 0;
        return;
      }
    }

    // D. Check Ramp Ascent (If in alley and ramp is reached)
    if (layout?.ramps && jev.band === 'ALLEY') {
      const rampUp = layout.ramps.find(r =>
        r.direction === 'UP_TO_STREET' && this.isWithinMovementRange(r.startX, 0.5, movementDelta)
      );
      if (rampUp) {
        jev.band = 'STREET';
        jev.y = 1;
        jev.x = rampUp.endX + 0.5 * movementDirection;
        return;
      }
    }

    // E. Check Security Gate Ahead
    const lockedGateAhead = this.state.gates.find(
      g => !g.isUnlocked && g.band === jev.band && this.isWithinMovementRange(g.x, 0.55, movementDelta)
    );
    if (lockedGateAhead) {
      if (this.stats.intellect >= (lockedGateAhead.securityLevel ?? 1)) {
        jev.status = 'HACKING';
        const barrierType = lockedGateAhead.structureType === 'DOOR' ? 'door' : 'gate';
        this.activeHackTargetId = `${barrierType}:${lockedGateAhead.id}`;
        this.hackProgress = 0;
        return;
      }
      jev.targetFocus = 'INTELLECT_REQUIRED';
      jev.status = 'WALKING';
      return;
    }

    if (action === 'HACK_DRONE') {
      const drone = this.state.enemies.find(e => e.type === 'DRONE' && e.state !== 'HACKED' &&
        e.band === jev.band && Math.abs(e.x - jev.x) <= 1.5 && this.stats.intellect >= (e.hackLevel ?? 1));
      if (drone) {
        jev.status = 'HACKING';
        this.activeHackTargetId = `drone:${drone.id}`;
        this.hackProgress = 0;
        return;
      }
    }

    if (action === 'HACK_TERMINAL') {
      const terminal = this.state.terminals.find(t => !t.isHacked && t.band === jev.band &&
        Math.abs(t.x - jev.x) <= 1.5 && this.stats.intellect >= (t.securityLevel ?? 1));
      if (terminal) {
        jev.status = 'HACKING';
        this.activeHackTargetId = `term:${terminal.id}`;
        this.hackProgress = 0;
        return;
      }
    }

    if (action === 'HACK_TERMINAL') {
      const terminal = this.state.terminals.find(t => !t.isHacked && t.band === jev.band &&
        Math.abs(t.x - jev.x) <= 1.5 && this.stats.intellect >= (t.securityLevel ?? 1));
      if (terminal) {
        jev.status = 'HACKING';
        this.activeHackTargetId = `term:${terminal.id}`;
        this.hackProgress = 0;
        return;
      }
    }

    if (action === 'HACK_CAMERA') {
      const camera = layout?.features?.find(f => f.type === 'SECURITY_CAMERA' && !f.isHacked &&
        f.band === jev.band && Math.abs(f.x - jev.x) <= 1.5 && this.stats.intellect >= (f.securityLevel ?? 1));
      if (camera) {
        jev.status = 'HACKING';
        this.activeHackTargetId = `camera:${camera.id}`;
        this.hackProgress = 0;
        return;
      }
    }

    // F. Check situational cover: if a hostile can see Jev on the same platform
    const threatOnSamePlatform = this.state.enemies.find(
      e => e.type === 'POLICE' && e.band === jev.band && this.isPlayerInEnemySight(e)
    );

    if ((threatOnSamePlatform || action === 'HIDE') && this.stats.behaviorDirective !== 'AGGRESSIVE') {
      // Find nearby cover object (dumpster, crate, desk)
      const nearbyCover = layout?.clutter.find(
        c => (c.type === 'CRATE' || c.type === 'DUMPSTER') && c.band === jev.band && Math.abs(c.x - jev.x) <= 1.2
      );

      if (nearbyCover) {
        // Duck into cover and wait for patrol to pass!
        jev.status = 'HIDING_IN_COVER';
        jev.isHidingInCover = true;
        jev.hiddenByCoverId = nearbyCover.id;
        jev.stamina = Math.min(jev.maxStamina, jev.stamina + 12 * dt);
        return;
      }
    }

    // If previously hiding in cover, check if the threat has passed
    if (jev.isHidingInCover) {
      const threatStillApproaching = this.state.enemies.some(
        e => e.type === 'POLICE' && e.band === jev.band && Math.abs(e.x - jev.x) <= 2.5 && e.state !== 'STUNNED'
      );
      if (!threatStillApproaching) {
        jev.isHidingInCover = false;
        jev.hiddenByCoverId = undefined;
        jev.status = 'RUNNING';
      } else {
        jev.stamina = Math.min(jev.maxStamina, jev.stamina + 12 * dt);
        return;
      }
    }

    // H. Automatic Keycard Pickup
    for (const pass of this.state.passPickups) {
      if (!pass.collected && pass.band === jev.band && this.isWithinMovementRange(pass.x, 0.6, movementDelta)) {
        pass.collected = true;
        if (!jev.keycards.includes(pass.passType)) {
          jev.keycards.push(pass.passType);
          this.events.onSoundTrigger('hack');
        }
      }
    }

    for (const pickup of layout?.healthPickups ?? []) {
      if (!pickup.isCollected && pickup.band === jev.band && this.isWithinMovementRange(pickup.x, 0.45, movementDelta)) {
        pickup.isCollected = true;
        jev.hp = Math.min(jev.maxHp, jev.hp + pickup.amount);
      }
    }

    // Standard Smooth Horizontal Traversal
    if (isRunning) {
      jev.stamina = Math.max(0, jev.stamina - (this.stats.behaviorDirective === 'AGGRESSIVE' ? 19 : 13) * dt);
    } else {
      jev.stamina = Math.min(jev.maxStamina, jev.stamina + 12 * dt);
    }
    jev.facing = movementDirection > 0 ? 'RIGHT' : 'LEFT';
    jev.status = isRunning ? 'RUNNING' : 'WALKING';
    const bounds = this.getPlatformBounds(jev.band, layout);
    jev.x = Math.max(bounds.start, Math.min(bounds.end, jev.x + movementDelta));
  }

  private isWithinMovementRange(targetX: number, tolerance: number, deltaX: number): boolean {
    const currentX = this.state.jev.x;
    const nextX = currentX + deltaX;
    return targetX >= Math.min(currentX, nextX) - tolerance && targetX <= Math.max(currentX, nextX) + tolerance;
  }

  private getPlatformBounds(band: HeightBand, layout: SectorState['layout']): { start: number; end: number } {
    if (!layout) return { start: 0, end: this.state.gridSize - 1 };
    if (band === 'ROOFTOP') return { start: layout.rooftopStart, end: layout.rooftopEnd };
    if (band === 'ALLEY') return { start: layout.alleyStart, end: layout.alleyEnd };
    return { start: 0, end: layout.widthUnits - 1 };
  }

  /**
   * Continuous NPC Patrol Kinematics, Turning & Pursuit
   */
  private updateNpcKinematics(dt: number) {
    for (const enemy of this.state.enemies) {
      if (enemy.state === 'HACKED') {
        enemy.combatActive = false;
        continue;
      }
      if (enemy.stunTurns > 0) {
        continue;
      }

      switch (enemy.type) {
        case 'DRONE': {
          const minX = enemy.minX || (enemy.x - 2.5);
          const maxX = enemy.maxX || (enemy.x + 2.5);
          const droneSpeed = 1.6;

          if (enemy.facing === 'RIGHT') {
            enemy.x += droneSpeed * dt;
            if (enemy.x >= maxX) enemy.facing = 'LEFT';
          } else {
            enemy.x -= droneSpeed * dt;
            if (enemy.x <= minX) enemy.facing = 'RIGHT';
          }
          break;
        }

        case 'POLICE': {
          if (enemy.state === 'HUNT' && enemy.band === this.state.jev.band && this.isPlayerInEnemySight(enemy)) {
            enemy.facing = enemy.x < this.state.jev.x ? 'RIGHT' : 'LEFT';
            if (Math.abs(enemy.x - this.state.jev.x) > 0.9) {
              enemy.x += (enemy.facing === 'RIGHT' ? 1 : -1) * 1.15 * dt;
            }
            break;
          }
          const minX = enemy.minX || (enemy.x - 3);
          const maxX = enemy.maxX || (enemy.x + 3);
          const patrolSpeed = 1.3;

          if (enemy.facing === 'RIGHT') {
            enemy.x += patrolSpeed * dt;
            if (enemy.x >= maxX) enemy.facing = 'LEFT';
          } else {
            enemy.x -= patrolSpeed * dt;
            if (enemy.x <= minX) enemy.facing = 'RIGHT';
          }
          break;
        }

        case 'TURRET': {
          const sweepSpeed = 35; // degrees per second
          const sweepDir = enemy.turretSweepDir || 1;
          let angle = (enemy.turretAngle || 0) + sweepDir * sweepSpeed * dt;

          if (angle >= 40) {
            angle = 40;
            enemy.turretSweepDir = -1;
          } else if (angle <= -40) {
            angle = -40;
            enemy.turretSweepDir = 1;
          }
          enemy.turretAngle = angle;
          break;
        }

        case 'AGENT_HUNTER': {
          const hunterSpeed = 2.8;
          if (enemy.x < this.state.jev.x) {
            enemy.x += hunterSpeed * dt;
            enemy.facing = 'RIGHT';
          } else {
            enemy.x -= hunterSpeed * dt;
            enemy.facing = 'LEFT';
          }
          enemy.band = this.state.jev.band;
          enemy.y = this.state.jev.y;
          break;
        }
      }
    }

  }

  private updateCameraPatrols(dt: number) {
    for (const feature of this.state.layout?.features ?? []) {
      if (feature.type !== 'SECURITY_CAMERA' || feature.isHacked || feature.minX === undefined || feature.maxX === undefined) continue;
      const direction = feature.moveDirection ?? 1;
      const nextX = feature.x + direction * (feature.moveSpeed ?? 1) * dt;
      if (nextX >= feature.maxX) {
        feature.x = feature.maxX;
        feature.moveDirection = -1;
      } else if (nextX <= feature.minX) {
        feature.x = feature.minX;
        feature.moveDirection = 1;
      } else {
        feature.x = nextX;
      }
    }
  }

  /**
   * Continuous Vision & Detection Raycasting at 60 FPS
   */
  private updateDetectionAndAlert(dt: number) {
    let spotted = false;
    for (const enemy of this.state.enemies) {
      if (enemy.state === 'STUNNED' || enemy.state === 'HACKED') continue;
      if (this.isPlayerInEnemySight(enemy)) {
        spotted = true;
        enemy.speechBubble = '!';
        if (enemy.type === 'POLICE' || enemy.type === 'DRONE') enemy.state = 'HUNT';
      } else {
        enemy.speechBubble = enemy.netWarning && enemy.netWarning > 0 ? 'SCAN' : null;
        if (enemy.state === 'HUNT' && enemy.type !== 'AGENT_HUNTER') enemy.state = 'PATROL';
      }
    }

    for (const camera of this.state.layout?.features ?? []) {
      if (camera.type === 'SECURITY_CAMERA' && !camera.isHacked && camera.state !== 'INACTIVE' &&
        camera.band === this.state.jev.band && !this.state.jev.isHidingInCover && !this.isInSmoke() &&
        Math.abs(camera.x - this.state.jev.x) <= (camera.scanRange ?? 4) &&
        ((camera.moveDirection ?? 1) > 0 ? this.state.jev.x >= camera.x : this.state.jev.x <= camera.x)) {
        spotted = true;
      }
    }

    // Continuous Alert Meter adjustment
    if (spotted) {
      const alertRate = this.stats.behaviorDirective === 'STEALTH' ? 12 : 22;
      this.state.matrixAlert = Math.min(100, this.state.matrixAlert + alertRate * dt);
      if (Math.random() < 0.05) this.events.onSoundTrigger('alert');
    } else {
      this.state.matrixAlert = Math.max(0, this.state.matrixAlert - 3.5 * dt);
    }

  }

  private isPlayerInEnemySight(enemy: EnemyNPC): boolean {
    const jev = this.state.jev;
    if (enemy.band !== jev.band || enemy.stunTurns > 0 || enemy.state === 'HACKED') return false;
    if (jev.isHidingInCover || this.isInSmoke()) return false;

    const distance = Math.abs(enemy.x - jev.x);
    if (enemy.type === 'POLICE') {
      const inFront = enemy.facing === 'RIGHT' ? jev.x >= enemy.x : jev.x <= enemy.x;
      return inFront && distance <= enemy.visionRange;
    }
    if (enemy.type === 'DRONE' || enemy.type === 'AGENT_HUNTER') {
      return distance <= enemy.visionRange;
    }
    return enemy.type === 'TURRET' && distance <= enemy.visionRange;
  }

  private isInSmoke(): boolean {
    return (this.state.layout?.features ?? []).some(feature =>
      feature.type === 'SMOKE_CLOUD' && feature.state !== 'INACTIVE' &&
      feature.band === this.state.jev.band && Math.abs(feature.x - this.state.jev.x) <= 1.4
    );
  }

  private isEnemyVisibleToJev(): boolean {
    return this.state.enemies.some(enemy => this.isPlayerInEnemySight(enemy));
  }

  private isBehindEnemy(enemy: EnemyNPC): boolean {
    return enemy.facing === 'RIGHT' ? this.state.jev.x < enemy.x : this.state.jev.x > enemy.x;
  }

  private startFight(enemy: EnemyNPC): void {
    enemy.health ??= 80;
    enemy.maxHealth ??= 80;
    enemy.combatActive = true;
    enemy.attackCooldown ??= 0.7;
    enemy.state = 'HUNT';
    this.state.jev.status = 'FIGHTING';
    this.state.jev.activeCombatEnemyId = enemy.id;
    this.state.jev.isHidingInCover = false;
    this.state.jev.hiddenByCoverId = undefined;
    this.combatHitTimer = 0;
  }

  private applyDamageToJev(amount: number): void {
    const jev = this.state.jev;
    jev.hp = Math.max(0, jev.hp - amount);
    jev.hitFlash = 0.2;
    if (jev.hp <= 0) {
      this.state.status = 'FAILED_HP';
      jev.status = 'TERMINATED';
    }
  }

  private updateCombat(dt: number): void {
    const jev = this.state.jev;
    if (jev.status === 'FIGHTING' && jev.activeCombatEnemyId) {
      const target = this.state.enemies.find(enemy => enemy.id === jev.activeCombatEnemyId);
      if (!target || target.state === 'STUNNED' || target.state === 'HACKED') {
        jev.status = 'RUNNING';
        jev.activeCombatEnemyId = undefined;
      } else {
        this.combatHitTimer -= dt;
        if (this.combatHitTimer <= 0) {
          const damage = 12 + this.stats.combatPower * 5;
          target.health = Math.max(0, (target.health ?? 80) - damage);
          target.combatActive = true;
          target.hitFlash = 0.2;
          this.combatHitTimer = 0.72;
          if (target.health <= 0) {
            target.state = 'STUNNED';
            target.stunTurns = 999;
            target.combatActive = false;
            target.isKnockedOut = true;
            jev.status = 'RUNNING';
            jev.activeCombatEnemyId = undefined;
          }
        }
      }
    }

    for (const enemy of this.state.enemies) {
      if (enemy.type !== 'POLICE' || enemy.state === 'STUNNED' || enemy.state === 'HACKED') continue;
      const inRange = enemy.band === jev.band && Math.abs(enemy.x - jev.x) <= 1.15;
      const canAttack = inRange && this.isPlayerInEnemySight(enemy);
      if (canAttack) enemy.combatActive = true;
      else if (jev.activeCombatEnemyId !== enemy.id) enemy.combatActive = false;
      if (!enemy.combatActive) continue;
      enemy.attackCooldown = (enemy.attackCooldown ?? 0) - dt;
      if (enemy.attackCooldown <= 0 && canAttack) {
        this.applyDamageToJev(10);
        enemy.attackCooldown = 0.95;
      }
    }
  }

  private updateDroneNets(dt: number): void {
    const jev = this.state.jev;
    this.state.nets ??= [];
    for (const drone of this.state.enemies) {
      if (drone.type !== 'DRONE' || drone.state === 'HACKED' || drone.stunTurns > 0) continue;
      drone.netCooldown = Math.max(0, (drone.netCooldown ?? 0) - dt);
      const seesJev = this.isPlayerInEnemySight(drone);
      if (drone.netWarning && drone.netWarning > 0) {
        drone.netWarning = Math.max(0, drone.netWarning - dt);
        if (drone.netWarning === 0) {
          this.state.nets.push({ id: `${drone.id}-net-${Date.now()}`, x: drone.x, band: drone.band, remaining: 5 });
          drone.netCooldown = 7;
          drone.netExposure = 0;
        }
      } else if (seesJev && drone.netCooldown === 0) {
        drone.netExposure = (drone.netExposure ?? 0) + dt;
        if (drone.netExposure >= 2.4) drone.netWarning = 0.8;
      } else {
        drone.netExposure = Math.max(0, (drone.netExposure ?? 0) - dt * 1.5);
      }
    }

    this.state.nets = this.state.nets.filter(net => {
      net.remaining -= dt;
      if (net.band === jev.band && Math.abs(net.x - jev.x) <= 0.55) {
        this.state.status = 'FAILED_NET';
        jev.status = 'CAUGHT_IN_NET';
        return true;
      }
      return net.remaining > 0;
    });
  }

  /**
   * Asynchronous AI Evaluation (Non-blocking neural stream)
   */
  private async triggerAsyncAiEvaluation() {
    this.isEvaluating = true;
    try {
      const jev = this.state.jev;
      const enemySnapshots = this.state.enemies.map(e => ({
        id: e.id,
        type: e.type,
        x: e.x,
        y: e.y,
        band: e.band,
        direction: e.direction,
        state: e.state,
        facing: e.facing,
        hackLevel: e.hackLevel,
        distanceToJev: Math.hypot(e.x - jev.x, (e.y - jev.y) * 2),
      }));

      const layout = this.state.layout;
      const nearbyHazards = [
        ...(layout?.gaps.map(g => ({ x: (g.startX + g.endX) / 2, y: 1, band: 'STREET' as HeightBand, type: 'GAP' })) || []),
        ...(layout?.ladders.map(l => ({ x: l.x, y: jev.band === 'ROOFTOP' ? 0 : 1, band: jev.band, type: jev.band === 'ROOFTOP' ? 'LADDER_DOWN' : 'LADDER' })) || []),
        ...(layout?.ramps.map(r => ({ x: (r.startX + r.endX) / 2, y: 1, band: 'STREET' as HeightBand, type: r.direction === 'DOWN_TO_ALLEY' ? 'RAMP_DOWN' : 'RAMP_UP' })) || []),
        ...this.state.gates.filter(g => !g.isUnlocked).map(g => ({ x: g.x, y: g.y, band: g.band, type: g.structureType ?? 'GATE', securityLevel: g.securityLevel ?? 1 })),
        ...this.state.terminals.filter(t => !t.isHacked).map(t => ({ x: t.x, y: t.y, band: t.band, type: 'TERMINAL', securityLevel: t.securityLevel ?? 1 })),
        ...this.state.enemies.filter(e => e.type === 'DRONE' && e.state !== 'HACKED').map(e => ({ x: e.x, y: e.y, band: e.band, type: 'DRONE', securityLevel: e.hackLevel ?? 1 })),
        ...(layout?.features?.filter(f => f.type === 'SECURITY_CAMERA' && !f.isHacked).map(f => ({ x: f.x, y: f.y, band: f.band, type: 'SECURITY_CAMERA', securityLevel: f.securityLevel ?? 1 })) || []),
        ...(layout?.clutter.filter(item => item.type === 'CRATE' || item.type === 'DUMPSTER').map(item => ({ x: item.x, y: item.band === 'ROOFTOP' ? 0 : item.band === 'ALLEY' ? 2 : 1, band: item.band, type: 'COVER' })) || []),
        ...(layout?.healthPickups?.filter(p => !p.isCollected).map(p => ({ x: p.x, y: p.band === 'ROOFTOP' ? 0 : p.band === 'ALLEY' ? 2 : 1, band: p.band, type: 'HEALTH' })) || []),
      ];

      const snapshot: JevStateSnapshot = {
        sectorId: this.state.sectorId,
        jevPosition: { x: jev.x, y: jev.y },
        jevBand: jev.band,
        jevHealth: jev.hp,
        jevMaxHealth: jev.maxHp,
        jevStamina: jev.stamina,
        jevIntellect: this.stats.intellect,
        platformStart: jev.band === 'ROOFTOP' ? layout?.rooftopStart : jev.band === 'ALLEY' ? layout?.alleyStart : 0,
        platformEnd: jev.band === 'ROOFTOP' ? layout?.rooftopEnd : jev.band === 'ALLEY' ? layout?.alleyEnd : layout?.widthUnits,
        canUseLadders: !jev.hasExitedRooftop,
        rooftopEntryX: jev.rooftopEntryX,
        jevEnergy: jev.energy,
        keycards: jev.keycards,
        timeRemaining: Math.round(this.state.timeRemaining),
        matrixAlert: Math.round(this.state.matrixAlert),
        directives: this.stats.behaviorDirective,
        enemies: enemySnapshots,
        nearbyHazards,
        targetGlitch: { x: this.state.extractionPoint.x, y: this.state.extractionPoint.y },
        targetFocus: jev.targetFocus,
      };

      // Query AI evaluation endpoint
      const res = await fetch('/api/matrix-eval', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(snapshot),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          const evalResponse: JevEvaluationResponse = {
            detectionRisk: data.detectionRisk,
            recommendedAction: data.recommendedAction,
            tacticalThought: data.tacticalThought,
            targetFocus: data.targetFocus,
            metrics: data.metrics,
          };
          this.currentEvaluation = evalResponse;
          this.state.jev.targetFocus = evalResponse.targetFocus;
          this.events.onEvaluation(evalResponse);
        }
      }
    } catch {
      // Local fallback
    } finally {
      this.isEvaluating = false;
    }
  }
}
