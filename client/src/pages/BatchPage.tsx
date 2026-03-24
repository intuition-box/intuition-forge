import { useState, useRef, useCallback, useEffect } from "react";
import { api } from "@/services/api";
import { useApi } from "@/hooks/useApi";
import { useWallet } from "@/hooks/useWallet";
import { useToast } from "@/components/Toast";
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

interface BatchResult {
  batchIndex: number;
  txHash: string;
  blockNumber: number;
  items: number;
}

const STORAGE_KEY = "intuition-forge-progress";
const ATOMS_PLACEHOLDER = `DeFi's hidden risk stack | Mapping real DeFi risk — EthCC[9] Kelly Stage
Building the Financial Layer 1 for Trillions Onchain | Pharos bridging TradFi
The State of Ethereum L2s | Ed Felten on L2 scaling
Privacy as a Public Good | Adrian Brink, Cypherpunk track
AI Agents in DeFi: Risks and Opportunities | Devon Martens, AI track
Julien Bouteloup | Rekt — DeFi speaker
Ed Felten | Offchain Labs — Layer 2s speaker
Uniswap | Decentralized exchange protocol`;

const TRIPLES_PLACEHOLDER = `[
  {
    "subject_id": "0xbc6ede1c524cc597fe94973e7522dd4eff89380df3f2e71477c16960b5027766",
    "predicate_id": "0xddbdcf95cfac2135b0dfbfa055952b839ce5ee0467a5729eb15f9df250d3cf37",
    "object_id": "0x5a25d14b408e1ad97660fdbe66b826401e4116b9e6d3f5e6eb53287435ec0837",
    "subject_label": "Justin Drake",
    "predicate_label": "speaking at",
    "object_label": "Quantum dilema"
  }
]`;

// Per-item status tracking
interface ItemStatus {
  label: string;
  status: "pending" | "pinning" | "pinned" | "creating" | "created" | "skipped" | "error";
}

export function BatchPage() {
  const wallet = useWallet();
  const toast = useToast();
  const { data: costs, loading: costsLoading } = useApi(() => api.batch.costs(), []);

  const [mode, setMode] = useState<BatchMode>("atoms");
  const [inputText, setInputText] = useState("");
  const [preparation, setPreparation] = useState<BatchPreparation | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, phase: "" });
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [items, setItems] = useState<ItemStatus[]>([]);
  const [results, setResults] = useState<BatchResult[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [modalBatch, setModalBatch] = useState<{ index: number; items: number; cost: number } | null>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const stopRef = useRef(false);
  const resolveModalRef = useRef<((go: boolean) => void) | null>(null);

  // Resume detection
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        if (data.inputText && data.mode && data.completedBatches !== undefined) {
          setMode(data.mode);
          setInputText(data.inputText);
          addLog(`Found interrupted import (${data.completedBatches} batches completed). Click Prepare to resume.`, "warn");
        }
      } catch { /* ignore */ }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addLog = useCallback((msg: string, type: LogEntry["type"] = "info") => {
    const time = new Date().toLocaleTimeString();
    setLogs((l) => [...l, { time, msg, type }]);
    setTimeout(() => logRef.current?.scrollTo(0, logRef.current.scrollHeight), 50);
  }, []);

  function updateItemStatus(index: number, status: ItemStatus["status"]) {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, status } : item)));
  }

  async function handlePrepare() {
    setPreparation(null);
    setResults([]);
    setLogs([]);
    setItems([]);
    setPreparing(true);
    stopRef.current = false;

    addLog(`--- Preparing ${mode} import ---`, "step");

    try {
      if (mode === "atoms") {
        const lines = inputText.trim().split("\n").filter(Boolean);
        const entities = lines.map((line) => {
          const [name, description] = line.split("|").map((s) => s.trim());
          return { name: name ?? "", description: description ?? "" };
        });

        // Init item statuses
        setItems(entities.map((e) => ({ label: e.name, status: "pinning" as const })));
        addLog(`Parsed ${entities.length} entities`);
        addLog("Pinning to IPFS + checking on-chain...", "step");

        const result = await api.batch.prepareAtoms(entities);
        setPreparation(result);

        // Update item statuses based on result
        const allItems = result.batches.flatMap((b) => b.items);
        setItems(entities.map((e) => {
          const found = allItems.find((i) => "label" in i && (i as { label: string }).label === e.name);
          if (found) return { label: e.name, status: "pinned" as const };
          return { label: e.name, status: "skipped" as const };
        }));

        addLog(`IPFS pinning complete`, "success");
        addLog(`  Total: ${result.total_items} | Existing: ${result.existing} | To create: ${result.to_create}`);
        toast(`${result.to_create} atoms ready to create`, "success");

        if (result.batches.length > 0) {
          const totalCost = result.batches.reduce((s, b) => s + b.total_cost_trust, 0);
          addLog(`  ${result.batches.length} batch(es) — estimated ${totalCost.toFixed(4)} TRUST`, "warn");
        } else {
          addLog("All entities already exist on-chain", "success");
        }
      } else {
        const triples = JSON.parse(inputText) as Array<{
          subject_id: string; predicate_id: string; object_id: string;
          subject_label?: string; object_label?: string;
        }>;
        setItems(triples.map((t) => ({
          label: `${t.subject_label ?? t.subject_id.slice(0, 10)} -> ${t.object_label ?? t.object_id.slice(0, 10)}`,
          status: "pending" as const,
        })));
        addLog(`Parsed ${triples.length} triples`);
        addLog("Checking on-chain existence...", "step");

        const result = await api.batch.prepareTriples(triples);
        setPreparation(result);

        setItems(triples.map((t, idx) => {
          const allItems = result.batches.flatMap((b) => b.items);
          const found = allItems.some((i) => "triple_id" in i && idx < result.to_create + result.existing);
          return {
            label: `${t.subject_label ?? t.subject_id.slice(0, 10)} -> ${t.object_label ?? t.object_id.slice(0, 10)}`,
            status: found ? ("pending" as const) : ("skipped" as const),
          };
        }));

        addLog(`Existence check complete`, "success");
        addLog(`  Total: ${result.total_items} | Existing: ${result.existing} | To create: ${result.to_create}`);
        toast(`${result.to_create} triples ready to create`, "success");
      }
    } catch (e) {
      addLog(`FAILED: ${e instanceof Error ? e.message : String(e)}`, "error");
      toast("Preparation failed", "error");
    }
    setPreparing(false);
  }

  function requestConfirmation(batchIndex: number, itemCount: number, cost: number): Promise<boolean> {
    return new Promise((resolve) => {
      setModalBatch({ index: batchIndex, items: itemCount, cost });
      setShowModal(true);
      resolveModalRef.current = resolve;
    });
  }

  function handleModalConfirm() {
    setShowModal(false);
    resolveModalRef.current?.(true);
  }

  function handleModalCancel() {
    setShowModal(false);
    resolveModalRef.current?.(false);
  }

  async function handleExecuteAll() {
    if (!wallet.signer || !preparation) return;
    setRunning(true);
    stopRef.current = false;
    const totalBatches = preparation.batches.length;
    setProgress({ current: 0, total: totalBatches, phase: "Starting..." });

    // Check saved progress for resume
    let startBatch = 0;
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        if (data.mode === mode && data.completedBatches > 0) {
          startBatch = data.completedBatches;
          addLog(`Resuming from batch ${startBatch + 1} (${startBatch} already completed)`, "warn");
          toast(`Resuming from batch ${startBatch + 1}`, "info");
        }
      } catch { /* ignore */ }
    }

    addLog(`--- Executing batches ${startBatch + 1} to ${totalBatches} ---`, "step");

    let successCount = 0;
    let failCount = 0;

    for (let i = startBatch; i < totalBatches; i++) {
      if (stopRef.current) {
        addLog("Stopped by user", "warn");
        toast("Import stopped", "warn");
        break;
      }

      const batch = preparation.batches[i]!;
      setProgress({ current: i + 1, total: totalBatches, phase: `Batch ${i + 1}/${totalBatches}` });

      // Confirmation modal
      const confirmed = await requestConfirmation(i, batch.items.length, batch.total_cost_trust);
      if (!confirmed) {
        addLog(`Batch ${i + 1} skipped by user`, "warn");
        continue;
      }

      addLog(`[Batch ${i + 1}/${totalBatches}] ${batch.items.length} items — ${batch.total_cost_trust.toFixed(4)} TRUST`, "step");

      try {
        addLog(`  Building transaction...`);
        let tx: UnsignedTx;
        if (mode === "atoms") {
          tx = await api.batch.buildAtomTx(batch.items);
        } else {
          tx = await api.batch.buildTripleTx(batch.items);
        }
        addLog(`  TX ready — ${(BigInt(tx.value) / BigInt(10 ** 18)).toString()} TRUST`);

        addLog(`  Waiting for wallet signature...`, "warn");
        const txResponse = await wallet.signer.sendTransaction({
          to: tx.to,
          data: tx.data,
          value: BigInt(tx.value),
        });
        addLog(`  TX sent: ${txResponse.hash.slice(0, 18)}...`);
        toast(`Batch ${i + 1} sent`, "info");

        addLog(`  Waiting for block confirmation...`);
        const receipt = await txResponse.wait();
        const blockNum = receipt?.blockNumber ?? 0;
        addLog(`  Confirmed in block #${blockNum}`, "success");
        toast(`Batch ${i + 1}/${totalBatches} confirmed`, "success");

        setResults((r) => [...r, { batchIndex: i, txHash: txResponse.hash, blockNumber: blockNum, items: batch.items.length }]);
        successCount++;

        // Save progress for resume
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          mode, inputText, completedBatches: i + 1, timestamp: Date.now(),
        }));

        // Update per-item status
        const startIdx = preparation.batches.slice(0, i).reduce((s, b) => s + b.items.length, 0) + preparation.existing;
        for (let j = 0; j < batch.items.length; j++) {
          updateItemStatus(startIdx + j, "created");
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (msg.includes("rejected") || msg.includes("denied")) {
          addLog(`  User rejected transaction`, "warn");
          toast("Transaction rejected", "warn");
        } else {
          addLog(`  FAILED: ${msg.slice(0, 200)}`, "error");
          toast(`Batch ${i + 1} failed`, "error");
        }
        failCount++;
      }
    }

    addLog(`--- Import complete ---`, "step");
    addLog(`  Success: ${successCount} | Failed: ${failCount} | Total: ${totalBatches}`, successCount === totalBatches ? "success" : "warn");

    if (successCount === totalBatches) {
      localStorage.removeItem(STORAGE_KEY);
      toast("All batches imported successfully!", "success");
    }

    setRunning(false);
    setProgress({ current: totalBatches, total: totalBatches, phase: "Done" });
  }

  function handleExport() {
    if (!results.length) return;
    const data = {
      mode,
      timestamp: new Date().toISOString(),
      results: results.map((r) => ({
        batch: r.batchIndex + 1,
        txHash: r.txHash,
        blockNumber: r.blockNumber,
        items: r.items,
        explorerUrl: `${EXPLORER_URL}/tx/${r.txHash}`,
      })),
      preparation: preparation ? {
        total: preparation.total_items,
        existing: preparation.existing,
        created: preparation.to_create,
      } : null,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `intuition-forge-${mode}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast("Results exported", "success");
  }

  const logColors: Record<LogEntry["type"], string> = {
    info: "var(--text-secondary)",
    success: "var(--accent-green)",
    error: "var(--accent-red)",
    warn: "var(--accent-orange)",
    step: "var(--accent-blue)",
  };

  const statusColors: Record<ItemStatus["status"], string> = {
    pending: "var(--text-muted)",
    pinning: "var(--accent-blue)",
    pinned: "var(--accent-cyan)",
    creating: "var(--accent-orange)",
    created: "var(--accent-green)",
    skipped: "var(--text-muted)",
    error: "var(--accent-red)",
  };

  return (
    <>
      {/* Confirmation modal */}
      {showModal && modalBatch && (
        <div className={cs.modalOverlay} onClick={handleModalCancel}>
          <div className={cs.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={cs.modalTitle}>Confirm Batch {modalBatch.index + 1}</div>
            <table className={cs.table} style={{ marginBottom: 0 }}>
              <tbody>
                <tr><td style={{ color: "var(--text-muted)" }}>Items</td><td>{modalBatch.items}</td></tr>
                <tr><td style={{ color: "var(--text-muted)" }}>Cost</td><td style={{ color: "var(--accent-orange)", fontWeight: 600 }}>{modalBatch.cost.toFixed(4)} TRUST</td></tr>
                <tr><td style={{ color: "var(--text-muted)" }}>Target</td><td className={cs.mono}>MultiVault (0x6E35...e7e)</td></tr>
                <tr><td style={{ color: "var(--text-muted)" }}>Chain</td><td>Intuition L3 (1155)</td></tr>
              </tbody>
            </table>
            <div className={cs.modalActions}>
              <button className={`${cs.btn} ${cs.btnSecondary}`} onClick={handleModalCancel}>Skip</button>
              <button className={`${cs.btn} ${cs.btnGreen}`} onClick={handleModalConfirm}>Sign & Send</button>
            </div>
          </div>
        </div>
      )}

      <Panel
        title="Intuition Forge"
        badge={<span className={`${cs.tag} ${mode === "atoms" ? cs.tagBlue : cs.tagPurple}`}>{mode === "atoms" ? "Atoms" : "Triples"}</span>}
        actions={
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {costsLoading ? (
              <div className={`${cs.skeleton} ${cs.skeletonLine}`} style={{ width: 140, height: 12, marginBottom: 0 }} />
            ) : costs ? (
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                Atom: {costs.atom_cost_trust} | Triple: {costs.triple_cost_trust} TRUST
              </span>
            ) : null}
            <button
              className={`${cs.btn} ${mode === "atoms" ? cs.btnPrimary : cs.btnSecondary} ${cs.btnSmall}`}
              onClick={() => { setMode("atoms"); setPreparation(null); setLogs([]); setItems([]); setResults([]); }}
            >
              Atoms
            </button>
            <button
              className={`${cs.btn} ${mode === "triples" ? cs.btnPrimary : cs.btnSecondary} ${cs.btnSmall}`}
              onClick={() => { setMode("triples"); setPreparation(null); setLogs([]); setItems([]); setResults([]); }}
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
              placeholder={mode === "atoms" ? ATOMS_PLACEHOLDER : TRIPLES_PLACEHOLDER}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              disabled={running}
              style={{ fontFamily: "var(--font-mono)", fontSize: "0.8rem", resize: "vertical", lineHeight: 1.6 }}
            />

            {/* Actions */}
            <div style={{ display: "flex", gap: 12, marginTop: 16, alignItems: "center", flexWrap: "wrap" }}>
              <button className={`${cs.btn} ${cs.btnPrimary}`} onClick={handlePrepare} disabled={!inputText.trim() || running || preparing}>
                {preparing ? "Preparing..." : "1. Prepare & Simulate"}
              </button>
              {preparation && preparation.batches.length > 0 && (
                <button className={`${cs.btn} ${cs.btnGreen}`} onClick={handleExecuteAll} disabled={running || preparing}>
                  {running ? "Executing..." : `2. Execute All (${preparation.batches.length} batch${preparation.batches.length > 1 ? "es" : ""})`}
                </button>
              )}
              {running && (
                <button className={`${cs.btn} ${cs.btnSecondary}`} onClick={() => { stopRef.current = true; }} style={{ color: "var(--accent-red)" }}>
                  Stop
                </button>
              )}
              {results.length > 0 && (
                <button className={`${cs.btn} ${cs.btnSecondary}`} onClick={handleExport}>
                  Export Results
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
                  <div className={cs.progressFill} style={{ width: `${(progress.current / progress.total) * 100}%` }} />
                </div>
              </div>
            )}

            {/* Preparation skeleton */}
            {preparing && (
              <div style={{ marginTop: 16 }}>
                <div className={cs.kpiGrid} style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
                  {[0, 1, 2].map((i) => (
                    <div key={i} className={cs.kpiCard}>
                      <div className={`${cs.skeleton} ${cs.skeletonLine}`} style={{ width: "60%" }} />
                      <div className={`${cs.skeleton} ${cs.skeletonBlock}`} style={{ height: 32 }} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Summary cards */}
            {preparation && !preparing && (
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

            {/* Per-item status */}
            {items.length > 0 && (
              <div style={{ marginTop: 16, maxHeight: 200, overflow: "auto", background: "var(--bg-input)", borderRadius: "var(--radius-sm)", padding: "8px 14px", border: "1px solid var(--border-default)" }}>
                {items.map((item, i) => (
                  <div key={i} className={cs.itemRow}>
                    <div className={cs.itemDot} style={{ background: statusColors[item.status] }} />
                    <span className={cs.itemLabel}>{item.label}</span>
                    <span className={cs.itemStatus} style={{ color: statusColors[item.status] }}>{item.status}</span>
                  </div>
                ))}
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
                  maxHeight: 350,
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
