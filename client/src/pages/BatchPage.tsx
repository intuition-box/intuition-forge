import { useState, useRef, useCallback } from "react";
import { api } from "@/services/api";
import { useApi } from "@/hooks/useApi";
import { useWallet } from "@/hooks/useWallet";
import { Panel } from "@/components/Panel";
import cs from "@/styles/components.module.css";
import type { BatchPreparation, UnsignedTx } from "@/types/api";
import { EXPLORER_URL } from "@/config/constants";

type BatchMode = "atoms" | "triples";

interface LogEntry {
  time: string;
  msg: string;
  type: "info" | "success" | "error" | "warn" | "step";
}

export function BatchPage() {
  const wallet = useWallet();
  const { data: costs } = useApi(() => api.batch.costs(), []);

  const [mode, setMode] = useState<BatchMode>("atoms");
  const [inputText, setInputText] = useState("");
  const [preparation, setPreparation] = useState<BatchPreparation | null>(null);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, phase: "" });
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const logRef = useRef<HTMLDivElement>(null);
  const stopRef = useRef(false);

  const addLog = useCallback((msg: string, type: LogEntry["type"] = "info") => {
    const time = new Date().toLocaleTimeString();
    setLogs((l) => [...l, { time, msg, type }]);
    setTimeout(() => logRef.current?.scrollTo(0, logRef.current.scrollHeight), 50);
  }, []);

  async function handlePrepare() {
    setPreparation(null);
    setLogs([]);
    stopRef.current = false;

    addLog(`--- Preparing ${mode} import ---`, "step");

    try {
      if (mode === "atoms") {
        const lines = inputText.trim().split("\n").filter(Boolean);
        const entities = lines.map((line) => {
          const [name, description] = line.split("|").map((s) => s.trim());
          return { name: name ?? "", description: description ?? "" };
        });
        addLog(`Parsed ${entities.length} entities from input`);
        addLog("Pinning to IPFS + checking on-chain existence...", "step");

        const result = await api.batch.prepareAtoms(entities);
        setPreparation(result);

        addLog(`IPFS pinning complete`, "success");
        addLog(`  Total: ${result.total_items} | Existing: ${result.existing} | To create: ${result.to_create}`);
        if (result.batches.length > 0) {
          addLog(`  ${result.batches.length} batch(es) of up to 20 items`, "info");
          addLog(`  Estimated cost: ${result.batches.reduce((s, b) => s + b.total_cost_trust, 0).toFixed(4)} TRUST`, "warn");
        } else {
          addLog("Nothing to create — all entities already exist on-chain", "success");
        }
      } else {
        const triples = JSON.parse(inputText) as Array<{
          subject_id: string;
          predicate_id: string;
          object_id: string;
        }>;
        addLog(`Parsed ${triples.length} triples from JSON`);
        addLog("Checking on-chain existence...", "step");

        const result = await api.batch.prepareTriples(triples);
        setPreparation(result);

        addLog(`Existence check complete`, "success");
        addLog(`  Total: ${result.total_items} | Existing: ${result.existing} | To create: ${result.to_create}`);
        if (result.batches.length > 0) {
          addLog(`  ${result.batches.length} batch(es) of up to 20 items`);
          addLog(`  Estimated cost: ${result.batches.reduce((s, b) => s + b.total_cost_trust, 0).toFixed(4)} TRUST`, "warn");
        } else {
          addLog("Nothing to create — all triples already exist on-chain", "success");
        }
      }
    } catch (e) {
      addLog(`FAILED: ${e instanceof Error ? e.message : String(e)}`, "error");
    }
  }

  async function handleExecuteAll() {
    if (!wallet.signer || !preparation) return;
    setRunning(true);
    stopRef.current = false;
    const totalBatches = preparation.batches.length;
    setProgress({ current: 0, total: totalBatches, phase: "Starting..." });

    addLog(`--- Executing ${totalBatches} batch(es) ---`, "step");

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < totalBatches; i++) {
      if (stopRef.current) {
        addLog("Stopped by user", "warn");
        break;
      }

      const batch = preparation.batches[i]!;
      setProgress({ current: i + 1, total: totalBatches, phase: `Batch ${i + 1}/${totalBatches}` });
      addLog(`[Batch ${i + 1}/${totalBatches}] ${batch.items.length} items — ${batch.total_cost_trust.toFixed(4)} TRUST`, "step");

      try {
        // Build TX
        addLog(`  Building transaction...`);
        let tx: UnsignedTx;
        if (mode === "atoms") {
          tx = await api.batch.buildAtomTx(batch.items);
        } else {
          tx = await api.batch.buildTripleTx(batch.items);
        }
        addLog(`  TX ready — value: ${(BigInt(tx.value) / BigInt(10 ** 18)).toString()} TRUST`);

        // Send
        addLog(`  Waiting for wallet confirmation...`, "warn");
        const txResponse = await wallet.signer.sendTransaction({
          to: tx.to,
          data: tx.data,
          value: BigInt(tx.value),
        });
        addLog(`  TX sent: ${txResponse.hash.slice(0, 18)}...`);

        // Wait
        addLog(`  Waiting for confirmation...`);
        const receipt = await txResponse.wait();
        addLog(`  Confirmed in block #${receipt?.blockNumber} [${EXPLORER_URL}/tx/${txResponse.hash}]`, "success");
        successCount++;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (msg.includes("rejected") || msg.includes("denied")) {
          addLog(`  User rejected transaction`, "warn");
        } else {
          addLog(`  FAILED: ${msg.slice(0, 200)}`, "error");
        }
        failCount++;
      }
    }

    addLog(`--- Import complete ---`, "step");
    addLog(`  Success: ${successCount} | Failed: ${failCount} | Total: ${totalBatches}`, successCount === totalBatches ? "success" : "warn");
    setRunning(false);
    setProgress({ current: totalBatches, total: totalBatches, phase: "Done" });
  }

  const logColors: Record<LogEntry["type"], string> = {
    info: "var(--text-secondary)",
    success: "var(--accent-green)",
    error: "var(--accent-red)",
    warn: "var(--accent-orange)",
    step: "var(--accent-blue)",
  };

  return (
    <>
      <Panel
        title="Intuition Forge"
        badge={
          <span className={`${cs.tag} ${mode === "atoms" ? cs.tagBlue : cs.tagPurple}`}>
            {mode === "atoms" ? "Atoms" : "Triples"}
          </span>
        }
        actions={
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {costs && (
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                Atom: {costs.atom_cost_trust} | Triple: {costs.triple_cost_trust} TRUST
              </span>
            )}
            <button
              className={`${cs.btn} ${mode === "atoms" ? cs.btnPrimary : cs.btnSecondary} ${cs.btnSmall}`}
              onClick={() => { setMode("atoms"); setPreparation(null); setLogs([]); }}
            >
              Atoms
            </button>
            <button
              className={`${cs.btn} ${mode === "triples" ? cs.btnPrimary : cs.btnSecondary} ${cs.btnSmall}`}
              onClick={() => { setMode("triples"); setPreparation(null); setLogs([]); }}
            >
              Triples
            </button>
          </div>
        }
      >
        {!wallet.connected ? (
          <div className={cs.emptyState}>
            <div className={cs.emptyIcon}>{"\u{1F512}"}</div>
            <p>Connect your wallet to start importing</p>
            <button className={`${cs.btn} ${cs.btnPrimary}`} onClick={() => wallet.connect()} style={{ marginTop: 16 }}>
              Connect Wallet
            </button>
          </div>
        ) : (
          <>
            {/* Input */}
            <textarea
              className={cs.input}
              rows={8}
              placeholder={
                mode === "atoms"
                  ? "One entity per line: name | description (optional)\n\nExample:\nEthereum | Decentralized blockchain\nVitalik Buterin | Co-founder of Ethereum\nDeFi | Decentralized Finance"
                  : 'JSON array of triples:\n[\n  {"subject_id": "0x...", "predicate_id": "0x...", "object_id": "0x..."}\n]'
              }
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              disabled={running}
              style={{ fontFamily: "var(--font-mono)", fontSize: "0.82rem", resize: "vertical" }}
            />

            {/* Actions */}
            <div style={{ display: "flex", gap: 12, marginTop: 16, alignItems: "center" }}>
              <button
                className={`${cs.btn} ${cs.btnPrimary}`}
                onClick={handlePrepare}
                disabled={!inputText.trim() || running}
              >
                {running ? "Running..." : "1. Prepare"}
              </button>
              {preparation && preparation.batches.length > 0 && (
                <button
                  className={`${cs.btn} ${cs.btnGreen}`}
                  onClick={handleExecuteAll}
                  disabled={running}
                >
                  {running ? "Executing..." : `2. Execute All (${preparation.batches.length} batch${preparation.batches.length > 1 ? "es" : ""})`}
                </button>
              )}
              {running && (
                <button
                  className={`${cs.btn} ${cs.btnSecondary}`}
                  onClick={() => { stopRef.current = true; }}
                  style={{ color: "var(--accent-red)" }}
                >
                  Stop
                </button>
              )}
            </div>

            {/* Progress bar */}
            {progress.total > 0 && (
              <div style={{ marginTop: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: 4 }}>
                  <span>{progress.phase}</span>
                  <span>{progress.current}/{progress.total}</span>
                </div>
                <div className={cs.progressBar}>
                  <div
                    className={cs.progressFill}
                    style={{ width: `${(progress.current / progress.total) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {/* Summary cards */}
            {preparation && (
              <div className={cs.kpiGrid} style={{ gridTemplateColumns: "repeat(3, 1fr)", marginTop: 16 }}>
                <div className={cs.kpiCard}>
                  <div className={cs.kpiLabel}>Total</div>
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
            )}

            {/* Logs */}
            {logs.length > 0 && (
              <div
                ref={logRef}
                style={{
                  marginTop: 16,
                  background: "var(--bg-input)",
                  border: "1px solid var(--border-default)",
                  borderRadius: "var(--radius-sm)",
                  padding: 14,
                  fontFamily: "var(--font-mono)",
                  fontSize: "0.78rem",
                  maxHeight: 400,
                  overflow: "auto",
                  lineHeight: 1.7,
                }}
              >
                {logs.map((entry, i) => (
                  <div key={i} style={{ color: logColors[entry.type] }}>
                    <span style={{ color: "var(--text-muted)" }}>{entry.time}</span>{" "}
                    {entry.msg}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </Panel>
    </>
  );
}
