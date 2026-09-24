export type BehaviorDirective = 'CAUTIOUS' | 'SPRINT' | 'SCAVENGER';

export interface JevStats {
  stealthMatrix: number; // 1 to 10
  processingHz: number;  // 1 to 10
  hackBypass: number;    // 1 to 10
  armorShield: number;   // 1 to 10
  energyReactor: number; // 1 to 10
  behaviorDirective: BehaviorDirective;
}

export const DEFAULT_JEV_STATS: JevStats = {
  stealthMatrix: 1,
  processingHz: 1,
  hackBypass: 1,
  armorShield: 1,
  energyReactor: 1,
  behaviorDirective: 'CAUTIOUS',
};

export const STAT_UPGRADE_COST_BASE = 50; // Data Points per level
export const STAT_MAX_LEVEL = 10;

export function getStatUpgradeCost(currentLevel: number): number {
  return currentLevel * STAT_UPGRADE_COST_BASE;
}
