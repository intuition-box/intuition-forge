from fastapi import APIRouter

from services.graphql import graphql_service
from services.rpc import rpc_service

router = APIRouter()


@router.get("/overview")
async def get_overview():
    stats = await graphql_service.get_stats()
    block = rpc_service.get_block_number()
    atom_cost = rpc_service.get_atom_cost()
    triple_cost = rpc_service.get_triple_cost()
    curve_id = rpc_service.get_default_curve_id()

    return {
        "atoms_count": stats["atoms_aggregate"]["aggregate"]["count"],
        "triples_count": stats["triples_aggregate"]["aggregate"]["count"],
        "positions_count": stats["positions_aggregate"]["aggregate"]["count"],
        "block_number": block,
        "atom_cost": str(atom_cost),
        "atom_cost_trust": atom_cost / 10**18,
        "triple_cost": str(triple_cost),
        "triple_cost_trust": triple_cost / 10**18,
        "default_curve_id": curve_id,
        "chain_id": 1155,
    }


@router.get("/activity")
async def get_recent_activity():
    return await graphql_service.get_recent_activity()


@router.get("/top-atoms")
async def get_top_atoms(limit: int = 10):
    return await graphql_service.get_top_atoms_by_positions(limit)


@router.get("/predicates")
async def get_predicate_distribution():
    return await graphql_service.get_predicate_distribution()
