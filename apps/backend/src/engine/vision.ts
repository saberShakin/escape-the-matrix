import { Position, TileType, SecurityGate, EnemyNPC, JevState, Direction } from '@escape-the-matrix/shared-types';
import { isInBounds, blocksLineOfSight, euclideanDistance } from './grid.js';

/**
 * Bresenham's line algorithm to check if there is an unblocked ray between two points.
 */
export function hasClearLineOfSight(
  from: Position,
  to: Position,
  tiles: TileType[][],
  gates: SecurityGate[] = []
): boolean {
  let x0 = from.x;
  let y0 = from.y;
  const x1 = to.x;
  const y1 = to.y;

  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;

  while (x0 !== x1 || y0 !== y1) {
    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x0 += sx;
    }
    if (e2 < dx) {
      err += dx;
      y0 += sy;
    }

    // If we've reached the destination tile, line of sight is clear
    if (x0 === x1 && y0 === y1) return true;

    // Check if intermediate tile blocks LoS
    if (blocksLineOfSight({ x: x0, y: y0 }, tiles, gates)) {
      return false;
    }
  }

  return true;
}

/**
 * Checks if a target position falls inside the forward directional cone of an entity.
 */
export function isInsideVisionCone(
  origin: Position,
  dir: Direction,
  target: Position,
  maxRange: number
): boolean {
  const dx = target.x - origin.x;
  const dy = target.y - origin.y;
  const dist = euclideanDistance(origin, target);

  if (dist > maxRange || dist === 0) return false;

  switch (dir) {
    case 'UP':
      // Target must be above origin (dy < 0) and within lateral fan (|dx| <= |dy|)
      return dy < 0 && Math.abs(dx) <= Math.abs(dy);
    case 'DOWN':
      // Target must be below origin (dy > 0) and within lateral fan (|dx| <= dy)
      return dy > 0 && Math.abs(dx) <= dy;
    case 'LEFT':
      // Target must be to left (dx < 0) and within vertical fan (|dy| <= |dx|)
      return dx < 0 && Math.abs(dy) <= Math.abs(dx);
    case 'RIGHT':
      // Target must be to right (dx > 0) and within vertical fan (|dy| <= dx)
      return dx > 0 && Math.abs(dy) <= dx;
    default:
      return false;
  }
}

/**
 * Computes all grid tiles visible to an enemy.
 */
export function getEnemyVisionTiles(
  enemy: EnemyNPC,
  tiles: TileType[][],
  gates: SecurityGate[] = []
): Position[] {
  if (enemy.state === 'STUNNED') return [];

  const visible: Position[] = [];
  const gridSize = tiles.length;
  const range = enemy.visionRange;

  const minX = Math.max(0, enemy.x - range);
  const maxX = Math.min(gridSize - 1, enemy.x + range);
  const minY = Math.max(0, enemy.y - range);
  const maxY = Math.min(gridSize - 1, enemy.y + range);

  const origin = { x: enemy.x, y: enemy.y };

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const target = { x, y };
      if (isInsideVisionCone(origin, enemy.direction, target, range)) {
        if (hasClearLineOfSight(origin, target, tiles, gates)) {
          visible.push(target);
        }
      }
    }
  }

  return visible;
}

/**
 * Calculates current detection risk for Jev based on enemy vision cones and cover.
 */
export function calculateDetectionRisk(
  jev: JevState,
  enemies: EnemyNPC[],
  tiles: TileType[][],
  gates: SecurityGate[] = []
): number {
  let highestRisk = 0;

  for (const enemy of enemies) {
    if (enemy.state === 'STUNNED') continue;

    const visionTiles = getEnemyVisionTiles(enemy, tiles, gates);
    const seesJev = visionTiles.some((t) => t.x === jev.x && t.y === jev.y);

    if (seesJev) {
      const dist = euclideanDistance({ x: enemy.x, y: enemy.y }, { x: jev.x, y: jev.y });
      // Base risk inversely proportional to distance
      let risk = Math.max(0.4, 1.0 - (dist / (enemy.visionRange + 1)) * 0.5);

      // Stealth / cover modifier
      const currentTile = tiles[jev.y]?.[jev.x];
      if (currentTile === 'LOW_COVER' || jev.status === 'CROUCHING') {
        risk *= 0.6; // 40% risk reduction in cover
      }

      if (risk > highestRisk) {
        highestRisk = risk;
      }
    }
  }

  return Math.min(1.0, Math.max(0.0, highestRisk));
}
