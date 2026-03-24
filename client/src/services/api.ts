const BASE = "/api";

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${url}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export const api = {
  stats: {
    overview: () => fetchJson<import("@/types/api").OverviewStats>("/stats/overview"),
    activity: () => fetchJson<{ atoms: import("@/types/api").Atom[]; triples: import("@/types/api").Triple[] }>("/stats/activity"),
    topAtoms: (limit = 10) => fetchJson<{ atoms: import("@/types/api").Atom[] }>(`/stats/top-atoms?limit=${limit}`),
    predicates: () => fetchJson<{ atoms: import("@/types/api").PredicateInfo[] }>("/stats/predicates"),
  },

  atoms: {
    list: (params: { limit?: number; offset?: number; search?: string; atom_type?: string } = {}) => {
      const qs = new URLSearchParams();
      if (params.limit) qs.set("limit", String(params.limit));
      if (params.offset) qs.set("offset", String(params.offset));
      if (params.search) qs.set("search", params.search);
      if (params.atom_type) qs.set("atom_type", params.atom_type);
      return fetchJson<{ atoms: import("@/types/api").Atom[]; atoms_aggregate: { aggregate: { count: number } } }>(`/atoms/?${qs}`);
    },
    get: (termId: string) => fetchJson<{ atoms: import("@/types/api").Atom[] }>(`/atoms/${termId}`),
    vault: (termId: string) => fetchJson<{ term_id: string; total_assets_trust: number; total_shares_trust: number }>(`/atoms/${termId}/vault`),
  },

  triples: {
    list: (params: { limit?: number; offset?: number; predicate?: string; subject?: string } = {}) => {
      const qs = new URLSearchParams();
      if (params.limit) qs.set("limit", String(params.limit));
      if (params.offset) qs.set("offset", String(params.offset));
      if (params.predicate) qs.set("predicate", params.predicate);
      if (params.subject) qs.set("subject", params.subject);
      return fetchJson<{ triples: import("@/types/api").Triple[]; triples_aggregate: { aggregate: { count: number } } }>(`/triples/?${qs}`);
    },
  },

  batch: {
    costs: () => fetchJson<{ atom_cost_trust: number; triple_cost_trust: number }>("/batch/costs"),
    prepareAtoms: (entities: Array<{ name: string; description?: string; type?: string }>, batchSize = 20) =>
      fetchJson<import("@/types/api").BatchPreparation>("/batch/prepare-atoms", {
        method: "POST",
        body: JSON.stringify({ entities, batch_size: batchSize }),
      }),
    prepareTriples: (triples: Array<{ subject_id: string; predicate_id: string; object_id: string }>, batchSize = 20) =>
      fetchJson<import("@/types/api").BatchPreparation>("/batch/prepare-triples", {
        method: "POST",
        body: JSON.stringify({ triples, batch_size: batchSize }),
      }),
    buildAtomTx: (items: import("@/types/api").BatchItem[]) =>
      fetchJson<import("@/types/api").UnsignedTx>("/batch/build-atom-tx", {
        method: "POST",
        body: JSON.stringify({ items }),
      }),
    buildTripleTx: (items: import("@/types/api").BatchItem[]) =>
      fetchJson<import("@/types/api").UnsignedTx>("/batch/build-triple-tx", {
        method: "POST",
        body: JSON.stringify({ items }),
      }),
    pin: (name: string, description = "", entityType = "Thing") =>
      fetchJson<{ name: string; ipfs_uri: string; atom_id: string; exists: boolean }>("/batch/pin", {
        method: "POST",
        body: JSON.stringify({ name, description, entity_type: entityType }),
      }),
  },
};
