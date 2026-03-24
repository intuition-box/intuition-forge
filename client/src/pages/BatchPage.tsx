import { useState } from "react";
import { api } from "@/services/api";
import { useApi } from "@/hooks/useApi";
import { useWallet } from "@/hooks/useWallet";
import { Panel } from "@/components/Panel";
import { KpiCard } from "@/components/KpiCard";
import cs from "@/styles/components.module.css";
import type { BatchPreparation, UnsignedTx } from "@/types/api";
import { EXPLORER_URL } from "@/config/constants";

type BatchMode = "atoms" | "triples";
type BatchStatus = "idle" | "preparing" | "ready" | "executing" | "done" | "error";

export function BatchPage() {
  const wallet = useWallet();
  const { data: costs } = useApi(() => api.batch.costs(), []);

  const [mode, setMode] = useState<BatchMode>("atoms");
  const [inputText, setInputText] = useState("");
  const [status, setStatus] = useState<BatchStatus>("idle");
  const [preparation, setPreparation] = useState<BatchPreparation | null>(null);
  const [currentBatch, setCurrentBatch] = useState(0);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (msg: string) => setLogs((l) => [...l, `[${new Date().toLocaleTimeString()}] ${msg}`]);

  async function handlePrepare() {
    setStatus("preparing");
    setError(null);
    setLogs([]);
    addLog(`Preparing ${mode} batch...`);

    try {
      if (mode === "atoms") {
        const lines = inputText.trim().split("\n").filter(Boolean);
        const entities = lines.map((line) => {
          const [name, description] = line.split("|").map((s) => s.trim());
          return { name: name ?? "", description: description ?? "" };
        });
        addLog(`Parsed ${entities.length} entities`);
        const result = await api.batch.prepareAtoms(entities);
        setPreparation(result);
        addLog(`${result.existing} already exist, ${result.to_create} to create in ${result.batches.length} batches`);
      } else {
        const triples = JSON.parse(inputText) as Array<{
          subject_id: string;
          predicate_id: string;
          object_id: string;
        }>;
        addLog(`Parsed ${triples.length} triples`);
        const result = await api.batch.prepareTriples(triples);
        setPreparation(result);
        addLog(`${result.existing} already exist, ${result.to_create} to create in ${result.batches.length} batches`);
      }
      setStatus("ready");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      addLog(`ERROR: ${msg}`);
      setStatus("error");
    }
  }

  async function handleExecuteBatch(batchIndex: number) {
    if (!wallet.signer || !preparation) return;
    setCurrentBatch(batchIndex);
    setStatus("executing");
    setError(null);

    const batch = preparation.batches[batchIndex];
    if (!batch) return;

    addLog(`Executing batch ${batchIndex + 1}/${preparation.batches.length} (${batch.items.length} items)...`);

    try {
      let tx: UnsignedTx;
      if (mode === "atoms") {
        tx = await api.batch.buildAtomTx(batch.items);
      } else {
        tx = await api.batch.buildTripleTx(batch.items);
      }

      addLog(`TX built: ${tx.to} value=${(BigInt(tx.value) / BigInt(10 ** 18)).toString()} TRUST`);
      addLog("Confirm in MetaMask...");

      const txResponse = await wallet.signer.sendTransaction({
        to: tx.to,
        data: tx.data,
        value: BigInt(tx.value),
      });

      setTxHash(txResponse.hash);
      addLog(`TX sent: ${txResponse.hash.slice(0, 14)}...`);

      const receipt = await txResponse.wait();
      addLog(`Confirmed in block ${receipt?.blockNumber}`);
      setStatus("done");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      addLog(`ERROR: ${msg}`);
      setStatus("error");
    }
  }

  return (
    <>
      <div className={cs.kpiGrid} style={{ gridTemplateColumns: "repeat(2, 1fr)" }}>
        <KpiCard
          label="Atom Cost"
          value={costs ? `${costs.atom_cost_trust} TRUST` : "..."}
          icon={"\u25C6"}
          color="blue"
        />
        <KpiCard
          label="Triple Cost"
          value={costs ? `${costs.triple_cost_trust} TRUST` : "..."}
          icon={"\u25B3"}
          color="purple"
        />
      </div>

      <Panel
        title="Batch Operations"
        badge={
          <span className={`${cs.tag} ${mode === "atoms" ? cs.tagBlue : cs.tagPurple}`}>
            {mode === "atoms" ? "Create Atoms" : "Create Triples"}
          </span>
        }
        actions={
          <div style={{ display: "flex", gap: 8 }}>
            <button
              className={`${cs.btn} ${mode === "atoms" ? cs.btnPrimary : cs.btnSecondary} ${cs.btnSmall}`}
              onClick={() => { setMode("atoms"); setPreparation(null); setStatus("idle"); }}
            >
              Atoms
            </button>
            <button
              className={`${cs.btn} ${mode === "triples" ? cs.btnPrimary : cs.btnSecondary} ${cs.btnSmall}`}
              onClick={() => { setMode("triples"); setPreparation(null); setStatus("idle"); }}
            >
              Triples
            </button>
          </div>
        }
      >
        {!wallet.connected && (
          <div className={cs.emptyState}>
            <div className={cs.emptyIcon}>{"\u{1F512}"}</div>
            <p>Connect your wallet to execute batch operations</p>
            <button className={`${cs.btn} ${cs.btnPrimary}`} onClick={() => wallet.connect()} style={{ marginTop: 16 }}>
              Connect Wallet
            </button>
          </div>
        )}

        {wallet.connected && (
          <>
            <textarea
              className={cs.input}
              rows={6}
              placeholder={
                mode === "atoms"
                  ? "One entity per line: name | description (optional)\nExample:\nEthereum | Decentralized blockchain\nVitalik Buterin | Co-founder"
                  : 'JSON array of triples:\n[{"subject_id": "0x...", "predicate_id": "0x...", "object_id": "0x..."}]'
              }
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              style={{ fontFamily: "var(--font-mono)", fontSize: "0.82rem", resize: "vertical" }}
            />

            <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
              <button
                className={`${cs.btn} ${cs.btnPrimary}`}
                onClick={handlePrepare}
                disabled={!inputText.trim() || status === "preparing" || status === "executing"}
              >
                {status === "preparing" ? "Preparing..." : "Prepare Batches"}
              </button>
            </div>

            {preparation && status !== "idle" && (
              <div style={{ marginTop: 20 }}>
                <div className={cs.kpiGrid} style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
                  <div className={cs.kpiCard}>
                    <div className={cs.kpiLabel}>Total Items</div>
                    <div className={cs.kpiValue}>{preparation.total_items}</div>
                  </div>
                  <div className={cs.kpiCard}>
                    <div className={cs.kpiLabel}>Already Exist</div>
                    <div className={cs.kpiValue} style={{ color: "var(--accent-green)" }}>{preparation.existing}</div>
                  </div>
                  <div className={cs.kpiCard}>
                    <div className={cs.kpiLabel}>To Create</div>
                    <div className={cs.kpiValue} style={{ color: "var(--accent-orange)" }}>{preparation.to_create}</div>
                  </div>
                </div>

                {preparation.batches.map((batch, i) => (
                  <div key={i} style={{ marginTop: 12, padding: 16, background: "var(--bg-tertiary)", borderRadius: "var(--radius-md)", border: "1px solid var(--border-default)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>
                        Batch {i + 1} &middot; {batch.items.length} items
                      </span>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <span className={cs.mono} style={{ color: "var(--accent-orange)" }}>
                          {batch.total_cost_trust.toFixed(4)} TRUST
                        </span>
                        <button
                          className={`${cs.btn} ${cs.btnGreen} ${cs.btnSmall}`}
                          onClick={() => handleExecuteBatch(i)}
                          disabled={status === "executing"}
                        >
                          {status === "executing" && currentBatch === i ? "Executing..." : "Execute"}
                        </button>
                      </div>
                    </div>
                    <div style={{ maxHeight: 120, overflow: "auto", fontSize: "0.78rem", color: "var(--text-secondary)" }}>
                      {batch.items.map((item, j) => (
                        <div key={j} style={{ padding: "2px 0", borderBottom: "1px solid var(--border-subtle)" }}>
                          {"label" in item ? (item as { label: string }).label : `${(item as { subject_label?: string }).subject_label ?? ""} -> ${(item as { object_label?: string }).object_label ?? ""}`}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {txHash && (
              <div style={{ marginTop: 16, padding: 12, background: "var(--accent-green-bg)", borderRadius: "var(--radius-sm)", fontSize: "0.85rem" }}>
                TX:{" "}
                <a href={`${EXPLORER_URL}/tx/${txHash}`} target="_blank" rel="noopener noreferrer" className={cs.mono}>
                  {txHash}
                </a>
              </div>
            )}

            {error && (
              <div style={{ marginTop: 16, padding: 12, background: "var(--accent-red-bg)", borderRadius: "var(--radius-sm)", fontSize: "0.85rem", color: "var(--accent-red)" }}>
                {error}
              </div>
            )}

            {logs.length > 0 && (
              <div style={{ marginTop: 16, background: "var(--bg-input)", border: "1px solid var(--border-default)", borderRadius: "var(--radius-sm)", padding: 12, fontFamily: "var(--font-mono)", fontSize: "0.75rem", maxHeight: 200, overflow: "auto", color: "var(--text-secondary)", whiteSpace: "pre-wrap" }}>
                {logs.join("\n")}
              </div>
            )}
          </>
        )}
      </Panel>
    </>
  );
}
