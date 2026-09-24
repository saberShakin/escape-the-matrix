import { Position, TileType, SecurityGate } from '@escape-the-matrix/shared-types';

export function isInBounds(pos: Position, gridSize: number): boolean {
  return pos.x >= 0 && pos.x < gridSize && pos.y >= 0 && pos.y < gridSize;
}

export function manhattanDistance(a: Position, b: Position): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

export function euclideanDistance(a: Position, b: Position): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function getOrthogonalNeighbors(pos: Position, gridSize: number): Position[] {
  const candidates: Position[] = [
    { x: pos.x, y: pos.y - 1 }, // UP
    { x: pos.x + 1, y: pos.y }, // RIGHT
    { x: pos.x, y: pos.y + 1 }, // DOWN
    { x: pos.x - 1, y: pos.y }, // LEFT
  ];

  return candidates.filter((p) => isInBounds(p, gridSize));
}

export function isTilePassable(
  pos: Position,
  tiles: TileType[][],
  gates: SecurityGate[] = []
): boolean {
  if (!isInBounds(pos, tiles.length)) return false;

  const tile = tiles[pos.y]?.[pos.x];
  if (tile === 'WALL') return false;

  // Check if locked gate
  const gate = gates.find((g) => g.x === pos.x && g.y === pos.y);
  if (gate && !gate.isUnlocked) return false;

  return true;
}

export function blocksLineOfSight(pos: Position, tiles: TileType[][], gates: SecurityGate[] = []): boolean {
  if (!isInBounds(pos, tiles.length)) return true;
  const tile = tiles[pos.y]?.[pos.x];
  if (tile === 'WALL') return true;

  const gate = gates.find((g) => g.x === pos.x && g.y === pos.y);
  if (gate && !gate.isUnlocked) return true;

  return false;
}
