# CLAUDE.md

## Project Overview

**Intuition Forge** — Batch data forge for the Intuition Protocol. Create atoms and triples at scale on Chain 1155 ($TRUST) and explore the on-chain knowledge graph.

**No Sofia Proxy** — all on-chain writes go directly to the MultiVault contract.

## Architecture

```
intuition-forge/
  server/              Python FastAPI backend
    config.py          Settings (RPC URLs, addresses)
    main.py            App entrypoint
    Dockerfile         Production container
    services/          Business logic
      rpc.py           Direct MultiVault RPC (web3.py)
      graphql.py       Intuition GraphQL queries
      batch.py         Batch atom/triple preparation & tx building
    routes/            API endpoints
      atoms.py         /api/atoms - atom CRUD & search
      triples.py       /api/triples - triple CRUD & search
      stats.py         /api/stats - overview, activity, top atoms
      batch.py         /api/batch - prepare, build tx, pin IPFS
  client/              TypeScript React frontend (Bun)
    Dockerfile         Production container (bun build + nginx)
    nginx.conf         Reverse proxy config
    src/
      components/      Reusable UI (Sidebar, TopBar, KpiCard, Panel, Loader)
      pages/           Route pages (Overview, Atoms, Triples, Batch)
      hooks/           React hooks (useApi, useWallet, useTheme)
      services/        API client
      styles/          CSS modules (no inline CSS)
      types/           TypeScript interfaces
      config/          Constants, chain config
  docker-compose.yml   Coolify-ready compose
```

## Development

```bash
# Backend
cd server && python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt
uvicorn main:app --reload

# Frontend (Bun)
cd client && bun install && bun run dev
```

## Deploy (Coolify)

Point Coolify to the repo with `docker-compose.yml`. Frontend on port 3000, backend on port 8000.

## Key Technical Details

- **Runtime**: Bun (frontend), Python 3.12+ (backend)
- **Backend**: FastAPI, web3.py, httpx
- **Frontend**: React 19, TypeScript 5.7, Vite 6, Recharts, CSS Modules
- **RPC Read**: `https://vib.rpc.intuition.box/http` (no rate limit)
- **RPC Write**: `https://rpc.intuition.systems/http` (public)
- **GraphQL**: `https://mainnet.intuition.sh/v1/graphql`
- **MultiVault**: `0x6E35cF57A41fA15eA0EaE9C33e751b01A784Fe7e`
- **Chain**: 1155 (Intuition L3), token: $TRUST
- **Dark/Light mode**: CSS custom properties with `[data-theme]` selector

## On-Chain Context

- Atoms created via `createAtoms(bytes[], uint256[])` directly on MultiVault
- Triples via `createTriples(bytes32[], bytes32[], bytes32[], uint256[])`
- IPFS pinning via GraphQL mutations (pinThing, pinPerson)
- Batch size: 20 items per transaction
- No Sofia Proxy (`0x26F8...c6c`) is used in this app

## Intuition Agent Skill

The Intuition agent skill is installed at `.agents/skills/intuition/` (symlinked from `~/.agents/skills/intuition/`). Use `/intuition` for protocol interactions.
