"""Batch operations service for creating atoms and triples."""

from dataclasses import dataclass, field

from services.rpc import rpc_service
from services.graphql import graphql_service


@dataclass
class BatchItem:
    label: str
    data: bytes
    atom_id: str = ""
    exists: bool = False
    status: str = "pending"  # pending | pinned | created | skipped | error
    error: str = ""
    ipfs_uri: str = ""


@dataclass
class TripleBatchItem:
    subject_label: str
    predicate_label: str
    object_label: str
    subject_id: str
    predicate_id: str
    object_id: str
    triple_id: str = ""
    exists: bool = False
    status: str = "pending"
    error: str = ""


@dataclass
class BatchOperation:
    id: str
    operation_type: str  # "atoms" | "triples"
    items: list = field(default_factory=list)
    batch_size: int = 20
    status: str = "pending"  # pending | running | completed | error


def _validate_ipfs_uri(uri: str) -> str:
    """Validate that the pinning response is a proper IPFS URI."""
    if not uri or not uri.startswith("ipfs://"):
        raise ValueError(f"Invalid IPFS URI from pinning: {uri!r}")
    return uri


class BatchService:
    def __init__(self):
        self._operations: dict[str, BatchOperation] = {}

    async def prepare_atom_batch(
        self, entities: list[dict], batch_size: int = 20
    ) -> dict:
        """Prepare atom creation batches: pin to IPFS, then check existence."""
        items = []
        for entity in entities:
            name = entity["name"]
            description = entity.get("description", "")
            entity_type = entity.get("type", "Thing")

            # Pin to IPFS first — all atoms must be IPFS-pinned
            if entity_type == "Person":
                uri = await graphql_service.pin_person(name, description)
            elif entity_type == "Organization":
                uri = await graphql_service.pin_organization(name, description)
            else:
                uri = await graphql_service.pin_thing(name, description)

            _validate_ipfs_uri(uri)

            # Atom data is the IPFS URI encoded as bytes
            data = uri.encode("utf-8")
            atom_id = rpc_service.calculate_atom_id(data)
            exists = rpc_service.is_term_created(atom_id)

            items.append(
                {
                    "label": name,
                    "data": "0x" + data.hex(),
                    "atom_id": atom_id,
                    "exists": exists,
                    "status": "skipped" if exists else "pinned",
                    "description": description,
                    "type": entity_type,
                    "ipfs_uri": uri,
                }
            )

        new_items = [i for i in items if not i["exists"]]
        batches = []
        atom_cost = rpc_service.get_atom_cost()
        for i in range(0, len(new_items), batch_size):
            batch = new_items[i : i + batch_size]
            total_cost = atom_cost * len(batch)
            batches.append(
                {
                    "batch_index": i // batch_size,
                    "items": batch,
                    "atom_cost": atom_cost,
                    "total_cost": total_cost,
                    "total_cost_trust": total_cost / 10**18,
                }
            )

        return {
            "total_items": len(items),
            "existing": len(items) - len(new_items),
            "to_create": len(new_items),
            "batches": batches,
            "atom_cost_per_item": atom_cost,
        }

    def prepare_triple_batch(
        self, triples: list[dict], batch_size: int = 20
    ) -> dict:
        """Prepare triple creation batches, checking which already exist."""
        items = []
        for t in triples:
            triple_id = rpc_service.calculate_triple_id(
                t["subject_id"], t["predicate_id"], t["object_id"]
            )
            exists = rpc_service.is_term_created(triple_id)
            items.append(
                {
                    "subject_label": t.get("subject_label", ""),
                    "predicate_label": t.get("predicate_label", ""),
                    "object_label": t.get("object_label", ""),
                    "subject_id": t["subject_id"],
                    "predicate_id": t["predicate_id"],
                    "object_id": t["object_id"],
                    "triple_id": triple_id,
                    "exists": exists,
                    "status": "skipped" if exists else "pending",
                }
            )

        new_items = [i for i in items if not i["exists"]]
        batches = []
        triple_cost = rpc_service.get_triple_cost()
        for i in range(0, len(new_items), batch_size):
            batch = new_items[i : i + batch_size]
            total_cost = triple_cost * len(batch)
            batches.append(
                {
                    "batch_index": i // batch_size,
                    "items": batch,
                    "triple_cost": triple_cost,
                    "total_cost": total_cost,
                    "total_cost_trust": total_cost / 10**18,
                }
            )

        return {
            "total_items": len(items),
            "existing": len(items) - len(new_items),
            "to_create": len(new_items),
            "batches": batches,
            "triple_cost_per_item": triple_cost,
        }

    def build_atom_tx(self, items: list[dict]) -> dict:
        """Build unsigned createAtoms transaction for a batch."""
        atom_cost = rpc_service.get_atom_cost()
        atom_datas = [bytes.fromhex(i["data"].removeprefix("0x")) for i in items]
        assets = [atom_cost] * len(items)
        return rpc_service.build_create_atoms_calldata(atom_datas, assets)

    def build_triple_tx(self, items: list[dict]) -> dict:
        """Build unsigned createTriples transaction for a batch."""
        triple_cost = rpc_service.get_triple_cost()
        subject_ids = [
            bytes.fromhex(i["subject_id"].removeprefix("0x")) for i in items
        ]
        predicate_ids = [
            bytes.fromhex(i["predicate_id"].removeprefix("0x")) for i in items
        ]
        object_ids = [
            bytes.fromhex(i["object_id"].removeprefix("0x")) for i in items
        ]
        assets = [triple_cost] * len(items)
        return rpc_service.build_create_triples_calldata(
            subject_ids, predicate_ids, object_ids, assets
        )

    async def pin_and_prepare_atom(
        self, name: str, description: str = "", entity_type: str = "Thing"
    ) -> dict:
        """Pin a single entity to IPFS and return atom data ready for creation."""
        if entity_type == "Person":
            uri = await graphql_service.pin_person(name, description)
        elif entity_type == "Organization":
            uri = await graphql_service.pin_organization(name, description)
        else:
            uri = await graphql_service.pin_thing(name, description)

        _validate_ipfs_uri(uri)

        data = uri.encode("utf-8")
        atom_id = rpc_service.calculate_atom_id(data)
        exists = rpc_service.is_term_created(atom_id)

        return {
            "name": name,
            "ipfs_uri": uri,
            "data": "0x" + data.hex(),
            "atom_id": atom_id,
            "exists": exists,
        }


batch_service = BatchService()
