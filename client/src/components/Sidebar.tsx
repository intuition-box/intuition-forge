import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getRpcKey, setRpcKey } from "@/services/api";
import styles from "@/styles/layout.module.css";
import cs from "@/styles/components.module.css";

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
  { icon: "\u2661", label: "Health", path: "/health" },
];

export function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [keyInput, setKeyInput] = useState(getRpcKey());
  const [saved, setSaved] = useState(!!getRpcKey());

  function handleSaveKey() {
    setRpcKey(keyInput.trim());
    setSaved(!!keyInput.trim());
  }

  function handleClearKey() {
    setRpcKey("");
    setKeyInput("");
    setSaved(false);
  }

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
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--text-muted)", marginBottom: 6, fontWeight: 600 }}>
            RPC Key {saved && <span style={{ color: "var(--accent-green)" }}>(active)</span>}
          </div>
          <input
            className={cs.input}
            type="password"
            placeholder="Enter API key..."
            value={keyInput}
            onChange={(e) => { setKeyInput(e.target.value); setSaved(false); }}
            onKeyDown={(e) => e.key === "Enter" && handleSaveKey()}
            style={{ fontSize: "0.78rem", padding: "6px 10px", marginBottom: 6 }}
          />
          <div style={{ display: "flex", gap: 4 }}>
            <button
              className={`${cs.btn} ${cs.btnPrimary} ${cs.btnSmall}`}
              onClick={handleSaveKey}
              disabled={!keyInput.trim() || saved}
              style={{ flex: 1, padding: "4px 8px", fontSize: "0.72rem" }}
            >
              Save
            </button>
            {saved && (
              <button
                className={`${cs.btn} ${cs.btnSecondary} ${cs.btnSmall}`}
                onClick={handleClearKey}
                style={{ padding: "4px 8px", fontSize: "0.72rem" }}
              >
                Clear
              </button>
            )}
          </div>
        </div>
        <div className={styles.chainBadge}>
          <div className={styles.chainDot} />
          <span>Chain 1155 &middot; Intuition</span>
        </div>
      </div>
    </aside>
  );
}
