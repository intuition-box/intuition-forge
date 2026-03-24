import logging

from fastapi import APIRouter, Header

from services.graphql import graphql_service
from services.rpc import rpc_service

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/overview")
async def get_overview(x_rpc_key: str | None = Header(None)):
    # GraphQL stats
    try:
        stats = await graphql_service.get_stats()
        atoms_count = stats["atoms_aggregate"]["aggregate"]["count"]
        triples_count = stats["triples_aggregate"]["aggregate"]["count"]
        positions_count = stats["positions_aggregate"]["aggregate"]["count"]
    except Exception as e:
        logger.error("GraphQL stats failed: %s", e)
        atoms_count = triples_count = positions_count = 0

    # RPC calls (use vib if key provided)
    block = 0
    atom_cost = 0
    triple_cost = 0
    curve_id = 1
    try:
        w3, contract = rpc_service._get_provider(x_rpc_key)
        block = w3.eth.block_number
        atom_cost = contract.functions.getAtomCost().call()
        triple_cost = contract.functions.getTripleCost().call()
        curve_id = contract.functions.getBondingCurveConfig().call()[1]
    except Exception as e:
        logger.error("RPC calls failed: %s", e)

    return {
        "atoms_count": atoms_count,
        "triples_count": triples_count,
        "positions_count": positions_count,
        "block_number": block,
        "atom_cost": str(atom_cost),
        "atom_cost_trust": atom_cost / 10**18 if atom_cost else 0,
        "triple_cost": str(triple_cost),
        "triple_cost_trust": triple_cost / 10**18 if triple_cost else 0,
        "default_curve_id": curve_id,
        "chain_id": 1155,
        "rpc_upgraded": bool(x_rpc_key),
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
