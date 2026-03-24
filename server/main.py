import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from routes.atoms import router as atoms_router
from routes.triples import router as triples_router
from routes.stats import router as stats_router
from routes.batch import router as batch_router

logging.basicConfig(level=logging.INFO)

app = FastAPI(title="Intuition Forge API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(atoms_router, prefix="/api/atoms", tags=["atoms"])
app.include_router(triples_router, prefix="/api/triples", tags=["triples"])
app.include_router(stats_router, prefix="/api/stats", tags=["stats"])
app.include_router(batch_router, prefix="/api/batch", tags=["batch"])


@app.get("/api/health")
async def health():
    checks = {"status": "ok", "chain_id": settings.chain_id}

    # Test RPC
    try:
        from services.rpc import rpc_service
        block = rpc_service.get_block_number()
        checks["rpc"] = {"status": "ok", "block": block, "url": settings.rpc_read_url}
    except Exception as e:
        checks["rpc"] = {"status": "error", "error": str(e), "url": settings.rpc_read_url}
        checks["status"] = "degraded"

    # Test GraphQL
    try:
        from services.graphql import graphql_service
        stats = await graphql_service.get_stats()
        checks["graphql"] = {"status": "ok", "url": settings.graphql_url}
    except Exception as e:
        checks["graphql"] = {"status": "error", "error": str(e), "url": settings.graphql_url}
        checks["status"] = "degraded"

    return checks
