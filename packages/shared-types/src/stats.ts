export type BehaviorDirective = 'STEALTH' | 'AGGRESSIVE' | 'BALANCED';

export interface JevStats {
  health: number;
  stamina: number;
  combatPower: number;
  intellect: number;
  behaviorDirective: BehaviorDirective;
}

export const DEFAULT_JEV_STATS: JevStats = {
  health: 1,
  stamina: 1,
  combatPower: 1,
  intellect: 1,
  behaviorDirective: 'STEALTH',
};

export const STAT_UPGRADE_COST_BASE = 50; // Data Points per level
export const STAT_MAX_LEVEL = 10;

export function getStatUpgradeCost(currentLevel: number): number {
  return currentLevel * STAT_UPGRADE_COST_BASE;
}
