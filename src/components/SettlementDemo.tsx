"use client";

import { useEffect } from "react";
import { useSettlementStore } from "@/store/settlementStore";
import TransactionList from "./TransactionList";
import BankPanel from "./BankPanel";
import CenterPanel from "./CenterPanel";
import { GuideOverlay } from "./GuideOverlay";

export default function SettlementDemo() {
  const transactions = useSettlementStore((s) => s.transactions);
  const step = useSettlementStore((s) => s.step);
  const demoState = useSettlementStore((s) => s.demoState);
  const initiatePayment = useSettlementStore((s) => s.initiatePayment);
  const reset = useSettlementStore((s) => s.reset);
  const fetchBalances = useSettlementStore((s) => s.fetchBalances);
  const txPending = useSettlementStore((s) => s.txPending);
  const speed = useSettlementStore((s) => s.speed);
  const setSpeed = useSettlementStore((s) => s.setSpeed);

  // Fetch on-chain balances on mount
  useEffect(() => {
    fetchBalances();
  }, [fetchBalances]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        background: "var(--bg-primary)",
      }}
    >
      {/* Header */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "var(--space-3) var(--space-4)",
          borderBottom: "1px solid var(--border-default)",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
          <svg width="24" height="24" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M17.6429 28.1631H13.1933L17.3173 15.4122H12.043L13.1933 11.6748H27.8878L26.7374 15.4122H21.7452L17.6429 28.1631Z" fill="white"/>
          </svg>
          <span
            style={{
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              color: "var(--text-secondary)",
            }}
          >
            Bank Settlement Demo
          </span>
          <span
            style={{
              fontSize: 10,
              color: "var(--text-tertiary)",
              borderLeft: "1px solid var(--border-default)",
              paddingLeft: "var(--space-3)",
            }}
          >
            SWIFT + Tempo
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)" }}>
          {/* Speed selector */}
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-1)" }}>
            <span style={{ fontSize: 10, color: "var(--text-tertiary)", marginRight: "var(--space-1)" }}>
              Speed
            </span>
            {[0.1, 0.5, 1.0, 2.0].map((s) => (
              <button
                key={s}
                onClick={() => setSpeed(s)}
                style={{
                  height: 22,
                  width: 36,
                  padding: 0,
                  border: `1px solid ${speed === s ? "var(--text-secondary)" : "var(--border-default)"}`,
                  borderRadius: "var(--radius-sm)",
                  background: speed === s ? "rgba(255,255,255,0.08)" : "transparent",
                  color: speed === s ? "var(--text-primary)" : "var(--text-tertiary)",
                  fontSize: 10,
                  fontFamily: "inherit",
                  cursor: "pointer",
                }}
              >
                {s}x
              </button>
            ))}
          </div>

          {/* Controls */}
          <div style={{ display: "flex", gap: "var(--space-2)" }}>
            <button
              data-guide="initiate"
              onClick={initiatePayment}
              disabled={demoState !== "idle"}
              style={{
                height: 28,
                padding: "0 var(--space-4)",
                border: `1px solid ${demoState === "idle" ? "var(--blue-500)" : "var(--border-default)"}`,
                borderRadius: "var(--radius-md)",
                background: "transparent",
                color: demoState === "idle" ? "var(--blue-500)" : "var(--text-tertiary)",
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: "0.03em",
                cursor: demoState === "idle" ? "pointer" : "not-allowed",
                opacity: demoState === "idle" ? 1 : 0.3,
                fontFamily: "inherit",
              }}
            >
              Initiate Payment
            </button>
            <button
              onClick={reset}
              disabled={demoState === "idle"}
              style={{
                height: 28,
                padding: "0 var(--space-3)",
                border: `1px solid ${demoState !== "idle" ? "var(--text-tertiary)" : "var(--border-default)"}`,
                borderRadius: "var(--radius-md)",
                background: "transparent",
                color: demoState !== "idle" ? "var(--text-secondary)" : "var(--text-tertiary)",
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: "0.03em",
                cursor: demoState !== "idle" ? "pointer" : "not-allowed",
                opacity: demoState !== "idle" ? 1 : 0.3,
                fontFamily: "inherit",
              }}
            >
              Reset
            </button>
          </div>
        </div>
      </header>

      {/* Main 5-column grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1.2fr 1.4fr 1.2fr 1fr",
          flex: 1,
          overflow: "hidden",
        }}
      >
        {/* Column 1: Transactions Bank A */}
        <div data-guide="transactions-a" style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <TransactionList bank="A" transactions={transactions} />
        </div>

        {/* Column 2: Bank A */}
        <div data-guide="bank-a" style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <BankPanel bank="A" />
        </div>

        {/* Column 3: SWIFT + Tempo */}
        <div data-guide="network" style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <CenterPanel />
        </div>

        {/* Column 4: Bank B */}
        <div data-guide="bank-b" style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <BankPanel bank="B" />
        </div>

        {/* Column 5: Transactions Bank B */}
        <div data-guide="transactions-b" style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <TransactionList bank="B" transactions={transactions} />
        </div>
      </div>

      <GuideOverlay />
    </div>
  );
}
