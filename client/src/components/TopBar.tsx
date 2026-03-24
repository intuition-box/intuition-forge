import { useState } from "react";
import { useWallet } from "@/hooks/useWallet";
import { useTheme } from "@/hooks/useTheme";
import styles from "@/styles/layout.module.css";
import cs from "@/styles/components.module.css";

interface TopBarProps {
  title: string;
}

export function TopBar({ title }: TopBarProps) {
  const wallet = useWallet();
  const { theme, toggleTheme } = useTheme();
  const [showPicker, setShowPicker] = useState(false);

  const handleConnect = () => {
    if (wallet.wallets.length > 1) {
      setShowPicker(!showPicker);
    } else {
      wallet.connect();
    }
  };

  return (
    <div className={styles.topBar}>
      <h1 className={styles.topBarTitle}>{title}</h1>
      <div className={styles.topBarActions}>
        <button
          className={`${cs.btn} ${cs.btnSecondary} ${cs.btnSmall}`}
          onClick={toggleTheme}
          title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
        >
          {theme === "dark" ? "\u2600" : "\u263E"}
        </button>
        {wallet.connected ? (
          <button
            className={`${cs.btn} ${cs.btnSecondary} ${cs.btnSmall}`}
            onClick={wallet.disconnect}
            title="Disconnect wallet"
          >
            {wallet.address?.slice(0, 6)}...{wallet.address?.slice(-4)}{" "}
            &middot; {wallet.balance} TRUST
          </button>
        ) : (
          <div style={{ position: "relative" }}>
            {wallet.error && (
              <span
                style={{
                  fontSize: "0.75rem",
                  color: "var(--accent-red)",
                  position: "absolute",
                  bottom: "100%",
                  right: 0,
                  marginBottom: 4,
                  maxWidth: 300,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  background: "var(--bg-card)",
                  padding: "4px 8px",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--accent-red-bg)",
                }}
                title={wallet.error}
              >
                {wallet.error}
              </span>
            )}
            <button
              className={`${cs.btn} ${cs.btnPrimary} ${cs.btnSmall}`}
              onClick={handleConnect}
              disabled={wallet.connecting}
            >
              {wallet.connecting ? "Connecting..." : "Connect Wallet"}
            </button>
            {showPicker && wallet.wallets.length > 1 && (
              <div
                style={{
                  position: "absolute",
                  top: "100%",
                  right: 0,
                  marginTop: 8,
                  background: "var(--bg-card)",
                  border: "1px solid var(--border-default)",
                  borderRadius: "var(--radius-md)",
                  padding: 8,
                  minWidth: 200,
                  zIndex: 100,
                  boxShadow: "var(--shadow-lg)",
                }}
              >
                {wallet.wallets.map((w, i) => (
                  <button
                    key={i}
                    className={cs.btn}
                    style={{
                      width: "100%",
                      background: "transparent",
                      color: "var(--text-primary)",
                      justifyContent: "flex-start",
                      padding: "8px 12px",
                      fontSize: "0.85rem",
                      border: "none",
                      borderRadius: "var(--radius-sm)",
                    }}
                    onClick={() => {
                      setShowPicker(false);
                      wallet.connect(w.provider);
                    }}
                  >
                    {w.icon && (
                      <img
                        src={w.icon}
                        alt=""
                        style={{ width: 20, height: 20, borderRadius: 4 }}
                      />
                    )}
                    {w.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
