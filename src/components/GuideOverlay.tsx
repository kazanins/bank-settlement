"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface StepConfig {
  target: string;
  title: string;
  body: string;
  tooltip?: "below" | "right" | "left";
}

const STEPS: StepConfig[] = [
  {
    target: '[data-guide="transactions-a"]',
    title: "Transaction Log — Bank A",
    body: "This column shows every message and on-chain transfer from Bank A's perspective. Watch SWIFT messages, onramp events, and stablecoin transfers appear in real time.",
    tooltip: "right",
  },
  {
    target: '[data-guide="bank-a"]',
    title: "Bank A — Sending Bank",
    body: "Bank A's customer initiates the payment. The payment gateway & engine processes SWIFT messages, and the accounts section shows how funds flow from USD through the omnibus to USDC on Tempo.",
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
    body: "Bank B receives the interbank transfer. Funds arrive as USDC on Tempo, then get offramped back to fiat USD and credited to the customer's account.",
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

const STORAGE_KEY = "bank-settlement-guide-seen";

interface TargetRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export function GuideOverlay() {
  const [guideStep, setGuideStep] = useState<number | null>(null);
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);
  const rafRef = useRef<number>(0);

  // Show guide on first visit
  useEffect(() => {
    if (typeof window !== "undefined") {
      const seen = localStorage.getItem(STORAGE_KEY);
      if (!seen) {
        setGuideStep(0);
      }
    }
  }, []);

  const step = guideStep !== null ? STEPS[guideStep] : null;

  const measureTarget = useCallback(() => {
    if (!step) {
      setTargetRect(null);
      return;
    }
    const el = document.querySelector(step.target);
    if (el) {
      const rect = el.getBoundingClientRect();
      setTargetRect({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      });
    } else {
      setTargetRect(null);
    }
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
    if (guideStep === null) return;
    if (guideStep < STEPS.length - 1) {
      setGuideStep(guideStep + 1);
    } else {
      setGuideStep(null);
      localStorage.setItem(STORAGE_KEY, "true");
    }
  }, [guideStep]);

  const skip = useCallback(() => {
    setGuideStep(null);
    localStorage.setItem(STORAGE_KEY, "true");
  }, []);

  if (guideStep === null || !step) return null;

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

  const tooltipWidth = 300;
  const tooltipHeight = 220;
  const tooltipStyle: React.CSSProperties = {};
  if (spot) {
    if (step.tooltip === "right") {
      tooltipStyle.left = spot.left + spot.width + 16;
      // Vertically center on the spotlight, clamped to viewport
      const centerY = spot.top + spot.height / 2 - tooltipHeight / 2;
      tooltipStyle.top = Math.max(16, Math.min(centerY, vh - tooltipHeight - 16));
    } else if (step.tooltip === "left") {
      tooltipStyle.left = spot.left - tooltipWidth - 16;
      const centerY = spot.top + spot.height / 2 - tooltipHeight / 2;
      tooltipStyle.top = Math.max(16, Math.min(centerY, vh - tooltipHeight - 16));
    } else {
      // Below
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

  const isLast = guideStep === STEPS.length - 1;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={guideStep}
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
              boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.6)",
              zIndex: 101,
              pointerEvents: "none",
            }}
          />
        ) : (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0, 0, 0, 0.6)",
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
            {guideStep + 1} / {STEPS.length}
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
              Skip
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                advance();
              }}
              style={{
                height: 28,
                padding: "0 var(--space-4)",
                border: "1px solid var(--border-strong)",
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
              {isLast ? "Start Demo" : "Next"}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
