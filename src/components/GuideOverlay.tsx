"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSettlementStore } from "@/store/settlementStore";

interface StepConfig {
  target: string;
  additionalTargets?: string[];
  title: string;
  body: string;
  tooltip?: "below" | "right" | "left";
}

const INTRO_STEPS: StepConfig[] = [
  {
    target: '[data-guide="transactions-a"]',
    title: "Transaction Log — Bank A",
    body: "This column shows every message and onchain transfer from Bank A's perspective. Watch SWIFT messages, onramp events, and stablecoin transfers appear in real time.",
    tooltip: "right",
  },
  {
    target: '[data-guide="bank-a"]',
    title: "Bank A — Sending Bank",
    body: "Bank A's customer initiates the payment. The payment gateway & engine processes SWIFT messages, and the accounts section shows how funds flow from USD through the omnibus to bankUSD on Tempo.",
    tooltip: "right",
  },
  {
    target: '[data-guide="network"]',
    title: "Network Layer",
    body: "The SWIFT network carries ISO 20022 messages (pacs.008, pacs.002) between banks. The Tempo blockchain settles the actual stablecoin transfer. Both operate in parallel.",
    tooltip: "right",
  },
  {
    target: '[data-guide="bank-b"]',
    title: "Bank B — Receiving Bank",
    body: "Bank B receives the interbank transfer. Funds arrive as bankUSD on Tempo, then get offramped back to fiat USD and credited to the customer's account.",
    tooltip: "left",
  },
  {
    target: '[data-guide="transactions-b"]',
    title: "Transaction Log — Bank B",
    body: "Bank B's transaction log mirrors the flow from the receiving side — interbank messages, the incoming stablecoin transfer, and the offramp back to USD.",
    tooltip: "left",
  },
  {
    target: '[data-guide="initiate"]',
    title: "Ready to Go",
    body: "Click Initiate Payment to start the settlement demo. Real stablecoin transfers will execute on the Tempo Moderato blockchain.",
    tooltip: "below",
  },
];

const POST_DEMO_STEPS: StepConfig[] = [
  {
    target: '[data-guide="bank-a"] [data-guide-section="customer"]',
    title: "1. Customer Initiates Payment",
    body: "The customer submits a standard pain.001 payment instruction — the same process as any traditional bank transfer. Nothing changes for the end user.",
    tooltip: "right",
    additionalTargets: [
      '[data-guide="transactions-a"] [data-guide-tx="pain001"]',
      '[data-guide="transactions-a"] [data-guide-tx="pain002"]',
    ],
  },
  {
    target: '[data-guide="transactions-a"] [data-guide-tx="onramp"]',
    title: "2. Onramp — USD to Stablecoin",
    body: "The sending bank converts the customer's fiat USD into bankUSD stablecoins on Tempo.",
    tooltip: "right",
  },
  {
    target: '[data-guide="bank-a"] [data-guide-section="accounts"]',
    title: "3. Fund Movement Through Accounts",
    body: "Funds flow through three accounts: the customer's USD is debited, passed through the omnibus fiat reserve, and converted into bankUSD in the onchain omnibus stablecoin account.",
    tooltip: "right",
  },
  {
    target: '[data-guide="network"] [data-guide-section="swift"]',
    title: "4. SWIFT Message Sent (pacs.008)",
    body: "Bank A sends a pacs.008 message through the SWIFT network to Bank B — the standard interbank credit transfer instruction. The message includes a UETR (Unique End-to-End Transaction Reference) that links it to the onchain transfer.",
    tooltip: "right",
  },
  {
    target: '[data-guide="network"] [data-guide-section="tempo"]',
    title: "5. Stablecoin Transfer on Tempo (bankUSD)",
    body: "Simultaneously, the bankUSD stablecoin transfer settles on Tempo with the same UETR embedded as a transfer memo. This allows reconciling the SWIFT message with the onchain settlement.",
    tooltip: "right",
  },
  {
    target: '[data-guide="transactions-b"] [data-guide-tx="pacs008"]',
    title: "6. Receiving Bank Reconciles (UETR)",
    body: "Bank B receives both the SWIFT pacs.008 message and the onchain bankUSD transfer. The matching UETR allows automatic reconciliation — the bank can verify the incoming funds match the payment instruction.",
    tooltip: "left",
    additionalTargets: ['[data-guide="transactions-b"] [data-guide-tx="usdc-transfer"]'],
  },
  {
    target: '[data-guide="transactions-b"] [data-guide-tx="offramp"]',
    title: "7. Offramp — Stablecoin to Fiat",
    body: "Bank B offramps the received bankUSD back to fiat USD. The stablecoins are converted through the omnibus accounts back into traditional currency.",
    tooltip: "left",
  },
  {
    target: '[data-guide="transactions-b"] [data-guide-tx="camt054-credit"]',
    title: "8. Customer Credited",
    body: "Finally, Bank B sends a camt.054 credit notification to the beneficiary confirming the funds have arrived. The customer receives their payment — settlement is complete and fully reconciled.",
    tooltip: "left",
  },
];

const STORAGE_KEY = "bank-settlement-guide-seen";

type GuideMode = "intro" | "post-demo" | null;

interface TargetRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export function GuideOverlay() {
  const [mode, setMode] = useState<GuideMode>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);
  const rafRef = useRef<number>(0);
  const demoState = useSettlementStore((s) => s.demoState);
  const prevDemoState = useRef(demoState);

  // Show intro guide on first visit
  useEffect(() => {
    if (typeof window !== "undefined") {
      const seen = localStorage.getItem(STORAGE_KEY);
      if (!seen) {
        setMode("intro");
        setStepIndex(0);
      }
    }
  }, []);

  // Trigger post-demo walkthrough when settlement completes
  useEffect(() => {
    if (prevDemoState.current !== "settled" && demoState === "settled") {
      // Small delay to let the UI settle
      setTimeout(() => {
        setMode("post-demo");
        setStepIndex(0);
      }, 1500);
    }
    prevDemoState.current = demoState;
  }, [demoState]);

  const steps = mode === "intro" ? INTRO_STEPS : mode === "post-demo" ? POST_DEMO_STEPS : [];
  const step = steps[stepIndex] ?? null;

  const measureTarget = useCallback(() => {
    if (!step) {
      setTargetRect(null);
      return;
    }
    const el = document.querySelector(step.target);
    if (!el) {
      setTargetRect(null);
      return;
    }

    const rect = el.getBoundingClientRect();
    let combined = { top: rect.top, left: rect.left, right: rect.right, bottom: rect.bottom };

    // Expand rect to include additional targets
    if (step.additionalTargets) {
      for (const selector of step.additionalTargets) {
        const el2 = document.querySelector(selector);
        if (el2) {
          const rect2 = el2.getBoundingClientRect();
          combined.top = Math.min(combined.top, rect2.top);
          combined.left = Math.min(combined.left, rect2.left);
          combined.right = Math.max(combined.right, rect2.right);
          combined.bottom = Math.max(combined.bottom, rect2.bottom);
        }
      }
    }

    setTargetRect({
      top: combined.top,
      left: combined.left,
      width: combined.right - combined.left,
      height: combined.bottom - combined.top,
    });
  }, [step]);

  useEffect(() => {
    measureTarget();

    const handleResize = () => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(measureTarget);
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", handleResize, true);
    const interval = setInterval(measureTarget, 500);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleResize, true);
      clearInterval(interval);
      cancelAnimationFrame(rafRef.current);
    };
  }, [measureTarget]);

  const advance = useCallback(() => {
    if (stepIndex < steps.length - 1) {
      setStepIndex(stepIndex + 1);
    } else {
      setMode(null);
      setStepIndex(0);
      if (mode === "intro") {
        localStorage.setItem(STORAGE_KEY, "true");
      }
    }
  }, [stepIndex, steps.length, mode]);

  const skip = useCallback(() => {
    setMode(null);
    setStepIndex(0);
    if (mode === "intro") {
      localStorage.setItem(STORAGE_KEY, "true");
    }
  }, [mode]);

  if (!mode || !step) return null;

  const pad = 8;
  const vh = typeof window !== "undefined" ? window.innerHeight : 900;
  const vw = typeof window !== "undefined" ? window.innerWidth : 1440;

  const spot = targetRect
    ? {
        top: targetRect.top - pad,
        left: targetRect.left - pad,
        width: targetRect.width + pad * 2,
        height: targetRect.height + pad * 2,
      }
    : null;

  const tooltipWidth = 320;
  const tooltipHeight = 240;
  const tooltipStyle: React.CSSProperties = {};
  if (spot) {
    if (step.tooltip === "right") {
      tooltipStyle.left = spot.left + spot.width + 16;
      const centerY = spot.top + spot.height / 2 - tooltipHeight / 2;
      tooltipStyle.top = Math.max(16, Math.min(centerY, vh - tooltipHeight - 16));
    } else if (step.tooltip === "left") {
      tooltipStyle.left = spot.left - tooltipWidth - 16;
      const centerY = spot.top + spot.height / 2 - tooltipHeight / 2;
      tooltipStyle.top = Math.max(16, Math.min(centerY, vh - tooltipHeight - 16));
    } else {
      const spaceBelow = vh - (spot.top + spot.height);
      if (spaceBelow > tooltipHeight) {
        tooltipStyle.top = spot.top + spot.height + 12;
      } else {
        tooltipStyle.top = spot.top - tooltipHeight - 12;
      }
      tooltipStyle.left = Math.max(16, Math.min(spot.left, vw - tooltipWidth - 16));
    }
  } else {
    tooltipStyle.top = "50%";
    tooltipStyle.left = "50%";
    tooltipStyle.transform = "translate(-50%, -50%)";
  }

  const isLast = stepIndex === steps.length - 1;
  const isPostDemo = mode === "post-demo";

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={`${mode}-${stepIndex}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        style={{ position: "fixed", inset: 0, zIndex: 100, pointerEvents: "none" }}
      >
        {/* Click-catcher */}
        <div
          onClick={advance}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            cursor: "pointer",
            pointerEvents: "auto",
          }}
        />

        {/* Spotlight */}
        {spot ? (
          <div
            style={{
              position: "fixed",
              top: spot.top,
              left: spot.left,
              width: spot.width,
              height: spot.height,
              borderRadius: "var(--radius-md)",
              border: "1px solid rgba(255, 255, 255, 0.2)",
              boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.8)",
              zIndex: 101,
              pointerEvents: "none",
            }}
          />
        ) : (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0, 0, 0, 0.8)",
              zIndex: 101,
              pointerEvents: "none",
            }}
          />
        )}

        {/* Tooltip */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.1 }}
          style={{
            position: "fixed",
            ...tooltipStyle,
            width: tooltipWidth,
            background: "var(--bg-secondary)",
            border: "1px solid var(--border-strong)",
            borderRadius: "var(--radius-md)",
            padding: "var(--space-4)",
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-3)",
            zIndex: 102,
            pointerEvents: "auto",
          }}
        >
          <span
            style={{
              fontSize: 11,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              color: "var(--text-tertiary)",
            }}
          >
            {isPostDemo ? "How it works" : "Tour"} — {stepIndex + 1} / {steps.length}
          </span>

          <span
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: "var(--text-primary)",
            }}
          >
            {step.title}
          </span>

          <span
            style={{
              fontSize: 12,
              lineHeight: 1.5,
              color: "var(--text-secondary)",
            }}
          >
            {step.body}
          </span>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                skip();
              }}
              style={{
                height: 28,
                padding: "0 var(--space-3)",
                border: "none",
                background: "transparent",
                color: "var(--text-tertiary)",
                fontSize: 11,
                letterSpacing: "0.03em",
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              {isPostDemo ? "Close" : "Skip"}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                advance();
              }}
              style={{
                height: 28,
                padding: "0 var(--space-4)",
                border: `1px solid ${isLast ? "transparent" : "var(--border-strong)"}`,
                borderRadius: "var(--radius-sm)",
                background: isLast ? "var(--blue-500)" : "transparent",
                color: isLast ? "var(--text-on-color)" : "var(--text-primary)",
                fontSize: 11,
                letterSpacing: "0.03em",
                textTransform: "uppercase",
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              {isLast ? (isPostDemo ? "Done" : "Start Demo") : "Next"}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
