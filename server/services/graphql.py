"""GraphQL service for querying Intuition's knowledge graph."""

import httpx

from config import settings


class GraphQLService:
    def __init__(self):
        self._url = settings.graphql_url

    async def _query(self, query: str, variables: dict | None = None) -> dict:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                self._url,
                json={"query": query, "variables": variables or {}},
                headers={"Content-Type": "application/json"},
            )
            resp.raise_for_status()
            data = resp.json()
            if "errors" in data:
                raise Exception(str(data["errors"]))
            return data["data"]

    async def get_atoms(
        self,
        limit: int = 50,
        offset: int = 0,
        search: str | None = None,
        atom_type: str | None = None,
    ) -> dict:
        var_defs = []
        where_parts = []
        variables: dict = {"limit": limit, "offset": offset}

        if search:
            var_defs.append("$search: String!")
            where_parts.append("label: { _ilike: $search }")
            variables["search"] = f"%{search}%"
        if atom_type:
            var_defs.append("$atomType: String!")
            where_parts.append("type: { _eq: $atomType }")
            variables["atomType"] = atom_type

        var_sig = f"({', '.join(['$limit: Int!', '$offset: Int!'] + var_defs)})"
        where = f"where: {{ {', '.join(where_parts)} }}," if where_parts else ""
        where_agg = f"where: {{ {', '.join(where_parts)} }}" if where_parts else ""

        query = f"""
        query GetAtoms{var_sig} {{
            atoms(
                {where}
                limit: $limit,
                offset: $offset,
                order_by: {{ block_timestamp: desc }}
            ) {{
                term_id
                label
                type
                image
                block_timestamp
                creator_id
                vault {{
                    total_shares
                    position_count
                }}
            }}
            atoms_aggregate({where_agg}) {{
                aggregate {{ count }}
            }}
        }}
        """
        return await self._query(query, variables)

    async def get_triples(
        self,
        limit: int = 50,
        offset: int = 0,
        predicate_label: str | None = None,
        subject_label: str | None = None,
    ) -> dict:
        var_defs = []
        where_parts = []
        variables: dict = {"limit": limit, "offset": offset}

        if predicate_label:
            var_defs.append("$predLabel: String!")
            where_parts.append("predicate: { label: { _ilike: $predLabel } }")
            variables["predLabel"] = f"%{predicate_label}%"
        if subject_label:
            var_defs.append("$subLabel: String!")
            where_parts.append("subject: { label: { _ilike: $subLabel } }")
            variables["subLabel"] = f"%{subject_label}%"

        var_sig = f"({', '.join(['$limit: Int!', '$offset: Int!'] + var_defs)})"
        where = f"where: {{ {', '.join(where_parts)} }}," if where_parts else ""
        where_agg = f"where: {{ {', '.join(where_parts)} }}" if where_parts else ""

        query = f"""
        query GetTriples{var_sig} {{
            triples(
                {where}
                limit: $limit,
                offset: $offset,
                order_by: {{ block_timestamp: desc }}
            ) {{
                term_id
                subject {{
                    term_id
                    label
                    type
                }}
                predicate {{
                    term_id
                    label
                }}
                object {{
                    term_id
                    label
                    type
                }}
                block_timestamp
                creator_id
                vault {{
                    total_shares
                    position_count
                }}
                counter_vault {{
                    total_shares
                    position_count
                }}
            }}
            triples_aggregate({where_agg}) {{
                aggregate {{ count }}
            }}
        }}
        """
        return await self._query(query, variables)

    async def get_stats(self) -> dict:
        query = """
        query GetStats {
            atoms_aggregate {
                aggregate { count }
            }
            triples_aggregate {
                aggregate { count }
            }
            positions_aggregate {
                aggregate { count }
            }
        }
        """
        return await self._query(query)

    async def get_atom_detail(self, term_id: str) -> dict:
        query = """
        query GetAtomDetail($termId: String!) {
            atoms(where: { term_id: { _eq: $termId } }) {
                term_id
                label
                type
                image
                block_timestamp
                creator_id
                vault {
                    total_shares
                    position_count
                    current_share_price
                }
                as_subject_triples(limit: 20, order_by: { block_timestamp: desc }) {
                    term_id
                    predicate { label }
                    object { label type }
                }
                as_object_triples(limit: 20, order_by: { block_timestamp: desc }) {
                    term_id
                    subject { label type }
                    predicate { label }
                }
            }
        }
        """
        return await self._query(query, {"termId": term_id})

    async def get_recent_activity(self, limit: int = 20) -> dict:
        query = """
        query RecentActivity($limit: Int!) {
            atoms(
                limit: $limit,
                order_by: { block_timestamp: desc }
            ) {
                term_id
                label
                type
                block_timestamp
                creator_id
            }
            triples(
                limit: $limit,
                order_by: { block_timestamp: desc }
            ) {
                term_id
                subject { label }
                predicate { label }
                object { label }
                block_timestamp
                creator_id
            }
        }
        """
        return await self._query(query, {"limit": limit})

    async def get_top_atoms_by_positions(self, limit: int = 10) -> dict:
        query = """
        query TopAtoms($limit: Int!) {
            atoms(
                limit: $limit,
                order_by: { vault: { position_count: desc } }
                where: { vault: { position_count: { _gt: 0 } } }
            ) {
                term_id
                label
                type
                vault {
                    total_shares
                    position_count
                    current_share_price
                }
            }
        }
        """
        return await self._query(query, {"limit": limit})

    async def get_predicate_distribution(self) -> dict:
        query = """
        query PredicateDistribution {
            atoms(
                where: { as_predicate_triples_aggregate: { count: { predicate: {}, _gt: 0 } } }
                order_by: { as_predicate_triples_aggregate: { count: desc } }
                limit: 20
            ) {
                term_id
                label
                type
                as_predicate_triples_aggregate {
                    aggregate { count }
                }
            }
        }
        """
        return await self._query(query)

    async def pin_thing(self, name: str, description: str = "") -> str:
        query = """
        mutation PinThing($name: String!, $description: String!) {
            pinThing(thing: {
                name: $name,
                description: $description,
                image: "",
                url: ""
            }) {
                uri
            }
        }
        """
        data = await self._query(
            query, {"name": name, "description": description}
        )
        return data["pinThing"]["uri"]

    async def pin_person(
        self,
        name: str,
        description: str = "",
        identifier: str = "",
    ) -> str:
        query = """
        mutation PinPerson($name: String!, $description: String!, $identifier: String!) {
            pinPerson(person: {
                name: $name,
                description: $description,
                image: "",
                url: "",
                email: "",
                identifier: $identifier
            }) {
                uri
            }
        }
        """
        data = await self._query(
            query,
            {
                "name": name,
                "description": description,
                "identifier": identifier,
            },
        )
        return data["pinPerson"]["uri"]

    async def pin_organization(
        self,
        name: str,
        description: str = "",
    ) -> str:
        query = """
        mutation PinOrganization($name: String!, $description: String!) {
            pinOrganization(organization: {
                name: $name,
                description: $description,
                image: "",
                url: ""
            }) {
                uri
            }
        }
        """
        data = await self._query(
            query, {"name": name, "description": description}
        )
        return data["pinOrganization"]["uri"]


graphql_service = GraphQLService()
