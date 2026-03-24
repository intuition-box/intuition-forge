import { useState } from "react";
import { api } from "@/services/api";
import { useApi } from "@/hooks/useApi";
import { Panel } from "@/components/Panel";
import { Loader } from "@/components/Loader";
import cs from "@/styles/components.module.css";
import { EXPLORER_URL } from "@/config/constants";

export function AtomsPage() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [page, setPage] = useState(0);
  const limit = 50;

  const { data, loading, refetch } = useApi(
    () => api.atoms.list({ limit, offset: page * limit, search: search || undefined, atom_type: typeFilter || undefined }),
    [page, search, typeFilter]
  );

  const atoms = data?.atoms ?? [];
  const total = data?.atoms_aggregate?.aggregate?.count ?? 0;

  return (
    <>
      <Panel
        title="Atoms Explorer"
        badge={<span className={`${cs.tag} ${cs.tagBlue}`}>{total.toLocaleString()} total</span>}
        actions={
          <button className={`${cs.btn} ${cs.btnSecondary} ${cs.btnSmall}`} onClick={refetch}>
            Refresh
          </button>
        }
      >
        <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
          <input
            className={`${cs.input} ${cs.searchInput}`}
            placeholder="Search atoms..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          />
          <select
            className={cs.input}
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value); setPage(0); }}
            style={{ width: 180 }}
          >
            <option value="">All types</option>
            <option value="Thing">Thing</option>
            <option value="Person">Person</option>
            <option value="Organization">Organization</option>
            <option value="Keywords">Keywords</option>
            <option value="TextObject">TextObject</option>
          </select>
        </div>

        {loading ? (
          <Loader />
        ) : (
          <>
            <div className={cs.tableScroll} style={{ maxHeight: 520 }}>
              <table className={cs.table}>
                <thead>
                  <tr>
                    <th>Label</th>
                    <th>Type</th>
                    <th>Positions</th>
                    <th>Shares</th>
                    <th>Term ID</th>
                  </tr>
                </thead>
                <tbody>
                  {atoms.map((a) => (
                    <tr key={a.term_id}>
                      <td title={a.label ?? ""}>{a.label}</td>
                      <td>
                        <span className={`${cs.tag} ${a.type === "Person" ? cs.tagPurple : a.type === "Thing" ? cs.tagBlue : cs.tagGreen}`}>
                          {a.type}
                        </span>
                      </td>
                      <td>{a.vault?.position_count ?? 0}</td>
                      <td className={cs.mono}>{a.vault?.total_shares ?? "0"}</td>
                      <td>
                        <a
                          href={`${EXPLORER_URL}/tx/${a.term_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={cs.mono}
                        >
                          {a.term_id.slice(0, 10)}...
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16 }}>
              <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                Showing {page * limit + 1}-{Math.min((page + 1) * limit, total)} of {total}
              </span>
              <div style={{ display: "flex", gap: 8 }}>
                <button className={`${cs.btn} ${cs.btnSecondary} ${cs.btnSmall}`} disabled={page === 0} onClick={() => setPage(page - 1)}>
                  Previous
                </button>
                <button className={`${cs.btn} ${cs.btnSecondary} ${cs.btnSmall}`} disabled={(page + 1) * limit >= total} onClick={() => setPage(page + 1)}>
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </Panel>
    </>
  );
}
