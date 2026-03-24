import { useWallet } from "@/hooks/useWallet";
import cs from "@/styles/components.module.css";

interface WalletPickerProps {
  label?: string;
}

export function WalletPicker({ label = "Choose a wallet" }: WalletPickerProps) {
  const wallet = useWallet();

  if (wallet.wallets.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: 16, color: "var(--text-muted)", fontSize: "0.85rem" }}>
        No wallet detected. Install MetaMask or another Web3 wallet.
      </div>
    );
  }

  return (
    <div>
      {label && (
        <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: 10 }}>
          {label}
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {wallet.wallets.map((w, i) => (
          <button
            key={i}
            className={`${cs.btn} ${cs.btnSecondary}`}
            onClick={() => wallet.connect(w.provider)}
            disabled={wallet.connecting}
            style={{
              justifyContent: "flex-start",
              padding: "10px 16px",
              width: "100%",
            }}
          >
            {w.icon && (
              <img src={w.icon} alt="" style={{ width: 22, height: 22, borderRadius: 4 }} />
            )}
            {w.name}
          </button>
        ))}
      </div>
      {wallet.connecting && (
        <div style={{ fontSize: "0.8rem", color: "var(--accent-blue)", marginTop: 8 }}>
          Connecting...
        </div>
      )}
      {wallet.error && (
        <div style={{ fontSize: "0.8rem", color: "var(--accent-red)", marginTop: 8 }}>
          {wallet.error}
        </div>
      )}
    </div>
  );
}
