import { ReactNode } from "react";
import cs from "@/styles/components.module.css";

interface PanelProps {
  title: string;
  badge?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}

export function Panel({ title, badge, actions, children }: PanelProps) {
  return (
    <div className={cs.panel}>
      <div className={cs.panelHeader}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span className={cs.panelTitle}>{title}</span>
          {badge}
        </div>
        {actions}
      </div>
      <div className={cs.panelBody}>{children}</div>
    </div>
  );
}
