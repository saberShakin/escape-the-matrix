'use client';

import React, { useRef, useEffect, useState } from 'react';
import { 
  SectorState, 
  TileType, 
  EnemyNPC, 
  Direction, 
  Position 
} from '@escape-the-matrix/shared-types';

interface GridRendererProps {
  state: SectorState | null;
  onTileHover?: (pos: Position | null) => void;
}

export const GridRenderer: React.FC<GridRendererProps> = ({ state, onTileHover }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hoveredTile, setHoveredTile] = useState<Position | null>(null);

  useEffect(() => {
    if (!state || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animFrame: number;
    let animTime = 0;

    const render = () => {
      animTime += 0.03;
      const gridSize = state.gridSize;
      const width = canvas.width;
      const height = canvas.height;
      const tileSize = Math.min(width, height) / gridSize;

      ctx.clearRect(0, 0, width, height);

      // 1. Draw Grid Tiles
      for (let y = 0; y < gridSize; y++) {
        for (let x = 0; x < gridSize; x++) {
          const tile = state.tiles[y]?.[x] || 'EMPTY';
          const px = x * tileSize;
          const py = y * tileSize;

          drawTile(ctx, tile, px, py, tileSize, animTime);
        }
      }

      // 2. Draw Data Terminals
      for (const term of state.terminals) {
        drawTerminal(ctx, term.x * tileSize, term.y * tileSize, tileSize, term.isHacked, animTime);
      }

      // 3. Draw Security Gates
      for (const gate of state.gates) {
        drawGate(ctx, gate.x * tileSize, gate.y * tileSize, tileSize, gate.requiredPass, gate.isUnlocked, animTime);
      }

      // 4. Draw Pass Pickups
      for (const pass of state.passPickups) {
        if (!pass.collected) {
          drawPassPickup(ctx, pass.x * tileSize, pass.y * tileSize, tileSize, pass.passType, animTime);
        }
      }

      // 5. Draw Extraction Glitch
      drawExtractionGlitch(
        ctx, 
        state.extractionPoint.x * tileSize, 
        state.extractionPoint.y * tileSize, 
        tileSize, 
        animTime
      );

      // 6. Draw Enemy Vision Cones
      for (const enemy of state.enemies) {
        if (enemy.state !== 'STUNNED') {
          drawVisionCone(ctx, enemy, tileSize, state.tiles, animTime);
        }
      }

      // 7. Draw Enemy NPCs
      for (const enemy of state.enemies) {
        drawEnemy(ctx, enemy, tileSize, animTime);
      }

      // 8. Draw Jev (The Humanoid Runner)
      drawJev(ctx, state.jev.x * tileSize, state.jev.y * tileSize, tileSize, state.jev.direction, state.jev.status, animTime);

      // 9. Draw Hover Tile Highlight
      if (hoveredTile) {
        ctx.strokeStyle = '#00F0FF';
        ctx.lineWidth = 2;
        ctx.strokeRect(hoveredTile.x * tileSize + 2, hoveredTile.y * tileSize + 2, tileSize - 4, tileSize - 4);
      }

      animFrame = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animFrame);
    };
  }, [state, hoveredTile]);

  // Helper function to handle canvas mouse move
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!state || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const tileSize = canvas.width / state.gridSize;
    const tileX = Math.floor(x / tileSize);
    const tileY = Math.floor(y / tileSize);

    if (tileX >= 0 && tileX < state.gridSize && tileY >= 0 && tileY < state.gridSize) {
      const pos = { x: tileX, y: tileY };
      setHoveredTile(pos);
      onTileHover?.(pos);
    } else {
      setHoveredTile(null);
      onTileHover?.(null);
    }
  };

  const handleMouseLeave = () => {
    setHoveredTile(null);
    onTileHover?.(null);
  };

  return (
    <div className="relative flex items-center justify-center p-2 rounded-xl bg-matrix-surface border border-matrix-border shadow-2xl overflow-hidden">
      <canvas
        ref={canvasRef}
        width={720}
        height={720}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="w-full max-w-[680px] aspect-square rounded-lg cursor-crosshair bg-matrix-void"
      />
    </div>
  );
};

// ==========================================
// VECTOR DRAWING FUNCTIONS (Kurzgesagt Style)
// ==========================================

function drawTile(
  ctx: CanvasRenderingContext2D,
  tile: TileType,
  x: number,
  y: number,
  size: number,
  time: number
) {
  switch (tile) {
    case 'WALL':
      // Dystopian cyber building block
      ctx.fillStyle = '#101622';
      ctx.fillRect(x + 1, y + 1, size - 2, size - 2);
      ctx.strokeStyle = '#23324D';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x + 1, y + 1, size - 2, size - 2);

      // Building rooftop antenna or neon rim
      ctx.fillStyle = '#00F0FF';
      ctx.fillRect(x + size / 2 - 2, y + 4, 4, 4);
      break;

    case 'LOW_COVER':
      // Urban barrier with hazard markings
      ctx.fillStyle = '#0D1A26';
      ctx.fillRect(x + 2, y + 2, size - 4, size - 4);
      ctx.strokeStyle = '#00F0FF';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x + 4, y + 4, size - 8, size - 8);

      // Barrier cross
      ctx.fillStyle = 'rgba(0, 240, 255, 0.2)';
      ctx.fillRect(x + 6, y + size / 2 - 2, size - 12, 4);
      break;

    case 'CORRUPTED_GRID': {
      // Pulsing crimson hazard floor
      const pulse = 0.5 + Math.sin(time * 3 + x + y) * 0.3;
      ctx.fillStyle = `rgba(255, 0, 127, ${0.15 + pulse * 0.15})`;
      ctx.fillRect(x + 1, y + 1, size - 2, size - 2);
      ctx.strokeStyle = '#FF007F';
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 2, y + 2, size - 4, size - 4);

      // Glitch artifact
      ctx.fillStyle = '#FF007F';
      ctx.fillRect(x + 4 + Math.sin(time * 8) * 4, y + size / 2, size / 3, 2);
      break;
    }

    default:
      // Empty road pavement with subtle neon grid line
      ctx.fillStyle = '#080C14';
      ctx.fillRect(x, y, size, size);
      ctx.strokeStyle = '#141E2E';
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, size, size);
      break;
  }
}

function drawTerminal(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  isHacked: boolean,
  time: number
) {
  const cx = x + size / 2;
  const cy = y + size / 2;
  const color = isHacked ? '#00FF66' : '#FFB000';

  // Server pedestal base
  ctx.fillStyle = '#1A2233';
  ctx.fillRect(cx - size * 0.3, cy - size * 0.3, size * 0.6, size * 0.6);

  // Screen glow
  const pulse = Math.sin(time * 4) * 0.2 + 0.8;
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 8;
  ctx.fillRect(cx - size * 0.2, cy - size * 0.2, size * 0.4, size * 0.4);
  ctx.shadowBlur = 0;

  // Terminal label
  ctx.fillStyle = '#000';
  ctx.font = `bold ${Math.floor(size * 0.22)}px monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(isHacked ? 'OK' : 'DATA', cx, cy);
}

function drawGate(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  passType: string,
  isUnlocked: boolean,
  time: number
) {
  const color = passType === 'ALPHA_PASS' ? '#FFB000' : passType === 'BETA_PASS' ? '#00F0FF' : '#FF007F';
  if (isUnlocked) {
    // Unlocked gate threshold
    ctx.strokeStyle = 'rgba(0, 255, 102, 0.4)';
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 2, y + 2, size - 4, size - 4);
    return;
  }

  // Active glowing security beam
  const alpha = 0.7 + Math.sin(time * 6) * 0.2;
  ctx.fillStyle = `rgba(18, 24, 38, 0.8)`;
  ctx.fillRect(x + 2, y + 2, size - 4, size - 4);

  ctx.strokeStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 10;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x + size / 2, y + 2);
  ctx.lineTo(x + size / 2, y + size - 2);
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Key icon
  ctx.fillStyle = color;
  ctx.font = `bold ${Math.floor(size * 0.22)}px monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('LOCK', x + size / 2, y + size / 2);
}

function drawPassPickup(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  passType: string,
  time: number
) {
  const cx = x + size / 2;
  const bobbing = Math.sin(time * 4) * 3;
  const cy = y + size / 2 + bobbing;
  const color = passType === 'ALPHA_PASS' ? '#FFB000' : passType === 'BETA_PASS' ? '#00F0FF' : '#FF007F';

  ctx.shadowColor = color;
  ctx.shadowBlur = 12;
  ctx.fillStyle = color;

  // Keycard rectangle
  ctx.fillRect(cx - size * 0.2, cy - size * 0.15, size * 0.4, size * 0.3);
  ctx.shadowBlur = 0;

  ctx.fillStyle = '#000';
  ctx.fillRect(cx - size * 0.15, cy - size * 0.08, size * 0.1, size * 0.16);
}

function drawExtractionGlitch(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  time: number
) {
  const cx = x + size / 2;
  const cy = y + size / 2;

  // Swirling neon green vortex
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(time * 2);

  ctx.shadowColor = '#00FF66';
  ctx.shadowBlur = 15;
  ctx.strokeStyle = '#00FF66';
  ctx.lineWidth = 2.5;

  ctx.beginPath();
  ctx.arc(0, 0, size * 0.35, 0, Math.PI * 1.5);
  ctx.stroke();

  ctx.rotate(-time * 4);
  ctx.strokeStyle = '#00F0FF';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(0, 0, size * 0.2, 0, Math.PI * 1.2);
  ctx.stroke();

  ctx.restore();

  // Core glow
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(cx, cy, size * 0.08, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
}

function drawVisionCone(
  ctx: CanvasRenderingContext2D,
  enemy: EnemyNPC,
  size: number,
  _tiles: TileType[][],
  time: number
) {
  const cx = enemy.x * size + size / 2;
  const cy = enemy.y * size + size / 2;
  const range = enemy.visionRange * size;
  const coneColor = enemy.state === 'HUNT' ? '#FF007F' : enemy.state === 'SUSPICIOUS' ? '#FFB000' : '#00F0FF';

  ctx.save();
  ctx.translate(cx, cy);

  let angle = 0;
  if (enemy.direction === 'RIGHT') angle = 0;
  else if (enemy.direction === 'DOWN') angle = Math.PI / 2;
  else if (enemy.direction === 'LEFT') angle = Math.PI;
  else if (enemy.direction === 'UP') angle = -Math.PI / 2;

  ctx.rotate(angle);

  // Vision fan arc
  const halfAngle = Math.PI / 4; // 90 degree cone
  const pulse = Math.sin(time * 3) * 0.05 + 0.2;

  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.arc(0, 0, range, -halfAngle, halfAngle);
  ctx.closePath();

  const gradient = ctx.createRadialGradient(0, 0, size * 0.2, 0, 0, range);
  gradient.addColorStop(0, `${coneColor}${Math.floor(pulse * 255).toString(16).padStart(2, '0')}`);
  gradient.addColorStop(1, 'transparent');

  ctx.fillStyle = gradient;
  ctx.fill();

  ctx.strokeStyle = `${coneColor}66`;
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.restore();
}

function drawEnemy(
  ctx: CanvasRenderingContext2D,
  enemy: EnemyNPC,
  size: number,
  time: number
) {
  const cx = enemy.x * size + size / 2;
  const cy = enemy.y * size + size / 2;

  if (enemy.state === 'STUNNED') {
    // Stunned spark icon
    ctx.fillStyle = '#00F0FF';
    ctx.font = `bold ${Math.floor(size * 0.5)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('⚡', cx, cy);
    return;
  }

  if (enemy.type === 'DRONE') {
    // Hovering vector drone
    const bob = Math.sin(time * 5 + enemy.x) * 2;
    ctx.fillStyle = '#FF007F';
    ctx.shadowColor = '#FF007F';
    ctx.shadowBlur = 8;

    ctx.beginPath();
    ctx.moveTo(cx, cy - size * 0.25 + bob);
    ctx.lineTo(cx + size * 0.25, cy + bob);
    ctx.lineTo(cx, cy + size * 0.25 + bob);
    ctx.lineTo(cx - size * 0.25, cy + bob);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;

    // Center eye
    ctx.fillStyle = '#FFF';
    ctx.beginPath();
    ctx.arc(cx, cy + bob, size * 0.08, 0, Math.PI * 2);
    ctx.fill();
  } else if (enemy.type === 'TURRET') {
    // Wall turret base
    ctx.fillStyle = '#223048';
    ctx.fillRect(cx - size * 0.3, cy - size * 0.3, size * 0.6, size * 0.6);

    // Barrel
    ctx.save();
    ctx.translate(cx, cy);
    let rot = 0;
    if (enemy.direction === 'RIGHT') rot = 0;
    else if (enemy.direction === 'DOWN') rot = Math.PI / 2;
    else if (enemy.direction === 'LEFT') rot = Math.PI;
    else if (enemy.direction === 'UP') rot = -Math.PI / 2;
    ctx.rotate(rot);

    ctx.fillStyle = '#FF007F';
    ctx.fillRect(0, -size * 0.08, size * 0.35, size * 0.16);
    ctx.restore();
  } else if (enemy.type === 'AGENT_HUNTER') {
    // Black suited Agent Smith hunter with red glowing eyes
    ctx.fillStyle = '#05070D';
    ctx.strokeStyle = '#FF007F';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, size * 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Red visor eyes
    ctx.fillStyle = '#FF007F';
    ctx.shadowColor = '#FF007F';
    ctx.shadowBlur = 10;
    ctx.fillRect(cx - size * 0.15, cy - size * 0.05, size * 0.3, size * 0.1);
    ctx.shadowBlur = 0;
  } else {
    // Matrix Police Enforcer
    ctx.fillStyle = '#1E2D4A';
    ctx.beginPath();
    ctx.arc(cx, cy, size * 0.28, 0, Math.PI * 2);
    ctx.fill();

    // Flashing siren
    const sirenRed = Math.sin(time * 10) > 0;
    ctx.fillStyle = sirenRed ? '#FF007F' : '#00F0FF';
    ctx.shadowColor = ctx.fillStyle;
    ctx.shadowBlur = 6;
    ctx.fillRect(cx - size * 0.1, cy - size * 0.25, size * 0.2, size * 0.1);
    ctx.shadowBlur = 0;
  }
}

function drawJev(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  _dir: Direction,
  status: string,
  time: number
) {
  const cx = x + size / 2;
  const cy = y + size / 2;

  // Running bobbing
  const bob = status === 'RUNNING' ? Math.sin(time * 12) * 2 : Math.sin(time * 3) * 1;

  // Trench coat shadow trail
  ctx.fillStyle = 'rgba(0, 240, 255, 0.15)';
  ctx.beginPath();
  ctx.arc(cx, cy + size * 0.15 + bob, size * 0.32, 0, Math.PI * 2);
  ctx.fill();

  // Neo Trench coat silhouette
  ctx.fillStyle = '#08111E';
  ctx.strokeStyle = '#00F0FF';
  ctx.lineWidth = 2;

  ctx.beginPath();
  ctx.arc(cx, cy + bob, size * 0.24, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Jev's Cyber Visor
  ctx.fillStyle = '#00FF66';
  ctx.shadowColor = '#00FF66';
  ctx.shadowBlur = 8;
  ctx.fillRect(cx - size * 0.12, cy - size * 0.06 + bob, size * 0.24, size * 0.1);
  ctx.shadowBlur = 0;

  // Status badge label
  ctx.fillStyle = '#00F0FF';
  ctx.font = `bold ${Math.floor(size * 0.2)}px monospace`;
  ctx.textAlign = 'center';
  ctx.fillText('JEV', cx, cy - size * 0.3 + bob);
}
