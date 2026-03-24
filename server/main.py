from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from routes.atoms import router as atoms_router
from routes.triples import router as triples_router
from routes.stats import router as stats_router
from routes.batch import router as batch_router

app = FastAPI(title="Intuition Forge API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins.split(","),
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
    return {"status": "ok", "chain_id": settings.chain_id}
