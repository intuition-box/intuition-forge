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
        where_clauses = []
        if search:
            where_clauses.append(f'label: {{ _ilike: "%{search}%" }}')
        if atom_type:
            where_clauses.append(f'type: {{ _eq: "{atom_type}" }}')
        where = ""
        if where_clauses:
            where = f"where: {{ {', '.join(where_clauses)} }},"

        query = f"""
        query GetAtoms {{
            atoms(
                {where}
                limit: {limit},
                offset: {offset},
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
            atoms_aggregate({where.replace(',', '')}) {{
                aggregate {{ count }}
            }}
        }}
        """
        return await self._query(query)

    async def get_triples(
        self,
        limit: int = 50,
        offset: int = 0,
        predicate_label: str | None = None,
        subject_label: str | None = None,
    ) -> dict:
        where_clauses = []
        if predicate_label:
            where_clauses.append(
                f'predicate: {{ label: {{ _ilike: "%{predicate_label}%" }} }}'
            )
        if subject_label:
            where_clauses.append(
                f'subject: {{ label: {{ _ilike: "%{subject_label}%" }} }}'
            )
        where = ""
        if where_clauses:
            where = f"where: {{ {', '.join(where_clauses)} }},"

        query = f"""
        query GetTriples {{
            triples(
                {where}
                limit: {limit},
                offset: {offset},
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
            triples_aggregate({where.replace(',', '')}) {{
                aggregate {{ count }}
            }}
        }}
        """
        return await self._query(query)

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
        query = f"""
        query RecentActivity {{
            atoms(
                limit: {limit},
                order_by: {{ block_timestamp: desc }}
            ) {{
                term_id
                label
                type
                block_timestamp
                creator_id
            }}
            triples(
                limit: {limit},
                order_by: {{ block_timestamp: desc }}
            ) {{
                term_id
                subject {{ label }}
                predicate {{ label }}
                object {{ label }}
                block_timestamp
                creator_id
            }}
        }}
        """
        return await self._query(query)

    async def get_top_atoms_by_positions(self, limit: int = 10) -> dict:
        query = f"""
        query TopAtoms {{
            atoms(
                limit: {limit},
                order_by: {{ vault: {{ position_count: desc }} }}
                where: {{ vault: {{ position_count: {{ _gt: 0 }} }} }}
            ) {{
                term_id
                label
                type
                vault {{
                    total_shares
                    position_count
                    current_share_price
                }}
            }}
        }}
        """
        return await self._query(query)

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


graphql_service = GraphQLService()
