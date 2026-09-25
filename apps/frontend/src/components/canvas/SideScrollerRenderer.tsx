'use client';

import React, { useRef, useEffect, useState } from 'react';
import { 
  SectorState, 
  SectorTheme, 
  EnemyNPC 
} from '@escape-the-matrix/shared-types';

interface SideScrollerRendererProps {
  state: SectorState | null;
  onFeatureHover?: (info: string | null) => void;
}

export const SideScrollerRenderer: React.FC<SideScrollerRendererProps> = ({ 
  state, 
  onFeatureHover 
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Smooth 60 FPS interpolated entity positions
  const jevPosRef = useRef({ x: 0.5, y: 0, band: 'STREET', jumpArc: 0 });
  const enemiesPosRef = useRef<Map<string, { x: number; y: number; facing: 'LEFT' | 'RIGHT' }>>(new Map());

  // Weather & environmental particles
  const particlesRef = useRef<Array<{ x: number; y: number; speed: number; length?: number; char?: string; life?: number }>>([]);
  const sparksRef = useRef<Array<{ x: number; y: number; vx: number; vy: number; life: number; color: string }>>([]);

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animFrame: number;
    let animTime = 0;

    // Initialize weather particles
    if (particlesRef.current.length === 0) {
      for (let i = 0; i < 70; i++) {
        particlesRef.current.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          speed: 4 + Math.random() * 6,
          length: 8 + Math.random() * 12,
          char: Math.random() > 0.5 ? '1' : '0',
          life: Math.random(),
        });
      }
    }

    const render = () => {
      animTime += 0.035;
      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);

      if (!state) {
        animFrame = requestAnimationFrame(render);
        return;
      }

      const theme: SectorTheme = state.theme || 'SLUMS';
      const totalUnits = state.layout?.widthUnits || 26;
      const unitPx = width / totalUnits;

      // 3 Height Bands:
      // Band 0: Rooftop Platform (highest)
      // Band 1: Street Level (middle - main path)
      // Band 2: Service Alley / Sub-floor (lowest - sunken)
      const streetY = height * 0.63;
      const rooftopY = height * 0.33;
      const alleyY = height * 0.86;
      const bandHeight = 22;

      // ==========================================
      // 1. ATMOSPHERIC THEMATIC BACKGROUND (Subdued, High Depth Fog)
      // ==========================================
      drawAtmosphericBackground(ctx, theme, width, height, animTime);

      // ==========================================
      // 2. THEMATIC MIDGROUND ARCHITECTURE (Low Saturation, Non-Competing)
      // ==========================================
      drawThemedMidground(ctx, theme, width, streetY, rooftopY, animTime);

      // ==========================================
      // 3. WEATHER / ATMOSPHERIC EFFECTS (Rain, Steam, Code Rain, Haze)
      // ==========================================
      updateAndDrawWeather(ctx, theme, width, height, particlesRef.current, sparksRef.current);

      // ==========================================
      // 4. SERVICE ALLEY / SUB-FLOOR (Sunken Lower Path)
      // ==========================================
      if (state.layout) {
        drawThemedServiceAlley(ctx, theme, state.layout, alleyY, streetY, unitPx, animTime);
      }

      // ==========================================
      // 5. STREET LEVEL (Main Path) & GAPS / TRAFFIC
      // ==========================================
      drawThemedStreetLevel(ctx, theme, state.layout, width, streetY, bandHeight, unitPx, animTime);

      // ==========================================
      // 6. ROOFTOP PLATFORM / SKY-BRIDGE & LADDERS
      // ==========================================
      if (state.layout) {
        drawThemedRooftop(ctx, theme, state.layout, rooftopY, streetY, bandHeight, unitPx, animTime);
      }

      // ==========================================
      // 7. SECTOR CLUTTER (Crates, Barrels, Dumpsters, Server Racks, Desks)
      // ==========================================
      if (state.layout) {
        for (const item of state.layout.clutter) {
          const px = item.x * unitPx;
          const py = item.band === 'ROOFTOP' ? rooftopY : (item.band === 'ALLEY' ? alleyY : streetY);
          drawThemedClutter(ctx, px, py, item.type, theme);
        }
      }

      // ==========================================
      // 8. INTERACTIVE FEATURES (Steam Vents, Holograms, Air Ducts)
      // ==========================================
      if (state.layout?.features) {
        for (const feat of state.layout.features) {
          const fx = feat.x * unitPx;
          const fy = feat.band === 'ROOFTOP' ? rooftopY : (feat.band === 'ALLEY' ? alleyY : streetY);
          drawInteractiveFeature(ctx, feat, fx, fy, animTime);
        }
      }

      // ==========================================
      // 9. TERMINALS, SECURITY GATES & PASS PICKUPS
      // ==========================================
      for (const term of state.terminals) {
        const py = term.band === 'ROOFTOP' ? rooftopY : (term.band === 'ALLEY' ? alleyY : streetY);
        drawThemedTerminal(ctx, term.x * unitPx, py, term.isHacked, animTime);
      }

      for (const gate of state.gates) {
        const py = gate.band === 'ROOFTOP' ? rooftopY : (gate.band === 'ALLEY' ? alleyY : streetY);
        drawThemedLaserGate(ctx, gate.x * unitPx, py, gate.isUnlocked, animTime);
      }

      for (const pass of state.passPickups) {
        if (!pass.collected) {
          const py = pass.band === 'ROOFTOP' ? rooftopY : (pass.band === 'ALLEY' ? alleyY : streetY);
          drawThemedKeycard(ctx, pass.x * unitPx, py, pass.passType, animTime);
        }
      }

      // ==========================================
      // 10. CYAN EXTRACTION GLITCH DOOR (Goal)
      // ==========================================
      const extX = state.extractionPoint.x * unitPx;
      drawThemedExtractionDoor(ctx, theme, extX, streetY, animTime);

      // ==========================================
      // 11. ENEMY ENTITIES & VISION CONES (Smooth Interpolation)
      // ==========================================
      for (const enemy of state.enemies) {
        // Smoothly interpolate enemy position
        let ePos = enemiesPosRef.current.get(enemy.id);
        if (!ePos) {
          ePos = { x: enemy.x, y: enemy.y, facing: enemy.facing };
          enemiesPosRef.current.set(enemy.id, ePos);
        } else {
          ePos.x += (enemy.x - ePos.x) * 0.22;
          ePos.facing = enemy.facing;
        }

        const ex = ePos.x * unitPx;
        const ey = enemy.band === 'ROOFTOP' ? rooftopY : (enemy.band === 'ALLEY' ? alleyY : streetY);

        if (enemy.stunTurns === 0) {
          drawEnemyVisionSide(ctx, enemy, ex, ey, unitPx, animTime);
        }
        drawEnemyEntitySide(ctx, enemy, ex, ey, animTime);
      }

      // ==========================================
      // 12. JEV (Continuous 60 FPS Real-Time Engine Rendering)
      // ==========================================
      const jevPixelX = state.jev.x * unitPx;
      let jevPixelY = streetY;

      if (state.jev.status === 'CLIMBING' && state.jev.climbProgress !== undefined) {
        // Climbing up ladder from street to rooftop
        jevPixelY = streetY - state.jev.climbProgress * (streetY - rooftopY);
      } else if (state.jev.status === 'DESCENDING' && state.jev.rampProgress !== undefined) {
        // Descending ramp down into alley
        jevPixelY = streetY + state.jev.rampProgress * (alleyY - streetY);
      } else if (state.jev.band === 'ROOFTOP') {
        jevPixelY = rooftopY;
      } else if (state.jev.band === 'ALLEY') {
        jevPixelY = alleyY;
      }

      // Parabolic jump arc with continuous smooth physics
      if (state.jev.status === 'JUMPING' && state.jev.jumpProgress !== undefined) {
        const jumpArc = state.jev.jumpProgress * 34;
        jevPixelY -= jumpArc;
      }

      // Footstep sparks when running
      if (state.jev.status === 'RUNNING' && Math.random() > 0.5) {
        sparksRef.current.push({
          x: jevPixelX - (state.jev.facing === 'RIGHT' ? 8 : -8),
          y: jevPixelY - 2,
          vx: (Math.random() - 0.5) * 2,
          vy: -Math.random() * 2 - 1,
          life: 1.0,
          color: '#00F0FF',
        });
      }

      // Render Jev with high-contrast Kurzgesagt luminous treatment
      drawLuminousJev(
        ctx, 
        jevPixelX, 
        jevPixelY, 
        state.jev.facing, 
        state.jev.status, 
        state.jev.isHidingInCover || false, 
        animTime
      );

      // Focus Reticle Lock
      if (state.jev.targetFocus) {
        drawTargetReticle(ctx, state.jev.targetFocus, state, unitPx, streetY, rooftopY, alleyY, animTime);
      }


      animFrame = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animFrame);
    };
  }, [state]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!state || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const totalUnits = state.layout?.widthUnits || 26;
    const unitPx = canvas.width / totalUnits;
    const hoveredUnitX = x / unitPx;

    const streetY = canvas.height * 0.63;
    const rooftopY = canvas.height * 0.33;
    const alleyY = canvas.height * 0.86;

    let info: string | null = null;

    if (Math.abs(y - rooftopY) < 36 && state.layout && hoveredUnitX >= state.layout.rooftopStart && hoveredUnitX <= state.layout.rooftopEnd) {
      info = `ROOFTOP / SKYWAY [x: ${hoveredUnitX.toFixed(1)}]`;
    } else if (Math.abs(y - alleyY) < 36 && state.layout && hoveredUnitX >= state.layout.alleyStart && hoveredUnitX <= state.layout.alleyEnd) {
      info = `LOWER SUB-FLOOR / ALLEY [x: ${hoveredUnitX.toFixed(1)}]`;
    } else if (Math.abs(y - streetY) < 36) {
      const gap = state.layout?.gaps.find(g => hoveredUnitX >= g.startX && hoveredUnitX <= g.endX);
      if (gap) {
        info = gap.isMovingTraffic ? `HOVER-TRAFFIC GAP HAZARD [x: ${gap.startX}-${gap.endX}]` : `HAZARD VOID [x: ${gap.startX}-${gap.endX}]`;
      } else {
        info = `MAIN STREET LEVEL [x: ${hoveredUnitX.toFixed(1)}]`;
      }
    }

    onFeatureHover?.(info);
  };

  const handleMouseLeave = () => {
    onFeatureHover?.(null);
  };

  const getThemeBadgeColor = (theme?: SectorTheme) => {
    switch (theme) {
      case 'SLUMS': return 'text-matrix-cyan border-matrix-cyan bg-matrix-cyan/10';
      case 'SKY_BRIDGE': return 'text-matrix-blue border-blue-400 bg-blue-500/10';
      case 'HIGHWAY': return 'text-matrix-amber border-matrix-amber bg-matrix-amber/10';
      case 'OFFICE_VAULT': return 'text-purple-400 border-purple-400 bg-purple-500/10';
      case 'CITADEL_GLITCH': return 'text-matrix-green border-matrix-green bg-matrix-green/10';
      default: return 'text-matrix-cyan border-matrix-cyan bg-matrix-cyan/10';
    }
  };

  return (
    <div className="relative flex flex-col rounded-xl bg-matrix-surface border border-matrix-border shadow-2xl overflow-hidden">
      {/* Top Banner Tag */}
      <div className="flex items-center justify-between px-3 py-2 bg-matrix-panel/90 border-b border-matrix-border text-[11px] font-mono">
        <div className="flex items-center space-x-2">
          <span className="w-2.5 h-2.5 rounded-full bg-matrix-cyan animate-pulse" />
          <span className="text-matrix-cyan font-bold tracking-wider">60 FPS REALTIME SIMULATION</span>
          <span className="text-slate-500">|</span>
          <span className={`px-2 py-0.5 rounded border text-[10px] font-bold ${getThemeBadgeColor(state?.theme)}`}>
            THEME: {state?.theme || 'SLUMS'}
          </span>
        </div>
        <div className="text-xs text-matrix-amber font-mono font-bold tracking-wide">
          {state ? `SECTOR 0${state.sectorId}: ${state.name}` : 'AWAITING DISPATCH'}
        </div>
      </div>

      {/* Main 2D Canvas */}
      <div className="relative flex items-center justify-center p-2 bg-[#080C14]">
        <canvas
          ref={canvasRef}
          width={920}
          height={480}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className="w-full aspect-[23/12] rounded-lg cursor-crosshair shadow-inner"
        />
      </div>
    </div>
  );
};

// =========================================================================
// 1. ATMOSPHERIC THEMATIC BACKGROUND (Low Saturation, High Depth Fog)
// =========================================================================
function drawAtmosphericBackground(
  ctx: CanvasRenderingContext2D, 
  theme: SectorTheme, 
  width: number, 
  height: number, 
  time: number
) {
  const grad = ctx.createLinearGradient(0, 0, 0, height);

  switch (theme) {
    case 'SLUMS': {
      // Rainy Night Alley: Dark teal/navy haze
      grad.addColorStop(0, '#04070d');
      grad.addColorStop(0.5, '#070f1a');
      grad.addColorStop(1, '#0e1a26');
      break;
    }
    case 'SKY_BRIDGE': {
      // Corporate High-Altitude Sky: Deep steel-blue haze with distant clouds
      grad.addColorStop(0, '#050a14');
      grad.addColorStop(0.5, '#0c172a');
      grad.addColorStop(1, '#13213a');
      break;
    }
    case 'HIGHWAY': {
      // High-Riot Expressway: Midnight charcoal with warm amber traffic glow
      grad.addColorStop(0, '#06060c');
      grad.addColorStop(0.6, '#0f0e1a');
      grad.addColorStop(1, '#1a141c');
      break;
    }
    case 'OFFICE_VAULT': {
      // Executive Interior: Slate charcoal with ceiling office fluorescent tone
      grad.addColorStop(0, '#080a10');
      grad.addColorStop(0.5, '#0e121c');
      grad.addColorStop(1, '#161c2b');
      break;
    }
    case 'CITADEL_GLITCH': {
      // Matrix Reality Breakdown: Obsidian with digital green matrix code glow
      grad.addColorStop(0, '#020604');
      grad.addColorStop(0.5, '#05120a');
      grad.addColorStop(1, '#0a1a0f');
      break;
    }
  }

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);
}

// =========================================================================
// 2. THEMATIC MIDGROUND BUILDINGS & SILHOUETTES (Subdued, Non-Competing)
// =========================================================================
function drawThemedMidground(
  ctx: CanvasRenderingContext2D, 
  theme: SectorTheme, 
  width: number, 
  streetY: number, 
  rooftopY: number, 
  time: number
) {
  ctx.save();

  if (theme === 'SLUMS') {
    // Dense slum silhouette towers with fire escape ladders and dim antennas
    ctx.fillStyle = '#0a1320';
    const slumBuildings = [
      { x: 10, w: 100, h: 220 },
      { x: 130, w: 80, h: 250 },
      { x: 230, w: 120, h: 200 },
      { x: 370, w: 90, h: 270 },
      { x: 480, w: 110, h: 210 },
      { x: 610, w: 100, h: 240 },
      { x: 730, w: 130, h: 190 },
      { x: 850, w: 70, h: 260 },
    ];
    for (const b of slumBuildings) {
      ctx.fillRect(b.x, streetY - b.h, b.w, b.h);
      // Dim neon sign
      if (b.w > 90) {
        ctx.fillStyle = 'rgba(0, 240, 255, 0.25)';
        ctx.fillRect(b.x + 15, streetY - b.h + 30, b.w - 30, 8);
        ctx.fillStyle = '#0a1320';
      }
    }
  } else if (theme === 'SKY_BRIDGE') {
    // Elegant monolithic corporate glass skyscrapers
    ctx.fillStyle = '#0f1c30';
    const towers = [
      { x: 30, w: 130, h: 280 },
      { x: 200, w: 150, h: 320 },
      { x: 390, w: 140, h: 300 },
      { x: 570, w: 160, h: 340 },
      { x: 770, w: 130, h: 290 },
    ];
    for (const t of towers) {
      ctx.fillRect(t.x, streetY - t.h, t.w, t.h);
      // Vertical glass line reflections
      ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
      for (let lx = t.x + 15; lx < t.x + t.w; lx += 20) {
        ctx.fillRect(lx, streetY - t.h, 2, t.h);
      }
      ctx.fillStyle = '#0f1c30';
    }
  } else if (theme === 'HIGHWAY') {
    // Overhead highway gantries and distant industrial transit hubs
    ctx.fillStyle = '#12121e';
    for (let x = 40; x < width; x += 180) {
      ctx.fillRect(x, streetY - 220, 20, 220);
      ctx.fillRect(x - 20, streetY - 220, 160, 14);
      // Caution blinker
      ctx.fillStyle = Math.sin(time * 4 + x) > 0 ? '#FFB000' : '#443311';
      ctx.beginPath();
      ctx.arc(x + 60, streetY - 225, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#12121e';
    }
  } else if (theme === 'OFFICE_VAULT') {
    // Interior office partitions and suspended ceiling panel grid
    ctx.fillStyle = '#121622';
    ctx.fillRect(0, 0, width, streetY - 180);
    // Fluorescent ceiling panels
    ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
    for (let x = 30; x < width; x += 90) {
      ctx.fillRect(x, streetY - 176, 50, 4);
    }
  } else if (theme === 'CITADEL_GLITCH') {
    // Fragmented floating geometric digital blocks
    ctx.fillStyle = 'rgba(0, 255, 120, 0.08)';
    for (let i = 0; i < 18; i++) {
      const bx = ((i * 54 + time * 12) % width);
      const by = 40 + (i * 27) % 240;
      ctx.fillRect(bx, by, 35 + (i % 3) * 15, 20 + (i % 2) * 10);
    }
  }

  ctx.restore();
}

// =========================================================================
// 3. WEATHER & ATMOSPHERIC PARTICLES
// =========================================================================
function updateAndDrawWeather(
  ctx: CanvasRenderingContext2D, 
  theme: SectorTheme, 
  width: number, 
  height: number, 
  particles: any[],
  sparks: any[]
) {
  ctx.save();

  if (theme === 'SLUMS') {
    // Rain particle system
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.45)';
    ctx.lineWidth = 1.2;
    for (const p of particles) {
      p.y += p.speed;
      p.x -= p.speed * 0.25;
      if (p.y > height) {
        p.y = -10;
        p.x = Math.random() * width;
      }
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - 3, p.y + p.length);
      ctx.stroke();
    }
  } else if (theme === 'CITADEL_GLITCH') {
    // Cascading Matrix Digital Code Rain
    ctx.fillStyle = '#00FF7F';
    ctx.font = '10px monospace';
    for (const p of particles) {
      p.y += p.speed * 0.8;
      if (p.y > height) {
        p.y = -10;
        p.x = Math.random() * width;
        p.char = Math.random() > 0.5 ? '1' : '0';
      }
      ctx.globalAlpha = p.life || 0.6;
      ctx.fillText(p.char, p.x, p.y);
    }
    ctx.globalAlpha = 1.0;
  }

  // Draw Ground Footstep Sparks
  for (let i = sparks.length - 1; i >= 0; i--) {
    const s = sparks[i];
    s.x += s.vx;
    s.y += s.vy;
    s.life -= 0.05;
    if (s.life <= 0) {
      sparks.splice(i, 1);
      continue;
    }
    ctx.fillStyle = s.color;
    ctx.globalAlpha = s.life;
    ctx.fillRect(s.x, s.y, 2, 2);
  }
  ctx.globalAlpha = 1.0;

  ctx.restore();
}

// =========================================================================
// 4. THEMED STREET LEVEL (With Gaps & Moving Hover-Traffic)
// =========================================================================
function drawThemedStreetLevel(
  ctx: CanvasRenderingContext2D,
  theme: SectorTheme,
  layout: any,
  width: number,
  streetY: number,
  bandHeight: number,
  unitPx: number,
  time: number
) {
  ctx.save();

  // Dark slate walkable platform (#1a202c) with clean neon edge trim
  const platColor = theme === 'OFFICE_VAULT' ? '#181f2c' : '#141a24';
  const edgeColor = theme === 'CITADEL_GLITCH' ? '#00FF7F' : (theme === 'HIGHWAY' ? '#FFB000' : '#00F0FF');

  if (!layout || !layout.gaps || layout.gaps.length === 0) {
    ctx.fillStyle = platColor;
    ctx.fillRect(0, streetY, width, bandHeight);
    ctx.fillStyle = edgeColor;
    ctx.fillRect(0, streetY, width, 2.5);
    ctx.restore();
    return;
  }

  let currentX = 0;
  for (const gap of layout.gaps) {
    const gapStart = gap.startX * unitPx;
    const gapEnd = gap.endX * unitPx;

    // Platform segment before gap
    if (gapStart > currentX) {
      ctx.fillStyle = platColor;
      ctx.fillRect(currentX, streetY, gapStart - currentX, bandHeight);
      ctx.fillStyle = edgeColor;
      ctx.fillRect(currentX, streetY, gapStart - currentX, 2.5);
    }

    // Gap Hazard: Moving Hover-Cars (Highway) or Glowing Spikes/Void
    if (gap.isMovingTraffic) {
      drawHighwayTrafficHazard(ctx, gapStart, gapEnd, streetY, time);
    } else {
      drawVoidHazard(ctx, gapStart, gapEnd, streetY, theme, time);
    }

    currentX = gapEnd;
  }

  if (currentX < width) {
    ctx.fillStyle = platColor;
    ctx.fillRect(currentX, streetY, width - currentX, bandHeight);
    ctx.fillStyle = edgeColor;
    ctx.fillRect(currentX, streetY, width - currentX, 2.5);
  }

  ctx.restore();
}

function drawHighwayTrafficHazard(
  ctx: CanvasRenderingContext2D, 
  startX: number, 
  endX: number, 
  streetY: number, 
  time: number
) {
  const gapWidth = endX - startX;
  // Lower expressway lane
  ctx.fillStyle = '#0a0a14';
  ctx.fillRect(startX, streetY, gapWidth, 50);

  // Road lines
  ctx.strokeStyle = '#FFB000';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([8, 8]);
  ctx.beginPath();
  ctx.moveTo(startX, streetY + 25);
  ctx.lineTo(endX, streetY + 25);
  ctx.stroke();
  ctx.setLineDash([]);

  // High-speed moving hover-car passing periodically
  const carPeriod = 3.5;
  const carProgress = (time % carPeriod) / carPeriod;
  const carX = startX - 40 + carProgress * (gapWidth + 80);

  // Hover-Car Body
  ctx.fillStyle = '#FF2A6D';
  ctx.shadowColor = '#FF2A6D';
  ctx.shadowBlur = 10;
  ctx.fillRect(carX, streetY + 16, 36, 12);
  // Headlight beam
  ctx.fillStyle = 'rgba(255, 240, 150, 0.4)';
  ctx.beginPath();
  ctx.moveTo(carX + 36, streetY + 18);
  ctx.lineTo(carX + 80, streetY + 10);
  ctx.lineTo(carX + 80, streetY + 30);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;
}

function drawVoidHazard(
  ctx: CanvasRenderingContext2D, 
  startX: number, 
  endX: number, 
  streetY: number, 
  theme: SectorTheme,
  time: number
) {
  const gapWidth = endX - startX;
  const pitY = streetY + 45;

  ctx.fillStyle = '#05070c';
  ctx.fillRect(startX, streetY, gapWidth, pitY - streetY + 20);

  // Glowing danger gradient
  const hazardColor = theme === 'CITADEL_GLITCH' ? '#00FF7F' : '#FF2A6D';
  const grad = ctx.createLinearGradient(0, streetY, 0, pitY);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, `${hazardColor}55`);
  ctx.fillStyle = grad;
  ctx.fillRect(startX, streetY, gapWidth, pitY - streetY);

  // Hazard Spikes
  const numSpikes = Math.floor(gapWidth / 14);
  ctx.fillStyle = hazardColor;
  ctx.shadowColor = hazardColor;
  ctx.shadowBlur = 8;
  for (let i = 0; i < numSpikes; i++) {
    const sx = startX + i * 14 + 7;
    const pulseH = 16 + Math.sin(time * 5 + i) * 3;
    ctx.beginPath();
    ctx.moveTo(sx - 6, pitY + 15);
    ctx.lineTo(sx, pitY + 15 - pulseH);
    ctx.lineTo(sx + 6, pitY + 15);
    ctx.closePath();
    ctx.fill();
  }
  ctx.shadowBlur = 0;
}

// =========================================================================
// 5. THEMED ROOFTOP / SKY-BRIDGE
// =========================================================================
function drawThemedRooftop(
  ctx: CanvasRenderingContext2D,
  theme: SectorTheme,
  layout: any,
  rooftopY: number,
  streetY: number,
  bandHeight: number,
  unitPx: number,
  time: number
) {
  const startPx = layout.rooftopStart * unitPx;
  const endPx = layout.rooftopEnd * unitPx;
  const roofWidth = endPx - startPx;

  ctx.save();

  if (theme === 'SKY_BRIDGE') {
    // Glass sky-bridge with glowing blue neon underside
    ctx.fillStyle = 'rgba(20, 35, 60, 0.85)';
    ctx.fillRect(startPx, rooftopY, roofWidth, bandHeight);
    ctx.strokeStyle = '#00F0FF';
    ctx.lineWidth = 2;
    ctx.strokeRect(startPx, rooftopY, roofWidth, bandHeight);
  } else {
    // Solid platform
    ctx.fillStyle = '#222b3b';
    ctx.fillRect(startPx, rooftopY, roofWidth, bandHeight);
    ctx.fillStyle = '#41506b';
    ctx.fillRect(startPx, rooftopY, roofWidth, 2.5);
  }

  // Safety railings
  ctx.strokeStyle = '#38465c';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(startPx, rooftopY - 8);
  ctx.lineTo(endPx, rooftopY - 8);
  for (let x = startPx + 15; x < endPx; x += 30) {
    ctx.moveTo(x, rooftopY);
    ctx.lineTo(x, rooftopY - 8);
  }
  ctx.stroke();

  // Draw Ladders
  for (const ladder of layout.ladders) {
    const lx = ladder.x * unitPx;
    drawThemedLadder(ctx, lx, rooftopY + bandHeight, streetY);
  }

  ctx.restore();
}

function drawThemedLadder(ctx: CanvasRenderingContext2D, x: number, topY: number, bottomY: number) {
  const ladderW = 16;
  ctx.save();
  ctx.strokeStyle = '#FFB000';
  ctx.lineWidth = 2;

  // Vertical Rails
  ctx.beginPath();
  ctx.moveTo(x - ladderW / 2, topY);
  ctx.lineTo(x - ladderW / 2, bottomY);
  ctx.moveTo(x + ladderW / 2, topY);
  ctx.lineTo(x + ladderW / 2, bottomY);
  ctx.stroke();

  // High-visibility rungs
  ctx.lineWidth = 2;
  for (let y = topY + 8; y < bottomY; y += 12) {
    ctx.beginPath();
    ctx.moveTo(x - ladderW / 2, y);
    ctx.lineTo(x + ladderW / 2, y);
    ctx.stroke();
  }
  ctx.restore();
}

// =========================================================================
// 6. THEMED SERVICE ALLEY / SUB-FLOOR
// =========================================================================
function drawThemedServiceAlley(
  ctx: CanvasRenderingContext2D,
  theme: SectorTheme,
  layout: any,
  alleyY: number,
  streetY: number,
  unitPx: number,
  time: number
) {
  const alleyStartPx = layout.alleyStart * unitPx;
  const alleyEndPx = layout.alleyEnd * unitPx;

  ctx.save();
  // Sunken alley walkway
  ctx.fillStyle = '#10151f';
  ctx.fillRect(alleyStartPx, alleyY, alleyEndPx - alleyStartPx, 35);
  ctx.fillStyle = '#00F0FF';
  ctx.fillRect(alleyStartPx, alleyY, alleyEndPx - alleyStartPx, 2);

  // Sunken back-wall
  ctx.fillStyle = '#0a0e17';
  ctx.fillRect(alleyStartPx, streetY + 22, alleyEndPx - alleyStartPx, alleyY - streetY - 22);

  // Ramps
  for (const ramp of layout.ramps) {
    const rStart = ramp.startX * unitPx;
    const rEnd = ramp.endX * unitPx;

    ctx.fillStyle = '#1e2636';
    ctx.beginPath();
    if (ramp.direction === 'DOWN_TO_ALLEY') {
      ctx.moveTo(rStart, streetY + 22);
      ctx.lineTo(rEnd, alleyY);
      ctx.lineTo(rEnd, alleyY + 12);
      ctx.lineTo(rStart, streetY + 22 + 12);
    } else {
      ctx.moveTo(rStart, alleyY);
      ctx.lineTo(rEnd, streetY + 22);
      ctx.lineTo(rEnd, streetY + 22 + 12);
      ctx.lineTo(rStart, alleyY + 12);
    }
    ctx.closePath();
    ctx.fill();

    // Ramp guide strip
    ctx.strokeStyle = '#FFB000';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    if (ramp.direction === 'DOWN_TO_ALLEY') {
      ctx.moveTo(rStart, streetY + 22);
      ctx.lineTo(rEnd, alleyY);
    } else {
      ctx.moveTo(rStart, alleyY);
      ctx.lineTo(rEnd, streetY + 22);
    }
    ctx.stroke();
  }

  ctx.restore();
}

// =========================================================================
// 7. THEMED CLUTTER & COVER OBJECTS
// =========================================================================
function drawThemedClutter(
  ctx: CanvasRenderingContext2D, 
  x: number, 
  y: number, 
  type: string, 
  theme: SectorTheme
) {
  ctx.save();

  if (type === 'DUMPSTER') {
    // Dark green metal dumpster with lid (Slums cover)
    ctx.fillStyle = '#1a3324';
    ctx.fillRect(x - 14, y - 22, 28, 22);
    ctx.strokeStyle = '#2d543c';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x - 14, y - 22, 28, 22);
    // Lid
    ctx.fillStyle = '#2d543c';
    ctx.fillRect(x - 16, y - 25, 32, 4);
  } else if (type === 'SERVER_RACK') {
    // Tall server rack with blinking LED arrays (Office / Citadel)
    ctx.fillStyle = '#121722';
    ctx.fillRect(x - 10, y - 32, 20, 32);
    ctx.strokeStyle = '#2b364d';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x - 10, y - 32, 20, 32);
    // Blinking LEDs
    for (let r = 0; r < 4; r++) {
      ctx.fillStyle = (r % 2 === 0) ? '#00FF7F' : '#00F0FF';
      ctx.fillRect(x - 6, y - 28 + r * 7, 3, 3);
      ctx.fillStyle = '#FF2A6D';
      ctx.fillRect(x + 3, y - 28 + r * 7, 3, 3);
    }
  } else if (type === 'DESK') {
    // Executive desk with computer terminal
    ctx.fillStyle = '#2c1e14';
    ctx.fillRect(x - 15, y - 16, 30, 16);
    // Monitor
    ctx.fillStyle = '#00F0FF';
    ctx.fillRect(x - 6, y - 24, 12, 8);
    ctx.fillStyle = '#111';
    ctx.fillRect(x - 2, y - 16, 4, 3);
  } else if (type === 'BARRELS') {
    // Toxic/chemical barrel
    ctx.fillStyle = '#614324';
    ctx.beginPath();
    ctx.roundRect(x - 8, y - 20, 16, 20, [4, 4, 2, 2]);
    ctx.fill();
    ctx.strokeStyle = '#8a6239';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  } else {
    // Reinforced Cargo Crate (#c28d54)
    ctx.fillStyle = '#8f6134';
    ctx.fillRect(x - 10, y - 18, 20, 18);
    ctx.strokeStyle = '#b8814d';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x - 10, y - 18, 20, 18);
    ctx.beginPath();
    ctx.moveTo(x - 10, y - 18);
    ctx.lineTo(x + 10, y);
    ctx.stroke();
  }

  ctx.restore();
}

// =========================================================================
// 8. INTERACTIVE FEATURES (Steam Vents, Holograms, Air Ducts)
// =========================================================================
function drawInteractiveFeature(
  ctx: CanvasRenderingContext2D, 
  feat: any, 
  x: number, 
  y: number, 
  time: number
) {
  ctx.save();

  if (feat.type === 'STEAM_VENT') {
    // Billowing steam clouds
    ctx.fillStyle = 'rgba(200, 240, 255, 0.2)';
    for (let i = 0; i < 3; i++) {
      const steamY = y - 10 - ((time * 15 + i * 8) % 30);
      const steamR = 6 + ((time * 10 + i * 5) % 14);
      ctx.beginPath();
      ctx.arc(x, steamY, steamR, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (feat.type === 'HOLOGRAM') {
    // Floating corporate hologram billboard
    const holoY = y - 35 + Math.sin(time * 3) * 3;
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.7)';
    ctx.fillStyle = 'rgba(0, 240, 255, 0.15)';
    ctx.lineWidth = 1.5;
    ctx.fillRect(x - 22, holoY - 14, 44, 24);
    ctx.strokeRect(x - 22, holoY - 14, 44, 24);
    ctx.fillStyle = '#00F0FF';
    ctx.font = 'bold 8px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('NEURO_CORP', x, holoY + 2);
  }

  ctx.restore();
}

// =========================================================================
// 9. TERMINALS, GATES & KEYS
// =========================================================================
function drawThemedTerminal(ctx: CanvasRenderingContext2D, x: number, y: number, isHacked: boolean, time: number) {
  ctx.save();
  ctx.fillStyle = '#1c2230';
  ctx.fillRect(x - 6, y - 24, 12, 24);

  // Screen
  ctx.fillStyle = isHacked ? '#00FF7F' : '#FFB000';
  ctx.shadowColor = isHacked ? '#00FF7F' : '#FFB000';
  ctx.shadowBlur = 8;
  ctx.fillRect(x - 5, y - 22, 10, 8);

  if (!isHacked) {
    const floatY = y - 34 + Math.sin(time * 4) * 3;
    ctx.fillStyle = '#FFB000';
    ctx.beginPath();
    ctx.arc(x, floatY, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawThemedLaserGate(ctx: CanvasRenderingContext2D, x: number, y: number, isUnlocked: boolean, time: number) {
  ctx.save();
  ctx.fillStyle = '#2c3547';
  ctx.fillRect(x - 4, y - 38, 8, 38);

  if (!isUnlocked) {
    ctx.strokeStyle = '#FF2A6D';
    ctx.shadowColor = '#FF2A6D';
    ctx.shadowBlur = 12;
    ctx.lineWidth = 2.5;
    for (let offset = 8; offset <= 32; offset += 8) {
      ctx.beginPath();
      ctx.moveTo(x - 3, y - offset);
      ctx.lineTo(x + 3, y - offset);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawThemedKeycard(ctx: CanvasRenderingContext2D, x: number, y: number, passType: string, time: number) {
  ctx.save();
  const floatY = y - 18 + Math.sin(time * 3) * 4;
  ctx.fillStyle = '#FFB000';
  ctx.shadowColor = '#FFB000';
  ctx.shadowBlur = 10;
  ctx.fillRect(x - 6, floatY - 4, 12, 8);
  ctx.fillStyle = '#000';
  ctx.fillRect(x - 3, floatY - 2, 6, 4);
  ctx.restore();
}

function drawThemedExtractionDoor(
  ctx: CanvasRenderingContext2D, 
  theme: SectorTheme, 
  x: number, 
  y: number, 
  time: number
) {
  ctx.save();
  const doorW = 30;
  const doorH = 54;

  ctx.fillStyle = '#061722';
  ctx.fillRect(x - doorW / 2, y - doorH, doorW, doorH);

  // Glowing Cyan Portal Frame
  ctx.strokeStyle = '#00F0FF';
  ctx.lineWidth = 3.5;
  ctx.shadowColor = '#00F0FF';
  ctx.shadowBlur = 16;
  ctx.strokeRect(x - doorW / 2, y - doorH, doorW, doorH);

  // Moving scanline
  const scanY = y - doorH + ((time * 30) % doorH);
  ctx.fillStyle = 'rgba(0, 240, 255, 0.45)';
  ctx.fillRect(x - doorW / 2 + 2, scanY, doorW - 4, 3);

  ctx.shadowBlur = 0;
  ctx.fillStyle = '#00F0FF';
  ctx.font = 'bold 9px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('EXIT GLITCH', x, y - doorH - 8);

  ctx.restore();
}

// =========================================================================
// 10. ENEMY ENTITIES & VISION (With Speech Bubbles)
// =========================================================================
function drawEnemyVisionSide(
  ctx: CanvasRenderingContext2D, 
  enemy: any, 
  x: number, 
  y: number, 
  unitPx: number, 
  time: number
) {
  ctx.save();
  if (enemy.type === 'DRONE') {
    const droneY = y - 36;
    const coneGrad = ctx.createLinearGradient(0, droneY, 0, y);
    coneGrad.addColorStop(0, 'rgba(0, 240, 255, 0.45)');
    coneGrad.addColorStop(1, 'rgba(0, 240, 255, 0.02)');
    ctx.fillStyle = coneGrad;

    ctx.beginPath();
    ctx.moveTo(x, droneY);
    ctx.lineTo(x - 38, y);
    ctx.lineTo(x + 38, y);
    ctx.closePath();
    ctx.fill();
  } else if (enemy.type === 'TURRET') {
    const angleRad = ((enemy.turretAngle || 0) * Math.PI) / 180;
    const sweepRange = enemy.visionRange * unitPx * 0.7;

    const turretGrad = ctx.createRadialGradient(x, y - 20, 10, x, y - 20, sweepRange);
    turretGrad.addColorStop(0, 'rgba(255, 42, 109, 0.6)');
    turretGrad.addColorStop(1, 'rgba(255, 42, 109, 0.03)');
    ctx.fillStyle = turretGrad;

    ctx.beginPath();
    ctx.moveTo(x, y - 20);
    ctx.arc(x, y - 20, sweepRange, angleRad - 0.25, angleRad + 0.25);
    ctx.closePath();
    ctx.fill();
  } else {
    // Police or Agent Hunter forward flashlight
    const facingRight = enemy.facing === 'RIGHT';
    const beamDist = enemy.visionRange * unitPx * 0.65;
    const beamDir = facingRight ? 1 : -1;

    const beamGrad = ctx.createLinearGradient(x, y - 18, x + beamDir * beamDist, y - 18);
    const color = enemy.type === 'AGENT_HUNTER' ? '255, 20, 50' : '255, 42, 109';
    beamGrad.addColorStop(0, `rgba(${color}, 0.4)`);
    beamGrad.addColorStop(1, `rgba(${color}, 0.02)`);
    ctx.fillStyle = beamGrad;

    ctx.beginPath();
    ctx.moveTo(x + beamDir * 6, y - 18);
    ctx.lineTo(x + beamDir * beamDist, y - 32);
    ctx.lineTo(x + beamDir * beamDist, y);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function drawEnemyEntitySide(ctx: CanvasRenderingContext2D, enemy: any, x: number, y: number, time: number) {
  ctx.save();
  const isStunned = enemy.stunTurns > 0;

  if (enemy.type === 'DRONE') {
    const hoverY = y - 36 + Math.sin(time * 6) * 3;

    // Propeller spinning blur
    ctx.fillStyle = '#00F0FF';
    ctx.shadowColor = '#00F0FF';
    ctx.shadowBlur = 6;
    const propW = 28 + Math.sin(time * 25) * 8;
    ctx.fillRect(x - propW / 2, hoverY - 10, propW, 2);
    ctx.shadowBlur = 0;

    // Shaft & Capsule body
    ctx.fillStyle = '#343f52';
    ctx.fillRect(x - 1.5, hoverY - 10, 3, 4);

    ctx.fillStyle = isStunned ? '#556275' : '#1e2638';
    ctx.beginPath();
    ctx.ellipse(x, hoverY, 15, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#00F0FF';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = isStunned ? '#888' : '#FF2A6D';
    ctx.beginPath();
    ctx.arc(x, hoverY + 1, 3.5, 0, Math.PI * 2);
    ctx.fill();
  } else if (enemy.type === 'TURRET') {
    ctx.fillStyle = '#1c2230';
    ctx.fillRect(x - 8, y - 30, 8, 20);

    const angleRad = ((enemy.turretAngle || 0) * Math.PI) / 180;
    ctx.save();
    ctx.translate(x, y - 20);
    ctx.rotate(angleRad);
    ctx.fillStyle = '#FF2A6D';
    ctx.fillRect(0, -3.5, 15, 7);
    ctx.restore();
  } else if (enemy.type === 'AGENT_HUNTER') {
    // Relentless Agent Hunter: Jet-black suit, crimson glowing eyes
    const facingRight = enemy.facing === 'RIGHT';
    const legPhase = Math.sin(time * 13);

    ctx.strokeStyle = '#020408';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x, y - 10);
    ctx.lineTo(x + legPhase * 9, y);
    ctx.moveTo(x, y - 10);
    ctx.lineTo(x - legPhase * 9, y);
    ctx.stroke();

    ctx.fillStyle = '#0a0e17';
    ctx.fillRect(x - 5, y - 26, 10, 16);

    ctx.fillStyle = '#e8beac';
    ctx.beginPath();
    ctx.arc(x, y - 31, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#FF1A3C';
    ctx.shadowColor = '#FF1A3C';
    ctx.shadowBlur = 10;
    ctx.fillRect(x + (facingRight ? 1 : -5), y - 33, 5, 3);
    ctx.shadowBlur = 0;
  } else {
    // Matrix Police / Guard: Coral-Magenta Uniform
    const facingRight = enemy.facing === 'RIGHT';
    const legPhase = Math.sin(time * 7);

    ctx.strokeStyle = '#121824';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(x, y - 10);
    ctx.lineTo(x + legPhase * 7, y);
    ctx.moveTo(x, y - 10);
    ctx.lineTo(x - legPhase * 7, y);
    ctx.stroke();

    ctx.fillStyle = isStunned ? '#556275' : '#FF2A6D';
    ctx.fillRect(x - 5, y - 24, 10, 14);

    ctx.strokeStyle = isStunned ? '#556275' : '#FF2A6D';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x, y - 22);
    ctx.lineTo(x - legPhase * 6, y - 12);
    ctx.stroke();

    ctx.fillStyle = '#e8beac';
    ctx.beginPath();
    ctx.arc(x, y - 29, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#121824';
    ctx.fillRect(x - 6, y - 35, 12, 4);
  }

  // Speech Bubble Alert Indicator (?, !, Stun)
  if (isStunned) {
    ctx.fillStyle = '#FFB000';
    ctx.font = 'bold 11px monospace';
    ctx.fillText('⚡STUN', x - 14, y - 44);
  } else if (enemy.speechBubble) {
    const bubbleColor = enemy.speechBubble === '!' ? '#FF2A6D' : '#FFB000';
    ctx.fillStyle = bubbleColor;
    ctx.shadowColor = bubbleColor;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(x, y - 44, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#000';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(enemy.speechBubble, x, y - 40);
  }

  ctx.restore();
}

// =========================================================================
// 11. LUMINOUS KURZGESAGT JEV (Neon Cyan Hero That POPS)
// =========================================================================
function drawLuminousJev(
  ctx: CanvasRenderingContext2D, 
  x: number, 
  y: number, 
  facing: 'LEFT' | 'RIGHT', 
  status: string, 
  isHidingInCover: boolean,
  time: number
) {
  ctx.save();

  const isMoving = status === 'RUNNING' || status === 'JUMPING';
  const legCycle = isMoving ? Math.sin(time * 15) : 0;
  const armCycle = -legCycle;
  const facingDir = facing === 'RIGHT' ? 1 : -1;

  // If hiding in cover, draw translucent stealth cloak
  if (isHidingInCover) {
    ctx.globalAlpha = 0.45;
  }

  // Radiant cyan outer aura
  ctx.shadowColor = '#00F0FF';
  ctx.shadowBlur = isMoving ? 14 : 8;

  // 1. Navy Pants / Scissoring Legs
  ctx.strokeStyle = '#0d1626';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';

  ctx.beginPath();
  ctx.moveTo(x, y - 11);
  ctx.lineTo(x + legCycle * 8 * facingDir, y);
  ctx.moveTo(x, y - 11);
  ctx.lineTo(x - legCycle * 8 * facingDir, y);
  ctx.stroke();

  // 2. Luminous Cyan Torso (#00F0FF)
  ctx.fillStyle = '#00F0FF';
  ctx.beginPath();
  ctx.roundRect(x - 5.5, y - 27, 11, 16, [3, 3, 1, 1]);
  ctx.fill();

  // 3. Darker Cyan Sleeves / Swinging Arms
  ctx.strokeStyle = '#00b5cc';
  ctx.lineWidth = 3.2;
  ctx.beginPath();
  ctx.moveTo(x, y - 25);
  ctx.lineTo(x + armCycle * 8 * facingDir, y - 14);
  ctx.stroke();

  // 4. Head
  ctx.fillStyle = '#fce2c7';
  ctx.beginPath();
  ctx.arc(x, y - 32, 5.5, 0, Math.PI * 2);
  ctx.fill();

  // 5. Bright White / Cyan Glowing Visor
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = '#00F0FF';
  ctx.shadowBlur = 12;
  const visorX = facing === 'RIGHT' ? x + 1 : x - 6;
  ctx.fillRect(visorX, y - 34, 5.5, 3.5);

  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1.0;

  // Stealth Cover Indicator Label
  if (isHidingInCover) {
    ctx.fillStyle = '#00F0FF';
    ctx.font = 'bold 8px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('STEALTH_COVER', x, y - 44);
  }

  ctx.restore();
}

// =========================================================================
// 12. FOCUS RETICLE
// =========================================================================
function drawTargetReticle(
  ctx: CanvasRenderingContext2D,
  targetFocus: string,
  state: SectorState,
  unitPx: number,
  streetY: number,
  rooftopY: number,
  alleyY: number,
  time: number
) {
  let targetX = state.extractionPoint.x * unitPx;
  let targetY = streetY - 55;

  if (targetFocus.includes('LADDER') && state.layout?.ladders[0]) {
    targetX = state.layout.ladders[0].x * unitPx;
    targetY = rooftopY - 20;
  } else if (targetFocus.includes('GAP') && state.layout?.gaps[0]) {
    targetX = ((state.layout.gaps[0].startX + state.layout.gaps[0].endX) / 2) * unitPx;
    targetY = streetY - 20;
  } else if (targetFocus.includes('ALLEY') && state.layout?.ramps[0]) {
    targetX = state.layout.ramps[0].startX * unitPx;
    targetY = alleyY - 20;
  } else if (targetFocus.includes('GATE') && state.gates[0]) {
    targetX = state.gates[0].x * unitPx;
    targetY = streetY - 30;
  }

  ctx.save();
  const pulse = Math.sin(time * 8) * 2;
  const r = 12 + pulse;

  ctx.strokeStyle = '#00F0FF';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(targetX, targetY, r, 0, Math.PI * 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(targetX - r - 4, targetY);
  ctx.lineTo(targetX - r + 3, targetY);
  ctx.moveTo(targetX + r - 3, targetY);
  ctx.lineTo(targetX + r + 4, targetY);
  ctx.moveTo(targetX, targetY - r - 4);
  ctx.lineTo(targetX, targetY - r + 3);
  ctx.moveTo(targetX, targetY + r - 3);
  ctx.lineTo(targetX, targetY + r + 4);
  ctx.stroke();

  ctx.fillStyle = '#00F0FF';
  ctx.font = 'bold 8px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(`TARGET: [${targetFocus}]`, targetX, targetY - r - 6);
  ctx.restore();
}
