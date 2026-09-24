# Product Requirement & Game Design Document (PRD & GDD)
## Project Name: Escape the Matrix
**Sub-title:** Autonomous AI Agent City Stealth Simulation & Management Game  
**Author:** Engineering & Game Design Team  
**Version:** 5.0.0 (Complete Cyberpunk Matrix City & DB-Ready Specification)  
**Status:** Approved for Core Implementation  

---

## 1. Executive Summary & Narrative Concept

### 1.1 Core Premise: "Unleash Jev (The Neo Protocol)"
*Escape the Matrix* is an **autonomous AI agent management and cyberpunk stealth simulation game** built for high-speed browser sessions.

The player acts as **The Operator / Matrix Architect**. Jev is a humanoid digital entity trapped inside a rogue cyberpunk city simulation. Rather than controlling Jev manually with WASD or arrow keys, the player tunes Jev's neural sub-systems in the **Operator Lab** (allocating stat points & behavior directives) and clicks **`[ UNLEASH JEV ]`**.

Once unleashed, Jev navigates the city sectors autonomously: sneaking past police patrols, ducking behind urban cover, hacking city data terminals, dodging scanner turrets, and escaping relentless Matrix Enforcers to reach the Extraction Glitch.

```
┌───────────────────────────────────────────────────────────────────────────┐
│                          OPERATOR GAMEPLAY LOOP                           │
├───────────────────────────────────────────────────────────────────────────┤
│ 1. CONFIGURATION: Allocate Stat Points & Behavior Directives in Lab       │
│ 2. DEPLOYMENT: Click [UNLEASH JEV] to release the agent into the district │
│ 3. OBSERVE & INTERVENE: Watch real-time AI reasoning, LoS & emergency buttons │
│ 4. UPGRADE: Spend Sector Data Points to upgrade Jev between levels (1-5)  │
└───────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Narrative Arc: The Escape Path

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          THE 5-DISTRICT ESCAPE ARC                          │
│                                                                             │
│ [Sector 01] ───► [Sector 02] ───► [Sector 03] ───► [Sector 04] ───► [Sector 05]│
│ Sub-Grid Slums   Downtown Plaza   Cyber Highway    Corporate Core  The Citadel Glitch│
│ (Awakening)      (Perimeter Gate) (Fast Patrols)   (Turrets & Lasers)(Agent Hunters) │
└─────────────────────────────────────────────────────────────────────────────┘
```

1. **Sector 01: Sub-Grid Slums (Awakening)**  
   *Story*: Jev awakens in the dark, neon-lit alleyways of the city slums. Local police drones patrol the perimeter. Jev must learn to use shadows and reach the sub-grid access node.
2. **Sector 02: Downtown Financial Plaza (Security Breach)**  
   *Story*: Jev ascends to the financial district. Keycard security gates block the highway access. Jev must hack data terminals while avoiding Matrix Police patrols.
3. **Sector 03: High-Riot Cyber Highway (High Alert)**  
   *Story*: The Matrix system detects an anomaly. Fast patrol drones scan the multi-lane grid highway. Corrupted data tiles glitch the environment.
4. **Sector 04: Corporate Central Core (Heavy Defense)**  
   *Story*: Jev breaches the mega-corporate skyscraper district. Automated rooftop turrets rotate continuously and laser gates seal off main routes.
5. **Sector 05: The Citadel Extraction Glitch (Total Lockdown)**  
   *Story*: The core simulation enters Total Lockdown. Relentless **Agent Hunters** spawn to terminate Jev. Jev must hack the Master Core and jump into the Extraction Glitch to wake up in the real world!

---

## 2. Streamlined Monorepo Architecture

The project monorepo is cleanly structured into two primary application services (`apps/frontend` and `apps/backend`) and a single lightweight shared types package (`packages/shared-types`).

All core game mechanics, pathfinding engines, vision raycasting, level logic, and Jev AI evaluators reside in the **Backend Engine**, making the Frontend purely a reactive, client-side visual renderer and UI layer.

```plaintext
escape-the-matrix/
├── .github/                       # CI/CD Workflows
│   └── workflows/
│       ├── ci.yml                 # Typechecking & Linting
│       └── deploy.yml             # Vercel Deployment Trigger
│
├── apps/
│   ├── frontend/                  # Next.js 14+ Client App (UI, Render Engine, HUD)
│   │   ├── public/
│   │   │   ├── audio/             # Sound Effects & Cyberpunk Synth Loops
│   │   │   └── textures/          # Vector Graphics (Jev, Enemies, City Tiles)
│   │   ├── src/
│   │   │   ├── app/               # App Router Pages (`/play`, `/lab`, `/debrief`)
│   │   │   ├── components/        # React & PixiJS Canvas Viewport Components
│   │   │   │   ├── canvas/        # Grid Layer, Shadow Mask Layer, Entity Layer
│   │   │   │   ├── hud/           # Jev Telemetry Panel, Stat Bars, AI Thought Logs
│   │   │   │   └── lab/           # Operator Config Lab & Stat Upgrade Interface
│   │   │   ├── hooks/             # Custom React Hooks (`useGameClient`)
│   │   │   ├── store/             # Zustand UI & Telemetry Stores
│   │   │   └── styles/            # Tailwind Global Config & Kurzgesagt Color Tokens
│   │   └── package.json
│   │
│   └── backend/                   # Express / Serverless API Engine & Game Mechanics
│       ├── api/                   # Vercel Serverless Function Bridge (`index.ts`)
│       └── src/
│           ├── config/            # Env Variable Validation & DB Config
│           ├── controllers/       # Route Controllers (Game, Jev, Sectors)
│           ├── engine/            # ALL GAME MECHANICS & SIMULATION LOGIC
│           │   ├── grid.ts        # Isometric & Orthogonal City Grid Math
│           │   ├── vision.ts      # Line of Sight & Raycasting Algorithm
│           │   ├── pathfinding.ts # A* Heuristic Pathfinding Algorithm
│           │   ├── state-machine.ts# Sector Turn/Tick Simulation Loop
│           │   └── entities.ts    # Jev & Enemy NPC AI Behaviors
│           ├── maps/              # Sector Definitions (Sectors 01 to 05)
│           ├── services/
│           │   ├── jev/           # Vercel AI SDK Integration (`typesafe-ai/jev`)
│           │   └── game/          # Game Session & Upgrade Calculators
│           ├── routes/            # `/api/matrix-eval`, `/api/game/*`
│           └── server.ts          # Local Dev Express Listener (Port 5000)
│
├── packages/
│   └── shared-types/              # Shared TypeScript Schemas & Contracts
│       └── src/
│           ├── game.ts            # Grid, Tile, Enemy, Resource Types
│           ├── jev.ts             # Jev AI Evaluator Input/Output Contracts
│           ├── db.ts              # DB-Ready Entity Schemas & Tables
│           └── index.ts
│
├── package.json                   # Monorepo Root Script Runner
├── turbo.json                     # Turborepo Build Cache Configuration
├── vercel.json                    # Unified Vercel Route Dispatcher
└── .env                           # Vercel AI Gateway API Keys
```

---

## 3. Database Schemas & Data Models (DB-Ready Architecture)

Although V1 operates in-memory for zero-friction browser sessions, **all data structures are formatted as strict Database Tables / ORM Entities** (compatible with Prisma, Drizzle, PostgreSQL, or Supabase). This allows instant database integration in future updates.

### 3.1 Entity Relationship Overview

```
┌──────────────────┐       1:1       ┌──────────────────┐
│  OPERATOR_SESSION│ ───────────────► │    JEV_STATS     │
└────────┬─────────┘                 └──────────────────┘
         │
         │ 1:N
         ▼
┌──────────────────┐       1:N       ┌──────────────────┐
│   SECTOR_RUNS    │ ───────────────► │  TELEMETRY_LOGS  │
└────────┬─────────┘                 └──────────────────┘
         │
         │ N:1
         ▼
┌──────────────────┐
│SECTOR_DEFINITIONS│
└──────────────────┘
```

### 3.2 Database Table Specifications

#### 1. Table: `operator_sessions`
Represents an active player session and overall run state.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `VARCHAR(36)` | PRIMARY KEY, UUID | Unique session identifier |
| `current_sector_id` | `INTEGER` | NOT NULL, DEFAULT 1 | Current sector unlocked (1-5) |
| `data_points` | `INTEGER` | NOT NULL, DEFAULT 0 | Accumulated currency for stat upgrades |
| `status` | `VARCHAR(20)` | NOT NULL | `'IN_PROGRESS'`, `'COMPLETED'`, `'FAILED'` |
| `created_at` | `TIMESTAMP` | NOT NULL | Session start timestamp |
| `updated_at` | `TIMESTAMP` | NOT NULL | Last update timestamp |

#### 2. Table: `jev_stats`
Stores Jev's sub-system upgrade stats allocated by the player in the Operator Lab.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `VARCHAR(36)` | PRIMARY KEY, UUID | Unique stat record ID |
| `session_id` | `VARCHAR(36)` | FOREIGN KEY (`operator_sessions.id`) | Belongs to operator session |
| `stealth_matrix` | `INTEGER` | NOT NULL, DEFAULT 1 | Noise footprint & detection delay (Level 1-10) |
| `processing_hz` | `INTEGER` | NOT NULL, DEFAULT 1 | Movement tick velocity & speed (Level 1-10) |
| `hack_bypass` | `INTEGER` | NOT NULL, DEFAULT 1 | Gate/terminal hacking speed (Level 1-10) |
| `armor_shield` | `INTEGER` | NOT NULL, DEFAULT 1 | Max HP & hazard tile resistance (Level 1-10) |
| `energy_reactor` | `INTEGER` | NOT NULL, DEFAULT 1 | Passive energy recharge rate (Level 1-10) |
| `behavior_directive`| `VARCHAR(30)`| NOT NULL, DEFAULT `'CAUTIOUS'` | `'CAUTIOUS'`, `'SPRINT'`, `'SCAVENGER'` |

#### 3. Table: `sector_definitions`
Contains static or procedural level layout data.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `sector_id` | `INTEGER` | PRIMARY KEY | Sector level number (1 to 5) |
| `name` | `VARCHAR(100)` | NOT NULL | E.g., `"Sub-Grid Slums"`, `"Corporate Core"` |
| `grid_size` | `INTEGER` | NOT NULL | $N \times N$ matrix size (e.g. 8, 10, 12, 14, 16) |
| `time_limit` | `INTEGER` | NOT NULL | Sector timer in seconds (60, 50, 45, 40, 35) |
| `base_points` | `INTEGER` | NOT NULL | Completion base Data Points reward |
| `tile_map_json` | `JSONB` | NOT NULL | 2D matrix of tile types (`WALL`, `FLOOR`, `GATE`) |
| `enemy_spawns_json` | `JSONB` | NOT NULL | Initial NPC types, positions & patrol routes |

#### 4. Table: `sector_runs`
Logs performance metrics for each sector attempt.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `VARCHAR(36)` | PRIMARY KEY, UUID | Unique sector run ID |
| `session_id` | `VARCHAR(36)` | FOREIGN KEY (`operator_sessions.id`) | Belongs to operator session |
| `sector_id` | `INTEGER` | FOREIGN KEY (`sector_definitions.sector_id`) | Sector attempted |
| `status` | `VARCHAR(20)` | NOT NULL | `'SUCCESS'`, `'FAILED_HP'`, `'FAILED_TIME'` |
| `hp_remaining` | `INTEGER` | NOT NULL | Health remaining at run end |
| `time_remaining` | `INTEGER` | NOT NULL | Time remaining at run end |
| `terminals_hacked` | `INTEGER` | NOT NULL | Number of bonus terminals hacked |
| `data_points_earned`| `INTEGER`| NOT NULL | Total points awarded for run |
| `duration_ms` | `INTEGER` | NOT NULL | Total run execution time in milliseconds |

#### 5. Table: `jev_telemetry_logs`
Stores Jev's real-time AI thought stream telemetry per tick.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `VARCHAR(36)` | PRIMARY KEY, UUID | Log entry ID |
| `run_id` | `VARCHAR(36)` | FOREIGN KEY (`sector_runs.id`) | Belongs to sector run |
| `tick_number` | `INTEGER` | NOT NULL | Simulation tick index |
| `detection_risk` | `FLOAT` | NOT NULL | AI-calculated detection risk (0.0 to 1.0) |
| `action_executed` | `VARCHAR(50)` | NOT NULL | E.g., `'MOVE_STEALTH'`, `'HACK_GATE'`, `'USE_EMP'` |
| `tactical_thought` | `TEXT` | NOT NULL | 1-sentence AI internal reasoning log |
| `created_at` | `TIMESTAMP` | NOT NULL | Log entry creation timestamp |

---

## 4. Game Mechanics & Base Systems

### 4.1 The 3-Phase Operator Loop

```
┌─────────────────────────┐      ┌─────────────────────────┐      ┌─────────────────────────┐
│  PHASE 1: OPERATOR LAB  │ ───► │  PHASE 2: AUTONOMOUS    │ ───► │  PHASE 3: SECTOR DEBRIEF│
│ (Stat Config & Directives)      │  CITY ESCAPE RUN        │      │  & UPGRADE PROTOCOLS    │
└─────────────────────────┘      └─────────────────────────┘      └─────────────────────────┘
```

#### Phase 1: Operator Config Lab (Pre-Run)
The player allocates **Stat Points** across Jev's 5 core neural modules:

| Sub-System Stat | Gameplay Effect on Autonomous Behavior |
| :--- | :--- |
| **1. Stealth Matrix** | Reduces noise footprint & slows enemy vision spot speed |
| **2. Processing Hz** | Increases Jev's movement tick speed and action speed |
| **3. Hack Bypass** | Accelerates time required to bypass security gates and terminals |
| **4. Integrity Armor**| Increases Max HP & grants resistance to corrupted grid tiles |
| **5. Energy Reactor** | Accelerates passive energy recovery for emergency abilities |

* **Behavior Directives** (Strategy Toggles):
  * **Cautious Crawl**: Jev sticks to alley covers and avoids vision cones at all costs.
  * **Aggressive Sprint**: Jev takes the shortest path to extraction, using EMPs when spotted.
  * **Data Scavenger**: Jev strays off path to hack extra Data Terminals for maximum upgrade points.

* **Session Model**: Page refresh resets the run (simple, zero-friction in-memory session).

#### Phase 2: Active Sector Simulation ("Unleash Jev")
* Click **`[ UNLEASH JEV ]`**.
* **Backend Engine Simulation Loop**:
  1. **Sense Grid**: Reads $N \times M$ city grid, NPC positions, vision cones, terminal nodes, and sector countdown timer.
  2. **Evaluate State**: Sends snapshot to Jev evaluator (`typesafe-ai/jev`), receiving `detectionRisk`, `optimalPath`, and `tacticalAction`.
  3. **Execute Action**: Jev runs, crouches, hacks, or activates an ability.
  4. **Stream Telemetry**: WebSocket/SSE streams live AI reasoning to the Frontend HUD (`[JEV_AI]: Matrix Police 02 approaching. Cloaking in shadow alley...`).
* **Operator Emergency Overrides** (Limited Player Interventions):
  * `[OVERDRIVE EMP]`: Stuns adjacent drones/police (Costs 50 Energy).
  * `[EMERGENCY REROUTE]`: Forces Jev to abandon current path and retreat to cover.

#### Phase 3: Sector Debrief & Node Upgrades (Post-Run)
* Clearing a sector rewards **Data Points ($\mathcal{DP}$)**:
  $$\mathcal{DP} = \text{Base Points} + (\text{HP Left} \times 10) + (\text{Time Bonus}) + (\text{Terminals Hacked} \times 50)$$
* Player spends $\mathcal{DP}$ to upgrade stats before deploying into the next sector.

---

## 5. Entity & NPC Catalog (Cyberpunk City Setting)

### 5.1 Jev (The Humanoid Runner)
* **Visual**: Sleek Kurzgesagt-style vector humanoid character with a glowing neon trench coat, cyber visor, and fluid running/sneaking animations.
* **Attributes**: 3 Integrity HP, 100 Energy Max, Noise Footprint (3 tiles running, 1 tile crouching).

### 5.2 Enemy NPCs & Hazards

```
┌───────────────────────────────────────────────────────────────────────────┐
│                           CITY ENEMY NPC CATALOG                          │
├───────────────────┬───────────────────┬───────────────────┬───────────────┤
│ SECURITY DRONES   │ MATRIX POLICE     │ SCANNER TURRETS   │ AGENT HUNTERS │
│ (Flying Recce)    │ (Patrolling Enforcers)│ (Wall Rotators)   │ (Lockdown AI) │
├───────────────────┼───────────────────┼───────────────────┼───────────────┤
│ Fast 3-tile patrol│ 4-tile forward LoS│ Stationary 90 deg │ Spawns at 100%│
│ vision cones      │ Call backup on spot│ rotational scan  │ Alert; A* pursuit│
└───────────────────┴───────────────────┴───────────────────┴───────────────┘
```

1. **Security Patrol Drones**
   * Flying vector drones with sweeping cyan vision cones.
2. **Matrix Police Enforcers**
   * Humanoid police units patrolling streets and plazas. If Jev enters their vision cone, alert level spikes.
3. **Automated Scanner Turrets**
   * Mounted on cyber buildings. Rotates 90 degrees clockwise every turn with a 5-tile straight scanning beam.
4. **Agent Hunters (Boss AI)**
   * Spawns during **Total Lockdown (100% Alert)** in Sector 05. Black suit vector humanoid with red glowing eyes that relentlessly pursues Jev via A* shortest path algorithm.

---

## 6. Detailed 5-District Level Specifications

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          5-DISTRICT LEVEL MATRIX                            │
├─────────┬──────────────────────┬───────────┬──────────────┬─────────────────┤
│ Sector  │ District Name        │ Grid Size │ Time Limit   │ Enemy Forces    │
├─────────┼──────────────────────┼───────────┼──────────────┼─────────────────┤
│ **01**  │ Sub-Grid Slums       │ 8 x 8     │ 60 Seconds   │ 1 Security Drone│
│ **02**  │ Downtown Plaza       │ 10 x 10   │ 50 Seconds   │ 2 Matrix Police │
│ **03**  │ Cyber Highway        │ 12 x 12   │ 45 Seconds   │ 3 Drones + Hazard│
│ **04**  │ Corporate Core       │ 14 x 14   │ 40 Seconds   │ 2 Police + 2 Turrets│
│ **05**  │ The Citadel Glitch   │ 16 x 16   │ 35 Seconds   │ 4 Police + Agent Hunter│
└─────────┴──────────────────────┴───────────┴──────────────┴─────────────────┘
```

#### Sector 01: "Sub-Grid Slums" (Tutorial Run)
* **Visual Theme**: Rain-slicked dark alleyways with low neon signs.
* **Objective**: Escape to Sub-Grid Access Portal at $(7, 7)$.
* **Grid**: $8 \times 8$ | **Time Limit**: 60 seconds | **Enemies**: 1 Security Drone.

#### Sector 02: "Downtown Financial Plaza" (Security Gates)
* **Visual Theme**: Polished obsidian tiles with cyan cyber billboards.
* **Objective**: Acquire `ALPHA_PASS` $\rightarrow$ Unlock Security Gate $\rightarrow$ Extract.
* **Grid**: $10 \times 10$ | **Time Limit**: 50 seconds | **Enemies**: 2 Matrix Police units.

#### Sector 03: "High-Riot Cyber Highway" (Corrupted Data Spikes)
* **Visual Theme**: Glowing multi-lane neon highway with glitching crimson floor tiles.
* **Objective**: Hack 2 Highway Terminals to unlock Glitch Vortex.
* **Grid**: $12 \times 12$ | **Time Limit**: 45 seconds | **Enemies**: 3 Patrol Drones + Corrupted Grid tiles.

#### Sector 04: "Corporate Central Core" (Scanner Turrets)
* **Visual Theme**: Towering corporate skyscraper roof with warning red light grids.
* **Objective**: Bypass 2 Automated Scanner Turrets & extract before timer hits 0.
* **Grid**: $14 \times 14$ | **Time Limit**: 40 seconds | **Enemies**: 2 Matrix Police + 2 Scanner Turrets.

#### Sector 05: "The Citadel Extraction Glitch" (Final Escape)
* **Visual Theme**: Matrix code rain vortex background, pulsing red alert HUD.
* **Objective**: Hack Master Citadel Core $\rightarrow$ Survive Agent Hunter Pursuit $\rightarrow$ Escape the Matrix!
* **Grid**: $16 \times 16$ | **Time Limit**: 35 seconds | **Enemies**: 4 Matrix Police + 1 Relentless Agent Hunter.

---

## 7. Jev AI Evaluation Integration (`typesafe-ai/jev`)

As specified in `jev-docs.md`, Jev queries Vercel AI Gateway using `experimental_evaluate` with `model: 'typesafe-ai/jev'`.

```typescript
// apps/backend/src/services/jev/evaluator.ts
import { experimental_evaluate as evaluate } from 'ai';

export async function evaluateMatrixState(snapshot: JevStateSnapshot) {
  const result = await evaluate({
    model: 'typesafe-ai/jev',
    state: JSON.stringify({
      sector: snapshot.sectorId,
      jevPosition: { x: snapshot.player.x, y: snapshot.player.y },
      jevHealth: snapshot.player.hp,
      enemies: snapshot.enemies,
      timeRemaining: snapshot.timeLimit,
      directives: snapshot.directives,
    }),
    questions: {
      detectionRisk: {
        type: 'number',
        instructions: 'Calculate probability of detection from 0.0 (safe) to 1.0 (imminent spot).',
      },
      recommendedAction: {
        type: 'choice',
        options: ['MOVE_STEALTH', 'MOVE_SPRINT', 'HACK_GATE', 'USE_EMP', 'USE_DECOY'],
        instructions: 'Select optimal autonomous action based on risk and time remaining.',
      },
      tacticalThought: {
        type: 'string',
        instructions: 'Provide concise 1-sentence internal AI reasoning log for the player HUD.',
      },
    },
  });

  return result;
}
```

---

## 8. Kurzgesagt Vector Aesthetic & Visual Style Guide

```
┌──────────────────────────────────────────────────────────────────────────┐
│                      CYBERPUNK MATRIX COLOR PALETTE                      │
├──────────────────┬──────────────────┬──────────────────┬─────────────────┤
│ MATRIX VOID BASE │ NEON CYAN ACCENT │ MAGENTA HAZARD   │ AMBER DATA CORES│
│ #0A0E17          │ #00F0FF          │ #FF007F          │ #FFB000         │
└──────────────────┴──────────────────┴──────────────────┴─────────────────┘
```

1. **Kurzgesagt Flat Vector Art**: Rounded geometric shapes, soft rim gradients, clean drop shadows, bold outlines.
2. **Cyberpunk City Tile Map**: Rain-slicked slate streets, glowing grid lines, neon billboards, dark building covers.
3. **Character Rendering**: Jev rendered as a sleek vector humanoid runner with a glowing visor and dynamic direction trail.
4. **Neon Glow Shaders**: Bloom shaders on vision cones, security barriers, and extraction glitches.

---

## 9. Summary & Execution Roadmap

| Step | Goal | Key Deliverable |
| :---: | :--- | :--- |
| **1** | **Monorepo Setup** | `apps/frontend`, `apps/backend`, `packages/shared-types` with Turborepo |
| **2** | **Backend Simulation Engine** | Grid math, vision raycasting, A* pathfinding, state machine & DB schemas |
| **3** | **Frontend Render Viewport** | Next.js 14+ app, PixiJS Canvas renderer, HUD telemetry & Operator Lab UI |
| **4** | **Jev AI Evaluator** | Connect `typesafe-ai/jev` via Vercel AI SDK in `/api/matrix-eval` |
| **5** | **5 District Sectors & Polish** | Sectors 01 to 05 maps, enemy NPCs (Drones, Police, Turrets, Agent Hunter), Kurzgesagt vector graphics |