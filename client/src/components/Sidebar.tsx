import { useLocation, useNavigate } from "react-router-dom";
import styles from "@/styles/layout.module.css";

interface NavItem {
  icon: string;
  label: string;
  path: string;
}

const navItems: NavItem[] = [
  { icon: "\u2302", label: "Overview", path: "/" },
  { icon: "\u25C6", label: "Atoms", path: "/atoms" },
  { icon: "\u25B3", label: "Triples", path: "/triples" },
  { icon: "\u26A1", label: "Batch Ops", path: "/batch" },
];

export function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <aside className={styles.sidebar}>
      <div className={styles.sidebarLogo}>
        <div className={styles.logoIcon}>iN</div>
        <div>
          <div className={styles.logoText}>Intuition</div>
          <div className={styles.logoSub}>Forge</div>
        </div>
      </div>

      <nav className={styles.sidebarNav}>
        <div className={styles.navSection}>Main</div>
        {navItems.map((item) => {
          const active = location.pathname === item.path;
          return (
            <button
              key={item.path}
              className={`${styles.navItem} ${active ? styles.navItemActive : ""}`}
              onClick={() => navigate(item.path)}
            >
              <span className={styles.navIcon}>{item.icon}</span>
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className={styles.sidebarFooter}>
        <div className={styles.chainBadge}>
          <div className={styles.chainDot} />
          <span>Chain 1155 &middot; Intuition</span>
        </div>
      </div>
    </aside>
  );
}
