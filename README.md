# Escape the Matrix

An autonomous AI agent stealth game where **you don't play — you unleash.**

---

## What is it?

You are **The Operator**. Jev is a humanoid digital entity trapped inside a cyberpunk city simulation — think Neo, but as an AI agent.

Your job is to tune Jev's neural stats, pick a tactical strategy, and hit **[ UNLEASH JEV ]**. From there, Jev navigates 5 escalating city sectors autonomously: dodging patrol drones, hacking security gates, evading scanner turrets, and racing to the extraction glitch — all while you watch the live AI reasoning stream and trigger emergency overrides when needed.

---

## How it Works

1. **Configure** — Allocate upgrade points across Jev's 5 neural sub-systems in the Operator Lab.
2. **Unleash** — Click the button. Jev plans, moves, and thinks on its own.
3. **Observe** — Watch the real-time AI telemetry panel stream Jev's tactical decisions.
4. **Upgrade** — Clear sectors to earn Data Points, upgrade Jev, and unlock harder sectors.

---

## The 5 Sectors

| # | District | Grid | Time |
|---|---|---|---|
| 01 | Sub-Grid Slums | 8×8 | 60s |
| 02 | Downtown Financial Plaza | 10×10 | 50s |
| 03 | High-Riot Cyber Highway | 12×12 | 45s |
| 04 | Corporate Central Core | 14×14 | 40s |
| 05 | The Citadel Extraction Glitch | 16×16 | 35s |

---

## Stack

- **Frontend** — Next.js 14, HTML5 Canvas, Tailwind CSS
- **Backend** — Express with full simulation engine (A* pathfinding, raycasting LoS, autonomous tick loop)
- **AI** — `typesafe-ai/jev` via Vercel AI SDK with deterministic fallback
- **Shared Types** — TypeScript schemas structured as DB-ready entities (Prisma/Supabase-ready)

---

## Running Locally

```bash
npm run dev
```

- Frontend → [http://localhost:3000](http://localhost:3000)
- Backend API → [http://localhost:5000/api/health](http://localhost:5000/api/health)

> Page refresh resets the session. No accounts, no database required.