from fastapi import APIRouter, Query

from services.graphql import graphql_service
from services.rpc import rpc_service

router = APIRouter()


@router.get("/")
async def list_triples(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    predicate: str | None = None,
    subject: str | None = None,
):
    return await graphql_service.get_triples(limit, offset, predicate, subject)


@router.get("/{term_id}")
async def get_triple_detail(term_id: str):
    triple = rpc_service.get_triple(term_id)
    return triple


@router.get("/{term_id}/vault")
async def get_triple_vault(term_id: str, curve_id: int = 1):
    vault = rpc_service.get_vault(term_id, curve_id)
    return {
        "term_id": term_id,
        "total_assets": str(vault["total_assets"]),
        "total_shares": str(vault["total_shares"]),
        "total_assets_trust": vault["total_assets"] / 10**18,
    }
