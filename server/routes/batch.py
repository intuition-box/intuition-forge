from fastapi import APIRouter
from pydantic import BaseModel

from services.batch import batch_service
from services.rpc import rpc_service

router = APIRouter()


class AtomEntity(BaseModel):
    name: str
    description: str = ""
    type: str = "Thing"


class PrepareAtomsRequest(BaseModel):
    entities: list[AtomEntity]
    batch_size: int = 20


class PrepareTripleItem(BaseModel):
    subject_id: str
    predicate_id: str
    object_id: str
    subject_label: str = ""
    predicate_label: str = ""
    object_label: str = ""


class PrepareTriplesRequest(BaseModel):
    triples: list[PrepareTripleItem]
    batch_size: int = 20


class BuildAtomTxRequest(BaseModel):
    items: list[dict]


class BuildTripleTxRequest(BaseModel):
    items: list[dict]


class PinRequest(BaseModel):
    name: str
    description: str = ""
    entity_type: str = "Thing"


@router.post("/prepare-atoms")
async def prepare_atoms(req: PrepareAtomsRequest):
    entities = [e.model_dump() for e in req.entities]
    return batch_service.prepare_atom_batch(entities, req.batch_size)


@router.post("/prepare-triples")
async def prepare_triples(req: PrepareTriplesRequest):
    triples = [t.model_dump() for t in req.triples]
    return batch_service.prepare_triple_batch(triples, req.batch_size)


@router.post("/build-atom-tx")
async def build_atom_tx(req: BuildAtomTxRequest):
    return batch_service.build_atom_tx(req.items)


@router.post("/build-triple-tx")
async def build_triple_tx(req: BuildTripleTxRequest):
    return batch_service.build_triple_tx(req.items)


@router.post("/pin")
async def pin_entity(req: PinRequest):
    return await batch_service.pin_and_prepare_atom(
        req.name, req.description, req.entity_type
    )


@router.get("/costs")
async def get_costs():
    atom_cost = rpc_service.get_atom_cost()
    triple_cost = rpc_service.get_triple_cost()
    return {
        "atom_cost": str(atom_cost),
        "atom_cost_trust": atom_cost / 10**18,
        "triple_cost": str(triple_cost),
        "triple_cost_trust": triple_cost / 10**18,
    }
