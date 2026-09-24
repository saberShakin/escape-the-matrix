import { Position, TileType, SecurityGate, EnemyNPC } from '@escape-the-matrix/shared-types';
import { manhattanDistance, getOrthogonalNeighbors, isTilePassable } from './grid.js';
import { getEnemyVisionTiles } from './vision.js';

interface Node {
  pos: Position;
  g: number;
  h: number;
  f: number;
  parent?: Node;
}

export interface PathfindingOptions {
  avoidVisionCones?: boolean;
  avoidHazards?: boolean;
  enemies?: EnemyNPC[];
  keycards?: string[];
}

export function findPath(
  start: Position,
  goal: Position,
  tiles: TileType[][],
  gates: SecurityGate[] = [],
  options: PathfindingOptions = {}
): Position[] {
  const gridSize = tiles.length;
  if (start.x === goal.x && start.y === goal.y) return [];

  // Compute dangerous vision tiles
  const dangerousTiles = new Set<string>();
  if (options.avoidVisionCones && options.enemies) {
    for (const enemy of options.enemies) {
      const vTiles = getEnemyVisionTiles(enemy, tiles, gates);
      for (const vt of vTiles) {
        dangerousTiles.add(`${vt.x},${vt.y}`);
      }
    }
  }

  const openList: Node[] = [];
  const closedSet = new Set<string>();

  const startNode: Node = {
    pos: start,
    g: 0,
    h: manhattanDistance(start, goal),
    f: manhattanDistance(start, goal),
  };
  openList.push(startNode);

  while (openList.length > 0) {
    // Find node with lowest f
    let lowestIndex = 0;
    for (let i = 1; i < openList.length; i++) {
      if (openList[i].f < openList[lowestIndex].f) {
        lowestIndex = i;
      }
    }

    const current = openList.splice(lowestIndex, 1)[0];
    const currentKey = `${current.pos.x},${current.pos.y}`;
    closedSet.add(currentKey);

    // Goal reached
    if (current.pos.x === goal.x && current.pos.y === goal.y) {
      const path: Position[] = [];
      let temp: Node | undefined = current;
      while (temp && (temp.pos.x !== start.x || temp.pos.y !== start.y)) {
        path.unshift(temp.pos);
        temp = temp.parent;
      }
      return path;
    }

    const neighbors = getOrthogonalNeighbors(current.pos, gridSize);

    for (const neighbor of neighbors) {
      const nKey = `${neighbor.x},${neighbor.y}`;
      if (closedSet.has(nKey)) continue;

      // Passability check
      if (!isTilePassable(neighbor, tiles, gates)) {
        // If the neighbor is the goal (e.g. glitch or terminal), allow it
        if (neighbor.x !== goal.x || neighbor.y !== goal.y) {
          continue;
        }
      }

      // Step cost calculation
      let stepCost = 1;
      const tileType = tiles[neighbor.y]?.[neighbor.x];

      if (dangerousTiles.has(nKey)) {
        stepCost += 15; // Heavily penalize walking in vision cones
      }
      if (tileType === 'CORRUPTED_GRID' && options.avoidHazards) {
        stepCost += 8; // Penalize health hazard
      }
      if (tileType === 'LOW_COVER') {
        stepCost = Math.max(0.5, stepCost - 0.5); // Incentivize stealth cover
      }

      const tentativeG = current.g + stepCost;

      const existingNode = openList.find(
        (n) => n.pos.x === neighbor.x && n.pos.y === neighbor.y
      );

      if (!existingNode) {
        const h = manhattanDistance(neighbor, goal);
        const newNode: Node = {
          pos: neighbor,
          g: tentativeG,
          h,
          f: tentativeG + h,
          parent: current,
        };
        openList.push(newNode);
      } else if (tentativeG < existingNode.g) {
        existingNode.g = tentativeG;
        existingNode.f = tentativeG + existingNode.h;
        existingNode.parent = current;
      }
    }
  }

  // If no direct path, return empty
  return [];
}
