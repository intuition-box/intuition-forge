export interface Atom {
  term_id: string;
  label: string;
  type: string;
  image?: string;
  block_timestamp?: string;
  creator_id?: string;
  vault?: VaultInfo;
}

export interface VaultInfo {
  total_shares: string;
  position_count: number;
  current_share_price?: string;
}

export interface Triple {
  term_id: string;
  subject: { term_id: string; label: string; type: string };
  predicate: { term_id: string; label: string };
  object: { term_id: string; label: string; type: string };
  block_timestamp?: string;
  creator_id?: string;
  vault?: VaultInfo;
  counter_vault?: VaultInfo;
}

export interface OverviewStats {
  atoms_count: number;
  triples_count: number;
  positions_count: number;
  block_number: number;
  atom_cost: string;
  atom_cost_trust: number;
  triple_cost: string;
  triple_cost_trust: number;
  default_curve_id: number;
  chain_id: number;
}

export interface PredicateInfo {
  term_id: string;
  label: string;
  type: string;
  as_predicate_triples_aggregate: {
    aggregate: { count: number };
  };
}

export interface BatchItem {
  label: string;
  data: string;
  atom_id: string;
  exists: boolean;
  status: string;
  description?: string;
  type?: string;
}

export interface BatchPreparation {
  total_items: number;
  existing: number;
  to_create: number;
  batches: Array<{
    batch_index: number;
    items: BatchItem[];
    atom_cost?: number;
    triple_cost?: number;
    total_cost: number;
    total_cost_trust: number;
  }>;
  atom_cost_per_item?: number;
  triple_cost_per_item?: number;
}

export interface UnsignedTx {
  to: string;
  data: string;
  value: string;
  chainId: string;
}
