import { v4 as uuidv4 } from 'uuid';
import { 
  OperatorSessionEntity, 
  JevStatsEntity, 
  SectorRunEntity, 
  JevTelemetryLogEntity, 
  JevStats, 
  DEFAULT_JEV_STATS 
} from '@escape-the-matrix/shared-types';

class SessionStore {
  private sessions: Map<string, OperatorSessionEntity> = new Map();
  private stats: Map<string, JevStatsEntity> = new Map();
  private runs: Map<string, SectorRunEntity> = new Map();
  private telemetry: Map<string, JevTelemetryLogEntity[]> = new Map();
  private activeSessionId: string | null = null;

  constructor() {
    this.initDefaultSession();
  }

  public initDefaultSession(): OperatorSessionEntity {
    const id = uuidv4();
    const now = new Date().toISOString();

    const session: OperatorSessionEntity = {
      id,
      currentSectorId: 1,
      dataPoints: 100, // starting upgrade points
      status: 'IN_PROGRESS',
      createdAt: now,
      updatedAt: now,
    };

    const statRecord: JevStatsEntity = {
      id: uuidv4(),
      sessionId: id,
      ...DEFAULT_JEV_STATS,
    };

    this.sessions.set(id, session);
    this.stats.set(id, statRecord);
    this.activeSessionId = id;

    return session;
  }

  public getActiveSession(): { session: OperatorSessionEntity; stats: JevStatsEntity } {
    if (!this.activeSessionId || !this.sessions.has(this.activeSessionId)) {
      this.initDefaultSession();
    }
    const session = this.sessions.get(this.activeSessionId!)!;
    const stats = this.stats.get(this.activeSessionId!)!;
    return { session, stats };
  }

  public getSession(id: string): OperatorSessionEntity | undefined {
    return this.sessions.get(id);
  }

  public getStats(sessionId: string): JevStatsEntity | undefined {
    return this.stats.get(sessionId);
  }

  public updateStats(sessionId: string, newStats: Partial<JevStats>): JevStatsEntity | undefined {
    const existing = this.stats.get(sessionId);
    if (!existing) return undefined;

    const updated = {
      ...existing,
      ...newStats,
    };
    this.stats.set(sessionId, updated);
    return updated;
  }

  public awardDataPoints(sessionId: string, points: number): number {
    const session = this.sessions.get(sessionId);
    if (!session) return 0;
    session.dataPoints += points;
    session.updatedAt = new Date().toISOString();
    return session.dataPoints;
  }

  public advanceSector(sessionId: string, nextSectorId: number): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    session.currentSectorId = Math.min(5, Math.max(session.currentSectorId, nextSectorId));
    session.updatedAt = new Date().toISOString();
  }

  public recordSectorRun(run: Omit<SectorRunEntity, 'id' | 'createdAt'>): SectorRunEntity {
    const id = uuidv4();
    const record: SectorRunEntity = {
      ...run,
      id,
      createdAt: new Date().toISOString(),
    };
    this.runs.set(id, record);
    return record;
  }

  public logTelemetry(log: Omit<JevTelemetryLogEntity, 'id' | 'createdAt'>): JevTelemetryLogEntity {
    const id = uuidv4();
    const entry: JevTelemetryLogEntity = {
      ...log,
      id,
      createdAt: new Date().toISOString(),
    };

    const existing = this.telemetry.get(log.runId) || [];
    existing.push(entry);
    // Keep max 100 entries per run to prevent memory bloat
    if (existing.length > 100) existing.shift();
    this.telemetry.set(log.runId, existing);

    return entry;
  }

  public getTelemetry(runId: string): JevTelemetryLogEntity[] {
    return this.telemetry.get(runId) || [];
  }
}

export const sessionStore = new SessionStore();
