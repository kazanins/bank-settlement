"use client";

import { motion, AnimatePresence } from "framer-motion";
import type { Bank } from "@/lib/types";
import { BANK_A, BANK_B, DEMO_TRANSFER_AMOUNT, EXPLORER_URL } from "@/lib/constants";

function truncateAddress(addr: string) {
  if (addr.length <= 13) return addr;
  return addr.slice(0, 6) + "..." + addr.slice(-4);
}

function isAddress(s: string) {
  return s.startsWith("0x") && s.length > 10;
}
import { useSettlementStore } from "@/store/settlementStore";

interface BankPanelProps {
  bank: Bank;
}

function fmt(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function BankPanel({ bank }: BankPanelProps) {
  const config = bank === "A" ? BANK_A : BANK_B;
  const otherConfig = bank === "A" ? BANK_B : BANK_A;
  const step = useSettlementStore((s) => s.step);
  const demoState = useSettlementStore((s) => s.demoState);

  const customerUSD = useSettlementStore((s) =>
    bank === "A" ? s.bankACustomerUSD : s.bankBCustomerUSD
  );
  const omnibusUSD = useSettlementStore((s) =>
    bank === "A" ? s.bankAOmnibusUSD : s.bankBOmnibusUSD
  );
  const bankUSD = useSettlementStore((s) =>
    bank === "A" ? s.bankAbankUSD : s.bankBbankUSD
  );

  const isCustomerActive =
    (bank === "A" && (step === 1 || step === 3 || step === 7)) ||
    (bank === "B" && step === 9);

  const isPaymentEngineActive =
    (bank === "A" && step >= 2 && step <= 5) ||
    (bank === "B" && (step === 5 || step === 6 || step === 9));

  const isAccountsActive =
    (bank === "A" && (step === 4 || step === 5)) ||
    (bank === "B" && (step === 5 || step === 8));

  function getCustomerStatus() {
    if (bank === "A") {
      switch (step) {
        case 1:
          return { text: `Sending pain.001 — $${fmt(DEMO_TRANSFER_AMOUNT)} to ${otherConfig.customerName}`, color: "var(--orange-500)", bg: "var(--bg-warning)" };
        case 3:
          return { text: `← pain.002: Order received and accepted`, color: "var(--orange-500)", bg: "var(--bg-warning)" };
        case 7:
          return { text: `← camt.054 (Debit): Payment executed`, color: "var(--orange-500)", bg: "var(--bg-warning)" };
        default:
          return null;
      }
    }
    if (bank === "B" && step === 9) {
      return { text: `← camt.054 (Credit): $${fmt(DEMO_TRANSFER_AMOUNT)} has arrived in your account`, color: "var(--orange-500)", bg: "var(--bg-warning)" };
    }
    return null;
  }

  function getPaymentEngineStatus() {
    if (bank === "A") {
      switch (step) {
        case 2:
          return { text: "Received pain.001 — processing payment instruction", color: "var(--orange-500)" };
        case 3:
          return { text: "Generating pain.002 status report → Customer", color: "var(--orange-500)" };
        case 4:
          return { text: "Onramp — Customer USD → Omnibus → bankUSD", color: "var(--orange-500)" };
        case 5:
          return { text: "Sending pacs.008 via SWIFT → Bank B", color: "var(--blue-500)" };
        default:
          return null;
      }
    }
    if (bank === "B") {
      if (step === 5) return { text: "Receiving pacs.008 via SWIFT ← Bank A", color: "var(--blue-500)" };
      if (step === 6) return { text: "Sending pacs.002 → Bank A: Accepted, settlement in process", color: "var(--blue-500)" };
      if (step === 9) return { text: "Issuing camt.054 credit notification → Customer", color: "var(--orange-500)" };
    }
    return null;
  }

  // Build statement entries for each account
  const amt = DEMO_TRANSFER_AMOUNT;

  function getCustomerEntries(): StatementEntry[] {
    const entries: StatementEntry[] = [];
    if (bank === "A" && step >= 4) {
      entries.push({ label: "Payment to " + otherConfig.customerName, amount: -amt, step: 4 });
    }
    if (bank === "B" && step >= 8) {
      entries.push({ label: "Payment from " + otherConfig.customerName, amount: amt, step: 8 });
    }
    return entries;
  }

  function getOmnibusEntries(): StatementEntry[] {
    const entries: StatementEntry[] = [];
    if (bank === "A") {
      if (step >= 4) entries.push({ label: "Received from customer", amount: amt, step: 4 });
      if (step >= 4) entries.push({ label: "Onramp → bankUSD", amount: -amt, step: 4 });
    }
    if (bank === "B") {
      if (step >= 8) entries.push({ label: "Offramp ← bankUSD", amount: amt, step: 8 });
      if (step >= 8) entries.push({ label: "Credit to customer", amount: -amt, step: 8 });
    }
    return entries;
  }

  function getPathUSDEntries(): StatementEntry[] {
    const entries: StatementEntry[] = [];
    if (bank === "A") {
      if (step >= 4) entries.push({ label: "Onramp from USD", amount: amt, step: 4 });
      if (step >= 5) entries.push({ label: "Transfer → Bank B (Tempo)", amount: -amt, step: 5 });
    }
    if (bank === "B") {
      if (step >= 5) entries.push({ label: "Transfer ← Bank A (Tempo)", amount: amt, step: 5 });
      if (step >= 8) entries.push({ label: "Offramp to USD", amount: -amt, step: 8 });
    }
    return entries;
  }

  const customerStatus = getCustomerStatus();
  const engineStatus = getPaymentEngineStatus();

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
      {/* Bank header */}
      <div
        style={{
          padding: "var(--space-4)",
          borderBottom: "1px solid var(--border-default)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span className="label">Bank {bank}</span>
        <span style={{ fontSize: 11, color: "var(--text-primary)", fontWeight: 600 }}>
          {config.name}
        </span>
      </div>

      {/* Customer */}
      <div data-guide-section="customer">
      <motion.div
        animate={{
          borderColor: isCustomerActive
            ? (customerStatus?.color || "var(--orange-500)")
            : "var(--border-default)",
          boxShadow: isCustomerActive
            ? "inset 0 0 20px rgba(240, 165, 0, 0.05)"
            : "none",
        }}
        transition={{ duration: 0.3 }}
        style={{
          margin: "var(--space-3)",
          padding: "var(--space-3)",
          border: "1px solid var(--border-default)",
          borderRadius: "var(--radius-md)",
          background: "var(--bg-secondary)",
        }}
      >
        <div
          className="label"
          style={{
            marginBottom: "var(--space-2)",
            color: isCustomerActive
              ? (customerStatus?.color || "var(--orange-500)")
              : "var(--text-secondary)",
          }}
        >
          Customer
        </div>
        <div style={{ fontSize: 12, fontWeight: 600 }}>
          {config.customerName}
        </div>
        {customerStatus && (
          <motion.div
            key={step + "-customer-" + bank}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            style={{
              marginTop: "var(--space-2)",
              padding: "var(--space-2)",
              background: customerStatus.bg,
              borderRadius: "var(--radius-sm)",
              fontSize: 10,
              color: customerStatus.color,
            }}
          >
            {customerStatus.text}
          </motion.div>
        )}
      </motion.div>
      </div>

      {/* Payment Gateway & Engine */}
      <div data-guide-section="gateway">
      <motion.div
        animate={{
          borderColor: isPaymentEngineActive
            ? (engineStatus?.color || "var(--blue-500)")
            : "var(--border-default)",
          boxShadow: isPaymentEngineActive
            ? "inset 0 0 20px rgba(91, 154, 255, 0.05)"
            : "none",
        }}
        transition={{ duration: 0.3 }}
        style={{
          margin: "0 var(--space-3)",
          padding: "var(--space-3)",
          border: "1px solid var(--border-default)",
          borderRadius: "var(--radius-md)",
          background: "var(--bg-secondary)",
        }}
      >
        <div
          className="label"
          style={{
            marginBottom: "var(--space-2)",
            color: isPaymentEngineActive
              ? (engineStatus?.color || "var(--blue-500)")
              : "var(--text-secondary)",
          }}
        >
          Payment Gateway & Engine
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
          <div
            style={{
              width: 6,
              height: 6,
              borderRadius: "var(--radius-full)",
              background:
                demoState === "idle"
                  ? "var(--text-tertiary)"
                  : isPaymentEngineActive
                  ? (engineStatus?.color || "var(--blue-500)")
                  : demoState === "settled"
                  ? "var(--green-500)"
                  : "var(--text-tertiary)",
            }}
          />
          <span style={{ fontSize: 11 }}>
            {demoState === "idle"
              ? "Standby"
              : isPaymentEngineActive
              ? "Processing..."
              : demoState === "settled"
              ? "Settlement complete"
              : "Ready"}
          </span>
        </div>
        {engineStatus && (
          <motion.div
            key={step + "-engine-" + bank}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            style={{
              marginTop: "var(--space-2)",
              padding: "var(--space-2)",
              background: "var(--bg-informative)",
              borderRadius: "var(--radius-sm)",
              fontSize: 10,
              color: engineStatus.color,
            }}
          >
            {engineStatus.text}
          </motion.div>
        )}
      </motion.div>
      </div>

      {/* Accounts Section — Statement style */}
      <div data-guide-section="accounts">
      <motion.div
        animate={{
          borderColor: isAccountsActive
            ? "var(--text-secondary)"
            : "var(--border-default)",
          boxShadow: isAccountsActive
            ? "inset 0 0 20px rgba(255, 255, 255, 0.03)"
            : "none",
        }}
        transition={{ duration: 0.3 }}
        style={{
          margin: "var(--space-3)",
          padding: "var(--space-3)",
          border: "1px solid var(--border-default)",
          borderRadius: "var(--radius-md)",
          background: "var(--bg-secondary)",
          flex: 1,
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-3)",
          overflow: "auto",
        }}
      >
        <div
          className="label"
          style={{
            color: "var(--text-secondary)",
          }}
        >
          Accounts
        </div>

        <AccountStatement
          label="Customer Account"
          sublabel={config.customerName}
          currency="USD"
          openingBalance={config.balances.customerUSD}
          currentBalance={customerUSD}
          entries={getCustomerEntries()}
          currentStep={step}
        />

        <AccountStatement
          label="Omnibus Fiat"
          sublabel="Bank reserve"
          currency="USD"
          openingBalance={config.balances.omnibusUSD}
          currentBalance={omnibusUSD}
          entries={getOmnibusEntries()}
          currentStep={step}
        />

        <AccountStatement
          label="Omnibus Stablecoin"
          sublabel={config.omnibusAddress}
          currency="bankUSD"
          openingBalance={config.balances.bankUSD}
          currentBalance={bankUSD}
          entries={getPathUSDEntries()}
          currentStep={step}
        />
      </motion.div>
      </div>
    </div>
  );
}

interface StatementEntry {
  label: string;
  amount: number;
  step: number;
}

function AccountStatement({
  label,
  sublabel,
  currency,
  openingBalance,
  currentBalance,
  entries,
  currentStep,
}: {
  label: string;
  sublabel: string;
  currency: string;
  openingBalance: number;
  currentBalance: number;
  entries: StatementEntry[];
  currentStep: number;
}) {
  const hasEntries = entries.length > 0;

  return (
    <div
      style={{
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-sm)",
        overflow: "hidden",
      }}
    >
      {/* Account header */}
      <div
        style={{
          padding: "var(--space-2)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: hasEntries ? "1px solid var(--border-subtle)" : "none",
        }}
      >
        <div>
          <div
            style={{
              fontSize: 10,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              color: "var(--text-secondary)",
            }}
          >
            {label}
          </div>
          {isAddress(sublabel) ? (
            <a
              href={`${EXPLORER_URL}/address/${sublabel}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: 9, color: "var(--text-link)", fontFamily: "monospace", textDecoration: "none" }}
            >
              {truncateAddress(sublabel)} ↗
            </a>
          ) : (
            <div style={{ fontSize: 9, color: "var(--text-tertiary)", fontFamily: "monospace" }}>
              {sublabel}
            </div>
          )}
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 9, color: "var(--text-tertiary)", textTransform: "uppercase" }}>
            {hasEntries ? "Opening" : "Balance"}
          </div>
          <div className="value" style={{ fontSize: 11 }}>
            ${fmt(openingBalance)}
          </div>
          <div style={{ fontSize: 9, color: "var(--text-tertiary)" }}>{currency}</div>
        </div>
      </div>

      {/* Statement entries */}
      <AnimatePresence>
        {entries.map((entry, i) => (
          <motion.div
            key={entry.label + i}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            transition={{ duration: 0.3, delay: entry.step === currentStep ? 0.1 * i : 0 }}
            style={{
              padding: "3px var(--space-2)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              borderBottom: "1px solid var(--border-subtle)",
              background: entry.step === currentStep ? "rgba(255,255,255,0.02)" : "transparent",
            }}
          >
            <span style={{ fontSize: 10, color: "var(--text-secondary)" }}>
              {entry.label}
            </span>
            <span
              className="value"
              style={{
                fontSize: 10,
                color: "var(--text-primary)",
              }}
            >
              {entry.amount > 0 ? "+" : ""}{fmt(entry.amount)}
            </span>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Closing balance — show when there are entries */}
      {hasEntries && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            padding: "3px var(--space-2)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "rgba(255,255,255,0.03)",
          }}
        >
          <span
            style={{
              fontSize: 10,
              color: "var(--text-secondary)",
              fontWeight: 600,
            }}
          >
            Balance
          </span>
          <motion.span
            key={currentBalance}
            initial={{ color: "var(--text-secondary)" }}
            animate={{ color: "var(--text-primary)" }}
            transition={{ duration: 1 }}
            className="value"
            style={{ fontSize: 11, fontWeight: 600 }}
          >
            ${fmt(currentBalance)}
          </motion.span>
        </motion.div>
      )}
    </div>
  );
}
