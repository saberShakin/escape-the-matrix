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
  onFinished: (status: 'SUCCESS' | 'FAILED_HP' | 'FAILED_TIME', finalState: SectorState) => void;
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
    const energyRate = 2.0 + (this.stats.energyReactor - 1) * 0.5;
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

    // 6. Real-Time Vision & Detection Raycasting
    this.updateDetectionAndAlert(dt);

    // 7. Check Objective & Extraction Door
    if (this.state.jev.x >= this.state.extractionPoint.x - 0.4) {
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
    const baseSpeed = 2.6 * (1 + (this.stats.processingHz - 1) * 0.08); // units per second

    // If currently jumping across a gap hazard
    if (jev.status === 'JUMPING') {
      this.jumpProgress += dt / this.jumpDuration;
      jev.x = this.jumpStartX + (this.jumpTargetX - this.jumpStartX) * this.jumpProgress;
      jev.jumpProgress = Math.sin(this.jumpProgress * Math.PI); // Parabolic curve

      if (this.jumpProgress >= 1.0) {
        jev.status = 'RUNNING';
        jev.x = this.jumpTargetX;
        jev.jumpProgress = 0;
        this.jumpProgress = 0;
        this.events.onSoundTrigger('land');
      }
      return;
    }

    // If currently climbing a ladder between Street and Rooftop
    if (jev.status === 'CLIMBING') {
      this.climbProgress += dt / this.climbDuration;
      jev.climbProgress = this.climbProgress;

      if (this.climbProgress >= 1.0) {
        jev.status = 'RUNNING';
        jev.band = 'ROOFTOP';
        jev.y = 0;
        jev.climbProgress = 0;
        this.climbProgress = 0;
        jev.x += 0.5; // step off onto rooftop
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
        jev.x += 0.5;
      }
      return;
    }

    // If currently hacking a gate or terminal
    if (jev.status === 'HACKING') {
      const hackSpeed = 45 + (this.stats.hackBypass - 1) * 20; // percent per second
      this.hackProgress += hackSpeed * dt;

      if (this.hackProgress >= 100) {
        if (this.activeHackTargetId?.startsWith('term')) {
          const term = this.state.terminals.find(t => t.id === this.activeHackTargetId);
          if (term) {
            term.isHacked = true;
            jev.energy = Math.min(jev.maxEnergy, jev.energy + term.energyReward);
          }
        } else if (this.activeHackTargetId?.startsWith('gate')) {
          const gate = this.state.gates.find(g => g.id === this.activeHackTargetId);
          if (gate) gate.isUnlocked = true;
        }
        this.events.onSoundTrigger('hack');
        this.hackProgress = 0;
        this.activeHackTargetId = null;
        jev.status = 'RUNNING';
      }
      return;
    }

    // Check situational obstacle interactions ahead
    const layout = this.state.layout;

    // A. Check Gap Hazard ahead
    if (layout?.gaps) {
      const approachingGap = layout.gaps.find(
        g => g.band === jev.band && jev.x < g.startX && (g.startX - jev.x) <= 0.45
      );
      if (approachingGap) {
        // Initiate continuous leap across gap
        jev.status = 'JUMPING';
        this.jumpProgress = 0;
        this.jumpStartX = jev.x;
        this.jumpTargetX = approachingGap.endX + 0.6;
        this.events.onSoundTrigger('jump');
        return;
      }
    }

    // B. Check Ladder Interaction (If AI decided to climb to rooftop)
    if (layout?.ladders && this.currentEvaluation?.recommendedAction === 'CLIMB_LADDER') {
      const ladder = layout.ladders.find(l => Math.abs(l.x - jev.x) <= 0.4 && jev.band === 'STREET');
      if (ladder) {
        jev.status = 'CLIMBING';
        jev.x = ladder.x;
        this.climbProgress = 0;
        return;
      }
    }

    // C. Check Ramp Interaction (If AI decided to descend into service alley)
    if (layout?.ramps && this.currentEvaluation?.recommendedAction === 'DESCEND_RAMP') {
      const ramp = layout.ramps.find(r => r.direction === 'DOWN_TO_ALLEY' && Math.abs(r.startX - jev.x) <= 0.5 && jev.band === 'STREET');
      if (ramp) {
        jev.status = 'DESCENDING';
        jev.x = ramp.startX;
        this.rampProgress = 0;
        return;
      }
    }

    // D. Check Ramp Ascent (If in alley and ramp is reached)
    if (layout?.ramps && jev.band === 'ALLEY') {
      const rampUp = layout.ramps.find(r => r.direction === 'UP_TO_STREET' && Math.abs(r.startX - jev.x) <= 0.5);
      if (rampUp) {
        jev.band = 'STREET';
        jev.y = 1;
        jev.x = rampUp.endX + 0.5;
        return;
      }
    }

    // E. Check Security Gate Ahead
    const lockedGateAhead = this.state.gates.find(
      g => !g.isUnlocked && g.band === jev.band && g.x > jev.x && (g.x - jev.x) <= 0.55
    );
    if (lockedGateAhead) {
      if (jev.keycards.includes(lockedGateAhead.requiredPass)) {
        lockedGateAhead.isUnlocked = true;
        this.events.onSoundTrigger('hack');
      } else {
        // Start hacking gate
        jev.status = 'HACKING';
        this.activeHackTargetId = lockedGateAhead.id;
        this.hackProgress = 0;
        return;
      }
    }

    // F. Check Terminal Ahead
    const unhackedTerminalAhead = this.state.terminals.find(
      t => !t.isHacked && t.band === jev.band && Math.abs(t.x - jev.x) <= 0.45
    );
    if (unhackedTerminalAhead && (this.stats.behaviorDirective === 'SCAVENGER' || this.state.matrixAlert < 40)) {
      jev.status = 'HACKING';
      this.activeHackTargetId = unhackedTerminalAhead.id;
      this.hackProgress = 0;
      return;
    }

    // G. Check Situational Cover: If hostile patrol is approaching on the same platform
    const threatOnSamePlatform = this.state.enemies.find(
      e => e.band === jev.band && e.x > jev.x && (e.x - jev.x) <= 4.0 && e.facing === 'LEFT' && e.stunTurns === 0
    );

    if (threatOnSamePlatform && this.stats.behaviorDirective !== 'SPRINT') {
      // Find nearby cover object (dumpster, crate, desk)
      const nearbyCover = layout?.clutter.find(
        c => c.band === jev.band && Math.abs(c.x - jev.x) <= 1.2
      );

      if (nearbyCover) {
        // Duck into cover and wait for patrol to pass!
        jev.status = 'HIDING_IN_COVER';
        jev.isHidingInCover = true;
        return;
      }
    }

    // If previously hiding in cover, check if the threat has passed
    if (jev.isHidingInCover) {
      const threatStillApproaching = this.state.enemies.some(
        e => e.band === jev.band && e.x > jev.x && (e.x - jev.x) <= 4.0 && e.facing === 'LEFT' && e.stunTurns === 0
      );
      if (!threatStillApproaching) {
        jev.isHidingInCover = false;
        jev.status = 'RUNNING';
      } else {
        return;
      }
    }

    // H. Automatic Keycard Pickup
    for (const pass of this.state.passPickups) {
      if (!pass.collected && pass.band === jev.band && Math.abs(pass.x - jev.x) <= 0.6) {
        pass.collected = true;
        if (!jev.keycards.includes(pass.passType)) {
          jev.keycards.push(pass.passType);
          this.events.onSoundTrigger('hack');
        }
      }
    }

    // Standard Smooth Horizontal Traversal
    const speed = (this.stats.behaviorDirective === 'SPRINT' ? baseSpeed * 1.35 : baseSpeed);
    jev.facing = 'RIGHT';
    jev.status = 'RUNNING';
    jev.x += speed * dt;
  }

  /**
   * Continuous NPC Patrol Kinematics, Turning & Pursuit
   */
  private updateNpcKinematics(dt: number) {
    for (const enemy of this.state.enemies) {
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

  /**
   * Continuous Vision & Detection Raycasting at 60 FPS
   */
  private updateDetectionAndAlert(dt: number) {
    const jev = this.state.jev;
    let spotted = false;

    // If Jev is currently hiding in cover, hostiles cannot detect him!
    if (!jev.isHidingInCover) {
      for (const enemy of this.state.enemies) {
        if (enemy.stunTurns > 0) continue;

        if (enemy.type === 'DRONE') {
          // Downward scanning cone
          if (Math.abs(enemy.x - jev.x) <= 1.8) {
            spotted = true;
            enemy.speechBubble = '!';
            enemy.state = 'HUNT';
          } else {
            if (enemy.speechBubble === '!') enemy.speechBubble = null;
          }
        } else if (enemy.type === 'TURRET') {
          // Alley turret vertical sweep
          if (jev.band === 'ALLEY' && Math.abs(enemy.x - jev.x) <= 3.8) {
            spotted = true;
            enemy.speechBubble = '!';
          } else {
            enemy.speechBubble = null;
          }
        } else if (enemy.type === 'POLICE') {
          if (enemy.band === jev.band) {
            const inFront = enemy.facing === 'RIGHT' 
              ? (jev.x >= enemy.x && (jev.x - enemy.x) <= enemy.visionRange) 
              : (jev.x <= enemy.x && (enemy.x - jev.x) <= enemy.visionRange);
            if (inFront) {
              spotted = true;
              enemy.speechBubble = '!';
              enemy.state = 'HUNT';
            } else {
              enemy.speechBubble = null;
              enemy.state = 'PATROL';
            }
          }
        } else if (enemy.type === 'AGENT_HUNTER') {
          if (Math.abs(enemy.x - jev.x) <= 4.0) {
            spotted = true;
            enemy.speechBubble = '!';
          }
        }
      }
    } else {
      // In cover
      for (const enemy of this.state.enemies) {
        if (enemy.speechBubble === '!') enemy.speechBubble = '?';
      }
    }

    // Continuous Alert Meter adjustment
    if (spotted) {
      const alertRate = 22 * (1 - (this.stats.stealthMatrix - 1) * 0.07);
      this.state.matrixAlert = Math.min(100, this.state.matrixAlert + alertRate * dt);
      if (Math.random() < 0.05) this.events.onSoundTrigger('alert');
    } else {
      this.state.matrixAlert = Math.max(0, this.state.matrixAlert - 3.5 * dt);
    }

    // Direct collision damage with un-stunned enemies
    for (const enemy of this.state.enemies) {
      if (enemy.stunTurns === 0 && enemy.band === jev.band && Math.abs(enemy.x - jev.x) <= 0.6) {
        const dmg = Math.max(1, 1 - Math.floor(this.stats.armorShield / 8));
        jev.hp = Math.max(0, jev.hp - dmg);
        if (jev.hp <= 0) {
          this.state.status = 'FAILED_HP';
          jev.status = 'TERMINATED';
        }
      }
    }
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
        distanceToJev: Math.hypot(e.x - jev.x, (e.y - jev.y) * 2),
      }));

      const layout = this.state.layout;
      const nearbyHazards = [
        ...(layout?.gaps.map(g => ({ x: (g.startX + g.endX) / 2, y: 1, band: 'STREET' as HeightBand, type: 'GAP' })) || []),
        ...(layout?.ladders.map(l => ({ x: l.x, y: 1, band: 'STREET' as HeightBand, type: 'LADDER' })) || []),
        ...(layout?.ramps.map(r => ({ x: (r.startX + r.endX) / 2, y: 1, band: 'STREET' as HeightBand, type: r.direction === 'DOWN_TO_ALLEY' ? 'RAMP_DOWN' : 'RAMP_UP' })) || []),
        ...this.state.gates.filter(g => !g.isUnlocked).map(g => ({ x: g.x, y: g.y, band: g.band, type: 'GATE' })),
        ...this.state.terminals.filter(t => !t.isHacked).map(t => ({ x: t.x, y: t.y, band: t.band, type: 'TERMINAL' })),
      ];

      const snapshot: JevStateSnapshot = {
        sectorId: this.state.sectorId,
        jevPosition: { x: jev.x, y: jev.y },
        jevBand: jev.band,
        jevHealth: jev.hp,
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
