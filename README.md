# Intuition Forge

Batch data forge for the [Intuition Protocol](https://intuition.systems). Create atoms, triples, and seed the on-chain knowledge graph at scale — directly on the MultiVault contract, no proxy.

## What it does

Intuition Forge lets you:

- **Explore** the Intuition knowledge graph — atoms, triples, predicates, positions
- **Batch-create atoms** — pin entities to IPFS and create them on-chain in batches of 20
- **Batch-create triples** — link atoms with predicates (has tag, speaking at, presented at, etc.)
- **Monitor** protocol stats, costs, top atoms, predicate distribution
- **Connect your wallet** — MetaMask / multi-wallet (EIP-6963) for signing transactions with $TRUST

All writes go **directly to the MultiVault** (`0x6E35...e7e`) on Intuition's L3 (Chain 1155). No Sofia Fee Proxy.

## Architecture

```
intuition-forge/
  client/          TypeScript React frontend (Bun + Vite)
  server/          Python FastAPI backend
  deploy/          nginx + supervisor configs
  Dockerfile       Single-container production build
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
| **Health** | API health check — RPC and GraphQL connection status |

## How to import data

Intuition Forge creates on-chain data on the Intuition knowledge graph. The flow is:

1. **Pin to IPFS** — Entity metadata (name, description) is pinned via GraphQL mutations (`pinThing`, `pinPerson`, `pinOrganization`)
2. **Create atoms** — The IPFS URI is encoded as bytes and sent to `MultiVault.createAtoms()` on-chain
3. **Create triples** — Atoms are linked with predicates via `MultiVault.createTriples()` on-chain

### Batch atom creation

In the **Batch Ops** page, enter one entity per line:

```
Entity Name | Description (optional)
```

Example:

```
Ethereum | Decentralized blockchain platform
Vitalik Buterin | Co-founder of Ethereum
DeFi | Decentralized Finance
Uniswap | Decentralized exchange protocol
```

Each entity is:
1. Pinned to IPFS (free, no gas)
2. Checked for existence on-chain (duplicates are skipped)
3. Grouped into batches of 20
4. Sent as a single `createAtoms` transaction per batch (requires MetaMask confirmation + $TRUST)

### Batch triple creation

Switch to **Triples** mode and provide a JSON array:

```json
[
  {
    "subject_id": "0x...",
    "predicate_id": "0x7ec36d201c842dc787b45cb5bb753bea4cf849be3908fb1b0a7d067c3c3cc1f5",
    "object_id": "0x..."
  }
]
```

Common predicates:

| Predicate | Term ID |
|-----------|---------|
| `has tag` | `0x7ec36d201c842dc787b45cb5bb753bea4cf849be3908fb1b0a7d067c3c3cc1f5` |
| `speaking at` | `0xddbdcf95cfac2135b0dfbfa055952b839ce5ee0467a5729eb15f9df250d3cf37` |
| `presented at` | `0xd565b68b86bbca8c77bfac6c6947ce96046ecf6d23c997c04cb10af7638ac6b6` |

### Example import file

See [`examples/import-atoms.txt`](examples/import-atoms.txt) and [`examples/import-triples.json`](examples/import-triples.json).

## RPC API Key

By default, Intuition Forge uses the public RPC (`rpc.intuition.systems`) which is rate-limited.

For faster, unlimited access, you can enter a **personal API key** for `vib.rpc.intuition.box` in the sidebar. The key is:

- Stored in your browser only (localStorage)
- Sent to the backend as `X-RPC-Key` header with each request
- Used by the backend to connect to the faster VIB RPC
- Never hardcoded in the source code

Without a key, everything works — just slower on RPC calls.

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
RPC_READ_URL=https://rpc.intuition.systems/http
GRAPHQL_URL=https://mainnet.intuition.sh/v1/graphql
MULTIVAULT_ADDRESS=0x6E35cF57A41fA15eA0EaE9C33e751b01A784Fe7e
CHAIN_ID=1155
```

## Deploy with Coolify

Point Coolify to this repo with **Build Pack: Dockerfile**. Single container, port 80.

- Bun builds the frontend
- nginx serves static files + reverse proxies `/api/*` to uvicorn
- supervisord runs both processes

## On-chain details

| | |
|---|---|
| Chain | Intuition L3 — ID 1155 |
| Token | $TRUST (18 decimals) |
| MultiVault | `0x6E35cF57A41fA15eA0EaE9C33e751b01A784Fe7e` |
| RPC (public) | `https://rpc.intuition.systems/http` |
| RPC (fast, key required) | `https://vib.rpc.intuition.box/http` |
| GraphQL | `https://mainnet.intuition.sh/v1/graphql` |
| Explorer | `https://explorer.intuition.systems` |

Atoms are created via `createAtoms(bytes[], uint256[])` and triples via `createTriples(bytes32[], bytes32[], bytes32[], uint256[])`, both directly on the MultiVault. IPFS pinning uses the GraphQL `pinThing`/`pinPerson`/`pinOrganization` mutations.

## License

MIT
