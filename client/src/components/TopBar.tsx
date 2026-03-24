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
          <button
            className={`${cs.btn} ${cs.btnPrimary} ${cs.btnSmall}`}
            onClick={wallet.connect}
            disabled={wallet.connecting}
          >
            {wallet.connecting ? "Connecting..." : "Connect Wallet"}
          </button>
        )}
      </div>
    </div>
  );
}
