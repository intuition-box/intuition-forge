from fastapi import APIRouter, Query

from services.graphql import graphql_service
from services.rpc import rpc_service

router = APIRouter()


@router.get("/")
async def list_atoms(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    search: str | None = None,
    atom_type: str | None = None,
):
    return await graphql_service.get_atoms(limit, offset, search, atom_type)


@router.get("/{term_id}")
async def get_atom(term_id: str):
    return await graphql_service.get_atom_detail(term_id)


@router.get("/{term_id}/vault")
async def get_atom_vault(term_id: str, curve_id: int = 1):
    vault = rpc_service.get_vault(term_id, curve_id)
    return {
        "term_id": term_id,
        "total_assets": str(vault["total_assets"]),
        "total_shares": str(vault["total_shares"]),
        "total_assets_trust": vault["total_assets"] / 10**18,
        "total_shares_trust": vault["total_shares"] / 10**18,
    }


@router.get("/{term_id}/exists")
async def check_atom_exists(term_id: str):
    exists = rpc_service.is_term_created(term_id)
    return {"term_id": term_id, "exists": exists}
