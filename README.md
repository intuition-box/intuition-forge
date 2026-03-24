# Intuition Forge

Batch data forge for the [Intuition Protocol](https://intuition.systems). Create atoms and triples at scale on the on-chain knowledge graph — directly on the MultiVault contract, no proxy.

## What it does

Intuition Forge is a utility for bulk-importing data onto Intuition's L3 (Chain 1155):

- **Batch-create atoms** — pin entities to IPFS and create them on-chain in batches of 20
- **Batch-create triples** — link atoms with predicates (has tag, speaking at, presented at, etc.)
- **Dry run** — prepare and simulate before spending $TRUST
- **Resume** — interrupted imports can be resumed from where they stopped
- **Export** — download created atom/triple IDs and TX hashes as JSON

All writes go **directly to the MultiVault** (`0x6E35...e7e`). No Sofia Fee Proxy.

## Features

| Feature | Description |
|---------|-------------|
| **IPFS pinning** | Entities are pinned via GraphQL (`pinThing`/`pinPerson`/`pinOrganization`) before on-chain creation |
| **Existence checks** | Duplicates are detected and skipped automatically |
| **Confirmation modal** | Review cost, target, and chain before signing each batch |
| **Per-item status** | Each entity shows its status: pending, pinning, pinned, creating, created, skipped, error |
| **Progress bar** | Visual progress through batches |
| **Color-coded logs** | Step-by-step terminal-style log with timestamps |
| **Toast notifications** | Popup confirmations for batch success/failure |
| **Resume after crash** | Progress saved in localStorage — reload and resume |
| **Export results** | Download JSON with TX hashes, block numbers, explorer links |
| **Dark/light theme** | Toggle in the top bar |
| **Multi-wallet** | EIP-6963 wallet discovery — works with MetaMask, Rabby, Zerion, etc. |
| **RPC API key** | Optional — enter your vib.rpc.intuition.box key in the sidebar for faster RPC |
| **Skeleton loading** | Skeleton screens instead of spinners |

## How to import

### Atoms

Enter one entity per line in the format `name | description`:

```
DeFi's hidden risk stack | Mapping real DeFi risk — EthCC[9] Kelly Stage
Building the Financial Layer 1 for Trillions Onchain | Pharos bridging TradFi
Julien Bouteloup | Rekt — DeFi speaker
Uniswap | Decentralized exchange protocol
```

### Triples

Switch to Triples mode and enter a JSON array:

```json
[
  {
    "subject_id": "0xbc6ede1c524cc597fe94973e7522dd4eff89380df3f2e71477c16960b5027766",
    "predicate_id": "0xddbdcf95cfac2135b0dfbfa055952b839ce5ee0467a5729eb15f9df250d3cf37",
    "object_id": "0x5a25d14b408e1ad97660fdbe66b826401e4116b9e6d3f5e6eb53287435ec0837",
    "subject_label": "Justin Drake",
    "predicate_label": "speaking at",
    "object_label": "Quantum dilema"
  }
]
```

Common predicates:

| Predicate | Term ID |
|-----------|---------|
| `has tag` | `0x7ec36d201c842dc787b45cb5bb753bea4cf849be3908fb1b0a7d067c3c3cc1f5` |
| `speaking at` | `0xddbdcf95cfac2135b0dfbfa055952b839ce5ee0467a5729eb15f9df250d3cf37` |
| `presented at` | `0xd565b68b86bbca8c77bfac6c6947ce96046ecf6d23c997c04cb10af7638ac6b6` |

### Workflow

1. **Prepare & Simulate** — pins to IPFS, checks existence, shows cost breakdown
2. **Execute All** — confirmation modal per batch, then sign with wallet
3. **Export Results** — download JSON with all TX hashes and IDs

## RPC API Key

By default, uses the public RPC (`rpc.intuition.systems`) which is rate-limited. For faster access, enter a `vib.rpc.intuition.box` API key in the sidebar — stored in your browser only, sent as `X-RPC-Key` header to the backend.

## Getting started

### Prerequisites

- [Bun](https://bun.sh) (frontend)
- Python 3.12+ (backend)
- MetaMask or any EIP-6963 wallet with $TRUST on Intuition L3 (Chain 1155)

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

### Deploy with Coolify

Point Coolify to this repo with **Build Pack: Dockerfile**. Single container, port 80.

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

## License

MIT
