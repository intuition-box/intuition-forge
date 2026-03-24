import { useState, useRef, useEffect } from "react";
import { useWallet } from "@/hooks/useWallet";
import { useTheme } from "@/hooks/useTheme";
import { WalletPicker } from "@/components/WalletPicker";
import styles from "@/styles/layout.module.css";
import cs from "@/styles/components.module.css";

interface TopBarProps {
  title: string;
}

export function TopBar({ title }: TopBarProps) {
  const wallet = useWallet();
  const { theme, toggleTheme } = useTheme();
  const [showPicker, setShowPicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Close picker on outside click
  useEffect(() => {
    if (!showPicker) return;
    function handleClick(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowPicker(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showPicker]);

  // Close picker when connected
  useEffect(() => {
    if (wallet.connected) setShowPicker(false);
  }, [wallet.connected]);

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
            &middot; {wallet.balance ?? "?"} TRUST
          </button>
        ) : (
          <div style={{ position: "relative" }} ref={pickerRef}>
            <button
              className={`${cs.btn} ${cs.btnPrimary} ${cs.btnSmall}`}
              onClick={() => setShowPicker(!showPicker)}
              disabled={wallet.connecting}
            >
              {wallet.connecting ? "Connecting..." : "Connect Wallet"}
            </button>
            {showPicker && (
              <div style={{
                position: "absolute",
                top: "100%",
                right: 0,
                marginTop: 8,
                background: "var(--bg-card)",
                border: "1px solid var(--border-default)",
                borderRadius: "var(--radius-md)",
                padding: 12,
                minWidth: 240,
                zIndex: 100,
                boxShadow: "var(--shadow-lg)",
              }}>
                <WalletPicker label="Choose a wallet" />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
