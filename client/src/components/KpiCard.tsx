import cs from "@/styles/components.module.css";

interface KpiCardProps {
  label: string;
  value: string | number;
  icon: string;
  color: "blue" | "purple" | "green" | "orange";
  subtitle?: string;
}

const colorMap = {
  blue: cs.kpiIconBlue,
  purple: cs.kpiIconPurple,
  green: cs.kpiIconGreen,
  orange: cs.kpiIconOrange,
};

export function KpiCard({ label, value, icon, color, subtitle }: KpiCardProps) {
  return (
    <div className={cs.kpiCard}>
      <div className={cs.kpiHeader}>
        <span className={cs.kpiLabel}>{label}</span>
        <div className={`${cs.kpiIcon} ${colorMap[color]}`}>{icon}</div>
      </div>
      <div className={cs.kpiValue}>{typeof value === "number" ? value.toLocaleString() : value}</div>
      {subtitle && <div className={cs.kpiChange}>{subtitle}</div>}
    </div>
  );
}
