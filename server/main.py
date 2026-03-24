import logging

from fastapi import FastAPI, Header
from fastapi.middleware.cors import CORSMiddleware

from config import settings
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

app.include_router(batch_router, prefix="/api/batch", tags=["batch"])


@app.get("/api/health")
async def health(x_rpc_key: str | None = Header(None)):
    checks = {"status": "ok", "chain_id": settings.chain_id}

    from services.rpc import rpc_service

    try:
        w3, _ = rpc_service._get_provider(x_rpc_key)
        block = w3.eth.block_number
        url = "vib.rpc.intuition.box (key)" if x_rpc_key else settings.rpc_read_url
        checks["rpc"] = {"status": "ok", "block": block, "url": url}
    except Exception as e:
        checks["rpc"] = {"status": "error", "error": str(e), "url": settings.rpc_read_url}
        checks["status"] = "degraded"

    try:
        from services.graphql import graphql_service
        await graphql_service.get_stats()
        checks["graphql"] = {"status": "ok", "url": settings.graphql_url}
    except Exception as e:
        checks["graphql"] = {"status": "error", "error": str(e), "url": settings.graphql_url}
        checks["status"] = "degraded"

    return checks
