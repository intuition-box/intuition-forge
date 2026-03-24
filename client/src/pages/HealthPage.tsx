import { useApi } from "@/hooks/useApi";
import { Panel } from "@/components/Panel";
import { Loader } from "@/components/Loader";
import cs from "@/styles/components.module.css";

interface HealthCheck {
  status: string;
  chain_id: number;
  rpc?: { status: string; block?: number; error?: string; url?: string };
  graphql?: { status: string; error?: string; url?: string };
}

export function HealthPage() {
  const { data, loading, refetch } = useApi(
    () => fetch("/api/health").then((r) => r.json() as Promise<HealthCheck>),
    []
  );

  return (
    <Panel
      title="API Health"
      actions={
        <button className={`${cs.btn} ${cs.btnSecondary} ${cs.btnSmall}`} onClick={refetch}>
          Refresh
        </button>
      }
    >
      {loading ? (
        <Loader />
      ) : !data ? (
        <div className={cs.emptyState}>
          <div className={cs.emptyIcon}>!</div>
          <p>Could not reach the API</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className={cs.kpiGrid} style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
            <div className={cs.kpiCard}>
              <div className={cs.kpiLabel}>Status</div>
              <div className={cs.kpiValue}>
                <span className={`${cs.tag} ${data.status === "ok" ? cs.tagGreen : cs.tagRed}`}>
                  {data.status}
                </span>
              </div>
            </div>
            <div className={cs.kpiCard}>
              <div className={cs.kpiLabel}>RPC</div>
              <div className={cs.kpiValue}>
                <span className={`${cs.tag} ${data.rpc?.status === "ok" ? cs.tagGreen : cs.tagRed}`}>
                  {data.rpc?.status ?? "unknown"}
                </span>
              </div>
              {data.rpc?.block && (
                <div className={cs.kpiChange}>Block #{data.rpc.block.toLocaleString()}</div>
              )}
            </div>
            <div className={cs.kpiCard}>
              <div className={cs.kpiLabel}>GraphQL</div>
              <div className={cs.kpiValue}>
                <span className={`${cs.tag} ${data.graphql?.status === "ok" ? cs.tagGreen : cs.tagRed}`}>
                  {data.graphql?.status ?? "unknown"}
                </span>
              </div>
            </div>
          </div>

          <table className={cs.table}>
            <thead>
              <tr>
                <th>Service</th>
                <th>URL</th>
                <th>Status</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>RPC</td>
                <td className={cs.mono}>{data.rpc?.url ?? "-"}</td>
                <td>
                  <span className={`${cs.tag} ${data.rpc?.status === "ok" ? cs.tagGreen : cs.tagRed}`}>
                    {data.rpc?.status}
                  </span>
                </td>
                <td className={cs.mono}>
                  {data.rpc?.error ?? (data.rpc?.block ? `block ${data.rpc.block}` : "-")}
                </td>
              </tr>
              <tr>
                <td>GraphQL</td>
                <td className={cs.mono}>{data.graphql?.url ?? "-"}</td>
                <td>
                  <span className={`${cs.tag} ${data.graphql?.status === "ok" ? cs.tagGreen : cs.tagRed}`}>
                    {data.graphql?.status}
                  </span>
                </td>
                <td className={cs.mono}>{data.graphql?.error ?? "ok"}</td>
              </tr>
              <tr>
                <td>Chain</td>
                <td className={cs.mono}>-</td>
                <td><span className={`${cs.tag} ${cs.tagBlue}`}>{data.chain_id}</span></td>
                <td>Intuition L3</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}
