"use client";

import { useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Transaction } from "@/lib/types";
import { EXPLORER_URL } from "@/lib/constants";

const explorerUrl = EXPLORER_URL;

interface TransactionListProps {
  bank: "A" | "B";
  transactions: Transaction[];
}

function truncateHash(hash: string) {
  return hash.slice(0, 8) + "..." + hash.slice(-4);
}

function formatAmount(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

// Yellow = SWIFT messages, Green = mint/burn/transfer
const typeColors: Record<string, string> = {
  "pain.001": "var(--orange-500)",
  "pain.002": "var(--orange-500)",
  "camt.054": "var(--orange-500)",
  "pacs.008": "var(--blue-500)",
  "pacs.002": "var(--blue-500)",
};

function getMessageLabel(type: string, variant?: string) {
  if (type === "camt.054" && variant) {
    return `camt.054 (${variant})`;
  }
  return type;
}

export default function TransactionList({ bank, transactions }: TransactionListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const filtered = transactions.filter((tx) => {
    if (tx.type === "iso" && tx.iso) {
      return tx.iso.fromBank === bank || tx.iso.toBank === bank;
    }
    if (tx.type === "tempo" && tx.tempo) {
      return true;
    }
    if (tx.type === "ledger" && tx.ledger) {
      return tx.ledger.bank === bank;
    }
    return false;
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [filtered.length]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        borderRight: bank === "A" ? "1px solid var(--border-default)" : "none",
        borderLeft: bank === "B" ? "1px solid var(--border-default)" : "none",
      }}
    >
      <div
        style={{
          padding: "var(--space-4)",
          borderBottom: "1px solid var(--border-default)",
        }}
      >
        <span className="label">
          Transactions — Bank {bank}
        </span>
      </div>

      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflow: "auto",
          padding: "var(--space-2)",
        }}
      >
        <AnimatePresence>
          {filtered.length === 0 && (
            <div
              style={{
                padding: "var(--space-8) var(--space-4)",
                textAlign: "center",
                color: "var(--text-tertiary)",
                fontSize: 11,
              }}
            >
              No transactions yet
            </div>
          )}
          {filtered.map((tx) => {
            // Tag transactions for guide targeting
            const guideTag =
              (tx.type === "iso" && tx.iso?.type === "pain.001") ? "pain001" :
              (tx.type === "iso" && tx.iso?.type === "pain.002") ? "pain002" :
              (tx.type === "iso" && tx.iso?.type === "pacs.008") ? "pacs008" :
              (tx.type === "iso" && tx.iso?.type === "camt.054" && tx.iso?.variant === "credit") ? "camt054-credit" :
              (tx.type === "tempo") ? "usdc-transfer" :
              (tx.type === "ledger" && tx.ledger?.action === "onramp") ? "onramp" :
              (tx.type === "ledger" && tx.ledger?.action === "offramp") ? "offramp" :
              undefined;
            return (
            <motion.div
              key={tx.id}
              data-guide-tx={guideTag}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              style={{
                padding: "var(--space-3)",
                borderBottom: "1px solid var(--border-subtle)",
                animation: "flash-entry 0.8s ease-out forwards",
              }}
            >
              {tx.type === "iso" && tx.iso && (
                <>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 4,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: typeColors[tx.iso.type] || "var(--text-primary)",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                      }}
                    >
                      {getMessageLabel(tx.iso.type, tx.iso.variant)}
                    </span>
                    <span
                      style={{
                        fontSize: 10,
                        color: "var(--text-tertiary)",
                      }}
                    >
                      {formatTime(tx.timestamp)}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-secondary)", marginBottom: 2 }}>
                    {tx.iso.description}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span className="value" style={{ color: "var(--text-primary)" }}>
                      ${formatAmount(tx.iso.amount)}
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      color: "var(--text-tertiary)",
                      marginTop: 2,
                    }}
                  >
                    {tx.iso.from} → {tx.iso.to}
                  </div>
                </>
              )}
              {tx.type === "tempo" && tx.tempo && (
                <>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 4,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: "var(--green-500)",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                      }}
                    >
                      USDC Transfer
                    </span>
                    <span
                      style={{
                        fontSize: 10,
                        color: "var(--text-tertiary)",
                      }}
                    >
                      {formatTime(tx.timestamp)}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-secondary)", marginBottom: 2 }}>
                    Stablecoin settlement
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span className="value" style={{ color: "var(--text-primary)" }}>
                      {formatAmount(tx.tempo.amount)} {tx.tempo.token}
                    </span>
                  </div>
                  {tx.tempo.txHash && tx.tempo.txHash !== "0x..." && (
                  <a
                    href={`${explorerUrl}/tx/${tx.tempo.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontSize: 10,
                      color: "var(--text-link)",
                      marginTop: 2,
                      fontFamily: "monospace",
                      textDecoration: "none",
                      display: "block",
                    }}
                  >
                    tx: {truncateHash(tx.tempo.txHash)} ↗
                  </a>
                  )}
                  {(!tx.tempo.txHash || tx.tempo.txHash === "0x...") && (
                  <div
                    style={{
                      fontSize: 10,
                      color: "var(--text-tertiary)",
                      marginTop: 2,
                      fontFamily: "monospace",
                    }}
                  >
                    tx: pending...
                  </div>
                  )}
                  <div
                    style={{
                      fontSize: 10,
                      color: "var(--text-tertiary)",
                    }}
                  >
                    block #{tx.tempo.blockNumber.toLocaleString()}
                  </div>
                </>
              )}
              {tx.type === "ledger" && tx.ledger && (
                <>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 4,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: "var(--green-500)",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                      }}
                    >
                      {tx.ledger.action}
                    </span>
                    <span
                      style={{
                        fontSize: 10,
                        color: "var(--text-tertiary)",
                      }}
                    >
                      {formatTime(tx.timestamp)}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-secondary)", marginBottom: 2 }}>
                    {tx.ledger.description}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span className="value" style={{ color: "var(--text-primary)" }}>
                      ${formatAmount(tx.ledger.amount)}
                    </span>
                    <span
                      style={{
                        fontSize: 10,
                        color: "var(--text-tertiary)",
                      }}
                    >
                      {tx.ledger.fromToken} → {tx.ledger.toToken}
                    </span>
                  </div>
                  {tx.ledger.txHash && (
                    <a
                      href={`${explorerUrl}/tx/${tx.ledger.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        fontSize: 10,
                        color: "var(--text-link)",
                        marginTop: 2,
                        fontFamily: "monospace",
                        textDecoration: "none",
                        display: "block",
                      }}
                    >
                      tx: {truncateHash(tx.ledger.txHash)} ↗
                    </a>
                  )}
                </>
              )}
            </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
