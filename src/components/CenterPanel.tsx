"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useSettlementStore } from "@/store/settlementStore";
import type { ISOMessage, TempoTransfer } from "@/lib/types";

function formatAmount(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function truncateHash(hash: string) {
  return hash.slice(0, 8) + "..." + hash.slice(-4);
}

// Only show FI-to-FI messages that passed through SWIFT (pacs.008, pacs.002)
function isSwiftMessage(m: ISOMessage) {
  return m.type === "pacs.008" || m.type === "pacs.002";
}

export default function CenterPanel() {
  const demoState = useSettlementStore((s) => s.demoState);
  const activeISOMessage = useSettlementStore((s) => s.activeISOMessage);
  const activeTempoTransfer = useSettlementStore((s) => s.activeTempoTransfer);
  const swiftFlowDirection = useSettlementStore((s) => s.swiftFlowDirection);
  const tempoFlowDirection = useSettlementStore((s) => s.tempoFlowDirection);
  const isoMessages = useSettlementStore((s) => s.isoMessages);
  const tempoTransfers = useSettlementStore((s) => s.tempoTransfers);

  const swiftActive = !!activeISOMessage;
  const tempoActive = !!activeTempoTransfer;

  // SWIFT messages that have passed through (not currently the active one)
  const completedSwift = isoMessages.filter(
    (m) => isSwiftMessage(m) && m.id !== activeISOMessage?.id
  );
  // Tempo transfers that have passed through (not currently the active one)
  const completedTempo = tempoTransfers.filter(
    (t) => t.id !== activeTempoTransfer?.id
  );

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        borderLeft: "1px solid var(--border-default)",
        borderRight: "1px solid var(--border-default)",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "var(--space-4)",
          borderBottom: "1px solid var(--border-default)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span className="label">Network Layer</span>
        <StatusBadge state={demoState} />
      </div>

      {/* SWIFT Network Box */}
      <div style={{ display: "flex", flexDirection: "column", padding: "var(--space-3)", overflow: "auto" }}>
        <div data-guide-section="swift">
        <motion.div
          animate={{
            borderColor: swiftActive ? "var(--blue-500)" : "var(--border-default)",
            boxShadow: swiftActive
              ? "0 0 24px rgba(91, 154, 255, 0.1)"
              : "none",
          }}
          transition={{ duration: 0.3 }}
          style={{
            border: "1px solid var(--border-default)",
            borderRadius: "var(--radius-md)",
            background: "var(--bg-secondary)",
            padding: "var(--space-3)",
            display: "flex",
            flexDirection: "column",
            marginBottom: "var(--space-3)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            className="label"
            style={{
              marginBottom: "var(--space-3)",
              color: swiftActive ? "var(--blue-500)" : "var(--text-secondary)",
              display: "flex",
              alignItems: "center",
              gap: "var(--space-2)",
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "var(--radius-full)",
                background: swiftActive ? "var(--blue-500)" : "var(--text-tertiary)",
                display: "inline-block",
              }}
            />
            SWIFT Network <span style={{ color: "var(--text-tertiary)", margin: "0 4px" }}>|</span> ISO 20022 Messages
          </div>

          {/* Flow line */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              width: "100%",
              padding: "0 var(--space-2)",
              marginBottom: "var(--space-3)",
            }}
          >
            <span style={{ fontSize: 10, color: "var(--text-tertiary)" }}>
              Bank A
            </span>
            <div
              style={{
                flex: 1,
                height: 1,
                margin: "0 var(--space-2)",
                background: swiftActive
                  ? "var(--blue-500)"
                  : "var(--border-strong)",
                position: "relative",
              }}
            >
              <AnimatePresence>
                {swiftActive && (
                  <motion.div
                    key="swift-dot"
                    initial={{
                      left: swiftFlowDirection === "a-to-b" ? "0%" : "100%",
                      opacity: 0,
                    }}
                    animate={{
                      left: swiftFlowDirection === "a-to-b" ? "100%" : "0%",
                      opacity: [0, 1, 1, 0],
                    }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    style={{
                      position: "absolute",
                      top: -4,
                      width: 8,
                      height: 8,
                      borderRadius: "var(--radius-full)",
                      background: "var(--blue-500)",
                      boxShadow: "0 0 8px var(--blue-500)",
                    }}
                  />
                )}
              </AnimatePresence>
            </div>
            <span style={{ fontSize: 10, color: "var(--text-tertiary)" }}>
              Bank B
            </span>
          </div>

          {/* Active message */}
          <AnimatePresence>
            {activeISOMessage && (
              <motion.div
                key={activeISOMessage.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                style={{
                  padding: "var(--space-2)",
                  background: "var(--bg-informative)",
                  borderRadius: "var(--radius-sm)",
                  fontSize: 10,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "var(--space-2)",
                }}
              >
                <span style={{ color: "var(--blue-500)", fontWeight: 600 }}>
                  {activeISOMessage.type}
                </span>
                <span style={{ color: "var(--text-secondary)" }}>
                  {activeISOMessage.description}
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Stacked completed message tags */}
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <AnimatePresence>
              {completedSwift.map((m) => (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3 }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "3px var(--space-2)",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--border-default)",
                    background: "var(--bg-tertiary)",
                    fontSize: 10,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                    <span style={{ color: "var(--blue-500)", fontWeight: 600 }}>{m.type}</span>
                    <span style={{ color: "var(--text-tertiary)" }}>
                      {m.fromBank === "A" ? "A → B" : "B → A"}
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: 9,
                      padding: "0 4px",
                      borderRadius: "var(--radius-full)",
                      background: "var(--bg-success)",
                      color: "var(--green-500)",
                    }}
                  >
                    processed
                  </span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </motion.div>
        </div>

        {/* Tempo Blockchain Box */}
        <div data-guide-section="tempo">
        <motion.div
          animate={{
            borderColor: tempoActive ? "var(--green-500)" : "var(--border-default)",
            boxShadow: tempoActive
              ? "0 0 24px rgba(74, 186, 106, 0.1)"
              : "none",
          }}
          transition={{ duration: 0.3 }}
          style={{
            border: "1px solid var(--border-default)",
            borderRadius: "var(--radius-md)",
            background: "var(--bg-secondary)",
            padding: "var(--space-3)",
            display: "flex",
            flexDirection: "column",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            className="label"
            style={{
              marginBottom: "var(--space-3)",
              color: tempoActive ? "var(--green-500)" : "var(--text-secondary)",
              display: "flex",
              alignItems: "center",
              gap: "var(--space-2)",
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "var(--radius-full)",
                background: tempoActive ? "var(--green-500)" : "var(--text-tertiary)",
                display: "inline-block",
              }}
            />
            Tempo Blockchain <span style={{ color: "var(--text-tertiary)", margin: "0 4px" }}>|</span> Stablecoin Transfers
          </div>

          {/* Flow line */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              width: "100%",
              padding: "0 var(--space-2)",
              marginBottom: "var(--space-3)",
            }}
          >
            <span style={{ fontSize: 10, color: "var(--text-tertiary)" }}>
              Omnibus A
            </span>
            <div
              style={{
                flex: 1,
                height: 1,
                margin: "0 var(--space-2)",
                background: tempoActive
                  ? "var(--green-500)"
                  : "var(--border-strong)",
                position: "relative",
              }}
            >
              <AnimatePresence>
                {tempoActive && (
                  <motion.div
                    key="tempo-dot"
                    initial={{
                      left: tempoFlowDirection === "a-to-b" ? "0%" : "100%",
                      opacity: 0,
                    }}
                    animate={{
                      left: tempoFlowDirection === "a-to-b" ? "100%" : "0%",
                      opacity: [0, 1, 1, 0],
                    }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    style={{
                      position: "absolute",
                      top: -4,
                      width: 8,
                      height: 8,
                      borderRadius: "var(--radius-full)",
                      background: "var(--green-500)",
                      boxShadow: "0 0 8px var(--green-500)",
                    }}
                  />
                )}
              </AnimatePresence>
            </div>
            <span style={{ fontSize: 10, color: "var(--text-tertiary)" }}>
              Omnibus B
            </span>
          </div>

          {/* Active transfer */}
          <AnimatePresence>
            {activeTempoTransfer && (
              <motion.div
                key={activeTempoTransfer.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                style={{
                  padding: "var(--space-2)",
                  background: "var(--bg-success)",
                  borderRadius: "var(--radius-sm)",
                  fontSize: 10,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "var(--space-2)",
                }}
              >
                <span style={{ color: "var(--green-500)", fontWeight: 600 }}>
                  bankUSD Transfer
                </span>
                <span style={{ color: "var(--text-secondary)" }}>
                  {activeTempoTransfer.amount.toLocaleString()} bankUSD
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Stacked completed transfer tags */}
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <AnimatePresence>
              {completedTempo.map((t) => (
                <motion.div
                  key={t.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3 }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "3px var(--space-2)",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--border-default)",
                    background: "var(--bg-tertiary)",
                    fontSize: 10,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                    <span style={{ color: "var(--green-500)", fontWeight: 600 }}>
                      {formatAmount(t.amount)} bankUSD
                    </span>
                    <span style={{ color: "var(--text-tertiary)", fontFamily: "monospace", fontSize: 9 }}>
                      {truncateHash(t.txHash)}
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: 9,
                      padding: "0 4px",
                      borderRadius: "var(--radius-full)",
                      background: "var(--bg-success)",
                      color: "var(--green-500)",
                    }}
                  >
                    processed
                  </span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </motion.div>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ state }: { state: string }) {
  const color =
    state === "idle"
      ? "var(--text-tertiary)"
      : state === "settled"
      ? "var(--green-500)"
      : "var(--blue-500)";
  const label =
    state === "idle"
      ? "IDLE"
      : state === "settled"
      ? "SETTLED"
      : "PROCESSING";

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-1)",
      }}
    >
      <div
        style={{
          width: 6,
          height: 6,
          borderRadius: "var(--radius-full)",
          background: color,
        }}
      />
      <span style={{ fontSize: 10, color, textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {label}
      </span>
    </div>
  );
}
