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


class BatchService:
    def __init__(self):
        self._operations: dict[str, BatchOperation] = {}

    def prepare_atom_batch(
        self, entities: list[dict], batch_size: int = 20
    ) -> list[dict]:
        """Prepare atom creation batches, checking which already exist."""
        items = []
        for entity in entities:
            label = entity["name"]
            data = label.encode("utf-8")
            atom_id = rpc_service.calculate_atom_id(data)
            exists = rpc_service.is_term_created(atom_id)
            items.append(
                {
                    "label": label,
                    "data": "0x" + data.hex(),
                    "atom_id": atom_id,
                    "exists": exists,
                    "status": "skipped" if exists else "pending",
                    "description": entity.get("description", ""),
                    "type": entity.get("type", "Thing"),
                }
            )

        new_items = [i for i in items if not i["exists"]]
        batches = []
        for i in range(0, len(new_items), batch_size):
            batch = new_items[i : i + batch_size]
            atom_cost = rpc_service.get_atom_cost()
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
            "atom_cost_per_item": rpc_service.get_atom_cost(),
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
        """Pin entity to IPFS and return atom data ready for creation."""
        if entity_type == "Person":
            uri = await graphql_service.pin_person(name, description)
        else:
            uri = await graphql_service.pin_thing(name, description)

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
