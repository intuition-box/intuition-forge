# Intuition Forge

Batch data forge for the [Intuition Protocol](https://intuition.systems). Create atoms, triples, and seed the on-chain knowledge graph at scale — directly on the MultiVault contract, no proxy.

## What it does

Intuition Forge lets you:

- **Explore** the Intuition knowledge graph — atoms, triples, predicates, positions
- **Batch-create atoms** — pin entities to IPFS and create them on-chain in batches of 20
- **Batch-create triples** — link atoms with predicates (has tag, speaking at, presented at, etc.)
- **Monitor** protocol stats, costs, top atoms, predicate distribution
- **Connect your wallet** — MetaMask integration for signing transactions with $TRUST

All writes go **directly to the MultiVault** (`0x6E35...e7e`) on Intuition's L3 (Chain 1155). No Sofia Fee Proxy.

## Architecture

```
intuition-forge/
  client/          TypeScript React frontend (Bun + Vite)
  server/          Python FastAPI backend
  docker-compose.yml
```

**Frontend** — React 19, TypeScript, Vite, Recharts for charts, CSS Modules (no inline CSS), dark/light theme toggle.

**Backend** — FastAPI with three service layers:
- `rpc.py` — Direct MultiVault reads/writes via web3.py
- `graphql.py` — Intuition GraphQL API for search, stats, IPFS pinning
- `batch.py` — Batch preparation, existence checks, unsigned tx building

## Pages

| Page | Description |
|------|-------------|
| **Overview** | KPI cards (atoms, triples, positions, costs), top atoms chart, predicate distribution, recent activity |
| **Atoms** | Searchable/filterable table of all atoms with type, positions, vault info |
| **Triples** | Explore triples filtered by subject or predicate |
| **Batch Ops** | Prepare and execute batch atom/triple creation via MetaMask |

## Getting started

### Prerequisites

- [Bun](https://bun.sh) (frontend)
- Python 3.12+ (backend)
- MetaMask with $TRUST on Intuition L3 (Chain 1155)

### Development

```bash
# Backend
cd server
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload

# Frontend (in another terminal)
cd client
bun install
bun run dev
```

Frontend runs on `http://localhost:5173`, backend on `http://localhost:8000`. Vite proxies `/api` requests to the backend.

### Environment

Copy `server/.env.example` to `server/.env` to customize:

```
RPC_URL=https://rpc.intuition.systems/http
RPC_READ_URL=https://vib.rpc.intuition.box/http
GRAPHQL_URL=https://mainnet.intuition.sh/v1/graphql
MULTIVAULT_ADDRESS=0x6E35cF57A41fA15eA0EaE9C33e751b01A784Fe7e
CHAIN_ID=1155
```

## Deploy with Coolify

Point Coolify to this repo. It picks up `docker-compose.yml` automatically.

- **Frontend**: Bun build + nginx (port 3000)
- **Backend**: Python FastAPI (port 8000)
- nginx reverse-proxies `/api/*` to the backend

## On-chain details

| | |
|---|---|
| Chain | Intuition L3 — ID 1155 |
| Token | $TRUST (18 decimals) |
| MultiVault | `0x6E35cF57A41fA15eA0EaE9C33e751b01A784Fe7e` |
| RPC | `https://rpc.intuition.systems/http` |
| GraphQL | `https://mainnet.intuition.sh/v1/graphql` |
| Explorer | `https://explorer.intuition.systems` |

Atoms are created via `createAtoms(bytes[], uint256[])` and triples via `createTriples(bytes32[], bytes32[], bytes32[], uint256[])`, both directly on the MultiVault. IPFS pinning uses the GraphQL `pinThing`/`pinPerson` mutations.

## License

MIT
