import { useState } from "react";
import { api } from "@/services/api";
import { useApi } from "@/hooks/useApi";
import { Panel } from "@/components/Panel";
import { Loader } from "@/components/Loader";
import cs from "@/styles/components.module.css";

export function TriplesPage() {
  const [predicateFilter, setPredicateFilter] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("");
  const [page, setPage] = useState(0);
  const limit = 50;

  const { data, loading, refetch } = useApi(
    () => api.triples.list({
      limit,
      offset: page * limit,
      predicate: predicateFilter || undefined,
      subject: subjectFilter || undefined,
    }),
    [page, predicateFilter, subjectFilter]
  );

  const triples = data?.triples ?? [];
  const total = data?.triples_aggregate?.aggregate?.count ?? 0;

  return (
    <Panel
      title="Triples Explorer"
      badge={<span className={`${cs.tag} ${cs.tagPurple}`}>{total.toLocaleString()} total</span>}
      actions={
        <button className={`${cs.btn} ${cs.btnSecondary} ${cs.btnSmall}`} onClick={refetch}>
          Refresh
        </button>
      }
    >
      <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
        <input
          className={`${cs.input} ${cs.searchInput}`}
          placeholder="Filter by subject..."
          value={subjectFilter}
          onChange={(e) => { setSubjectFilter(e.target.value); setPage(0); }}
        />
        <input
          className={cs.input}
          placeholder="Filter by predicate..."
          value={predicateFilter}
          onChange={(e) => { setPredicateFilter(e.target.value); setPage(0); }}
          style={{ width: 220 }}
        />
      </div>

      {loading ? (
        <Loader />
      ) : (
        <>
          <div className={cs.tableScroll} style={{ maxHeight: 520 }}>
            <table className={cs.table}>
              <thead>
                <tr>
                  <th>Subject</th>
                  <th>Predicate</th>
                  <th>Object</th>
                  <th>Positions</th>
                  <th>Counter</th>
                </tr>
              </thead>
              <tbody>
                {triples.map((t) => (
                  <tr key={t.term_id}>
                    <td title={t.subject.label}>
                      <span className={`${cs.tag} ${cs.tagBlue}`} style={{ marginRight: 6 }}>
                        {t.subject.type?.charAt(0)}
                      </span>
                      {t.subject.label}
                    </td>
                    <td>
                      <span className={`${cs.tag} ${cs.tagOrange}`}>{t.predicate.label}</span>
                    </td>
                    <td title={t.object.label}>
                      <span className={`${cs.tag} ${cs.tagGreen}`} style={{ marginRight: 6 }}>
                        {t.object.type?.charAt(0)}
                      </span>
                      {t.object.label}
                    </td>
                    <td>{t.vault?.position_count ?? 0}</td>
                    <td>{t.counter_vault?.position_count ?? 0}</td>
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
  );
}
