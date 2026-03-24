import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { api } from "@/services/api";
import { useApi } from "@/hooks/useApi";
import { KpiCard } from "@/components/KpiCard";
import { Panel } from "@/components/Panel";
import { Loader } from "@/components/Loader";
import cs from "@/styles/components.module.css";

const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
];

export function OverviewPage() {
  const { data: stats, loading: statsLoading } = useApi(() => api.stats.overview(), []);
  const { data: activity } = useApi(() => api.stats.activity(), []);
  const { data: topAtoms } = useApi(() => api.stats.topAtoms(8), []);
  const { data: predicates } = useApi(() => api.stats.predicates(), []);

  if (statsLoading || !stats) return <Loader />;

  const predicateData = predicates?.atoms?.slice(0, 6).map((p) => ({
    name: p.label || "unknown",
    value: p.as_predicate_triples_aggregate.aggregate.count,
  })) ?? [];

  const topAtomsData = topAtoms?.atoms?.slice(0, 8).map((a) => ({
    name: (a.label ?? "").length > 18 ? (a.label ?? "").slice(0, 18) + "..." : (a.label ?? ""),
    positions: a.vault?.position_count ?? 0,
  })) ?? [];

  const recentAtoms = activity?.atoms?.slice(0, 8) ?? [];
  const recentTriples = activity?.triples?.slice(0, 6) ?? [];

  return (
    <>
      <div className={cs.kpiGrid}>
        <KpiCard label="Total Atoms" value={stats.atoms_count} icon={"\u25C6"} color="blue" subtitle={`Block #${stats.block_number.toLocaleString()}`} />
        <KpiCard label="Total Triples" value={stats.triples_count} icon={"\u25B3"} color="purple" subtitle={`${predicateData.length} predicate types`} />
        <KpiCard label="Positions" value={stats.positions_count} icon={"\u2B50"} color="green" subtitle="Active stakers" />
        <KpiCard label="Costs" value={`${stats.atom_cost_trust} / ${stats.triple_cost_trust}`} icon={"\u26A1"} color="orange" subtitle="Atom / Triple (TRUST)" />
      </div>

      <div className={cs.chartsRow}>
        <Panel title="Top Atoms by Positions">
          <div className={cs.chartContainer}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topAtomsData} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-default)" />
                <XAxis dataKey="name" tick={{ fill: "var(--text-muted)", fontSize: 11 }} axisLine={{ stroke: "var(--border-default)" }} />
                <YAxis tick={{ fill: "var(--text-muted)", fontSize: 11 }} axisLine={{ stroke: "var(--border-default)" }} />
                <Tooltip contentStyle={{ background: "var(--bg-card)", border: "1px solid var(--border-default)", borderRadius: 8, color: "var(--text-primary)", fontSize: 13 }} />
                <Bar dataKey="positions" fill="var(--accent-blue)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Predicate Distribution">
          <div className={cs.chartContainer}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={predicateData} cx="50%" cy="50%" outerRadius={90} innerRadius={50} dataKey="value" paddingAngle={2}>
                  {predicateData.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]!} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: "var(--bg-card)", border: "1px solid var(--border-default)", borderRadius: 8, color: "var(--text-primary)", fontSize: 13 }} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", marginTop: 4 }}>
              {predicateData.map((p, i) => (
                <span key={p.name} style={{ fontSize: "0.72rem", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: CHART_COLORS[i % CHART_COLORS.length] }} />
                  {p.name} ({p.value})
                </span>
              ))}
            </div>
          </div>
        </Panel>
      </div>

      <div className={cs.chartsRow}>
        <Panel title="Recent Atoms">
          <div className={cs.tableScroll}>
            <table className={cs.table}>
              <thead>
                <tr>
                  <th>Label</th>
                  <th>Type</th>
                  <th>Creator</th>
                </tr>
              </thead>
              <tbody>
                {recentAtoms.map((a) => (
                  <tr key={a.term_id}>
                    <td>{a.label}</td>
                    <td><span className={`${cs.tag} ${cs.tagBlue}`}>{a.type}</span></td>
                    <td className={cs.mono}>{a.creator_id?.slice(0, 10)}...</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel title="Recent Triples">
          <div className={cs.tableScroll}>
            {recentTriples.map((t) => (
              <div key={t.term_id} className={cs.activityItem}>
                <div className={cs.activityDot} style={{ background: "var(--accent-purple)" }} />
                <div className={cs.activityContent}>
                  <div className={cs.activityLabel}>
                    {t.subject.label} &rarr; {t.predicate.label} &rarr; {t.object.label}
                  </div>
                  <div className={cs.activityMeta}>
                    {t.creator_id?.slice(0, 10)}...
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </>
  );
}
