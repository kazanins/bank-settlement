import { create } from "zustand";
import { generateUETR, formatUETR } from "@/lib/uetr";
import type {
  DemoState,
  ISOMessage,
  TempoTransfer,
  Transaction,
} from "@/lib/types";
import {
  BANK_A,
  BANK_B,
  DEMO_TRANSFER_AMOUNT,
  DEMO_CURRENCY,
  DEMO_TOKEN,
} from "@/lib/constants";

interface SettlementStore {
  demoState: DemoState;
  step: number;

  // Fiat balances (simulated)
  bankACustomerUSD: number;
  bankAOmnibusUSD: number;
  bankBCustomerUSD: number;
  bankBOmnibusUSD: number;

  // On-chain USDC balances (real from Tempo)
  bankAUSDC: number;
  bankBUSDC: number;

  isoMessages: ISOMessage[];
  tempoTransfers: TempoTransfer[];
  transactions: Transaction[];

  activeISOMessage: ISOMessage | null;
  activeTempoTransfer: TempoTransfer | null;
  swiftFlowDirection: "a-to-b" | "b-to-a" | null;
  tempoFlowDirection: "a-to-b" | "b-to-a" | null;

  // Loading state for blockchain txs
  txPending: boolean;

  // UETR linking SWIFT messages to onchain transfers
  uetr: string;
  uetrFormatted: string;

  // Speed multiplier (1.0 = normal, lower = slower, higher = faster)
  speed: number;
  setSpeed: (speed: number) => void;

  initiatePayment: () => void;
  advanceStep: () => Promise<void>;
  fetchBalances: () => Promise<void>;
  reset: () => void;
}

let stepTimer: ReturnType<typeof setTimeout> | null = null;

function generateId() {
  return Math.random().toString(36).substring(2, 10);
}

const EXPLORER_URL = process.env.NEXT_PUBLIC_EXPLORER_URL || "https://explore.moderato.tempo.xyz";

export const useSettlementStore = create<SettlementStore>((set, get) => ({
  demoState: "idle",
  step: 0,

  bankACustomerUSD: BANK_A.balances.customerUSD,
  bankAOmnibusUSD: BANK_A.balances.omnibusUSD,
  bankBCustomerUSD: BANK_B.balances.customerUSD,
  bankBOmnibusUSD: BANK_B.balances.omnibusUSD,

  bankAUSDC: 0,
  bankBUSDC: 0,

  isoMessages: [],
  tempoTransfers: [],
  transactions: [],

  activeISOMessage: null,
  activeTempoTransfer: null,
  swiftFlowDirection: null,
  tempoFlowDirection: null,

  txPending: false,

  uetr: "",
  uetrFormatted: "",

  speed: 1.0,
  setSpeed: (speed: number) => set({ speed }),

  fetchBalances: async () => {
    try {
      const res = await fetch("/api/balance");
      if (res.ok) {
        const data = await res.json();
        set({
          bankAUSDC: data.bankA,
          bankBUSDC: data.bankB,
        });
      }
    } catch (e) {
      console.error("Failed to fetch balances:", e);
    }
  },

  initiatePayment: () => {
    const state = get();
    if (state.demoState !== "idle") return;

    // Fetch initial balances and generate UETR for this payment
    get().fetchBalances();
    const uetr = generateUETR();

    set({ demoState: "initiating", step: 1, uetr, uetrFormatted: formatUETR(uetr) });

    const advance = async () => {
      const current = get();
      if (current.step < 10 && !current.txPending) {
        const stepBefore = current.step;
        await get().advanceStep();
        const nextCurrent = get();
        // TX steps (4, 5, 8) handle their own scheduling via scheduleNext
        const wasTxStep = [4, 5, 8].includes(stepBefore + 1);
        if (!wasTxStep && !nextCurrent.txPending && nextCurrent.step < 10) {
          const baseDelay = nextCurrent.step <= 3 ? 3500 : 4000;
          stepTimer = setTimeout(advance, baseDelay / nextCurrent.speed);
        }
      }
    };
    stepTimer = setTimeout(advance, 3500 / state.speed);
  },

  advanceStep: async () => {
    const state = get();
    const nextStep = state.step + 1;
    const now = Date.now();
    const amount = DEMO_TRANSFER_AMOUNT;

    const scheduleNext = (baseDelay: number = 4000) => {
      const advance = async () => {
        const current = get();
        if (current.step < 10 && !current.txPending) {
          const stepBefore = current.step;
          await get().advanceStep();
          const nextCurrent = get();
          const wasTxStep = [4, 5, 8].includes(stepBefore + 1);
          if (!wasTxStep && !nextCurrent.txPending && nextCurrent.step < 10) {
            stepTimer = setTimeout(advance, 4000 / nextCurrent.speed);
          }
        }
      };
      stepTimer = setTimeout(advance, baseDelay / get().speed);
    };

    switch (nextStep) {
      // Step 2: pain.001
      case 2: {
        const pain001: ISOMessage = {
          id: generateId(),
          type: "pain.001",
          from: BANK_A.customerName,
          to: BANK_A.name,
          fromBank: "A",
          toBank: "A",
          amount,
          currency: DEMO_CURRENCY,
          reference: "CUST/2024/INV-4471",
          timestamp: now,
          status: "confirmed",
          description: "Payment initiation",
        };
        set({
          step: nextStep,
          demoState: "initiating",
          isoMessages: [...state.isoMessages, pain001],
          transactions: [
            ...state.transactions,
            { id: pain001.id, type: "iso", iso: pain001, timestamp: now },
          ],
        });
        break;
      }

      // Step 3: pain.002
      case 3: {
        const pain002: ISOMessage = {
          id: generateId(),
          type: "pain.002",
          from: BANK_A.name,
          to: BANK_A.customerName,
          fromBank: "A",
          toBank: "A",
          amount,
          currency: DEMO_CURRENCY,
          reference: "ACK/" + generateId().toUpperCase(),
          timestamp: now,
          status: "confirmed",
          description: "Payment status report",
        };
        set({
          step: nextStep,
          demoState: "processing",
          isoMessages: [...state.isoMessages, pain002],
          transactions: [
            ...state.transactions,
            { id: pain002.id, type: "iso", iso: pain002, timestamp: now },
          ],
        });
        break;
      }

      // Step 4: Onramp — REAL TX: mint account → Bank A omnibus
      case 4: {
        set({
          step: nextStep,
          demoState: "processing",
          txPending: true,
          bankACustomerUSD: state.bankACustomerUSD - amount,
        });

        // Execute real onchain transaction and wait for completion
        try {
          const res = await fetch("/api/onramp", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ amount, uetr: state.uetr }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error);

          await get().fetchBalances();

          // Add ledger event with txHash after tx is confirmed
          const currentState = get();
          set({
            txPending: false,
            transactions: [
              ...currentState.transactions,
              {
                id: generateId(),
                type: "ledger",
                ledger: {
                  id: generateId(),
                  action: "onramp",
                  bank: "A",
                  amount,
                  fromToken: "USD",
                  toToken: "USDC",
                  description: "Onramp — USD → USDC",
                  txHash: data.txHash,
                },
                timestamp: Date.now(),
              },
            ],
          });
          scheduleNext(4000);
        } catch (e) {
          console.error("Onramp failed:", e);
          set({ txPending: false });
          scheduleNext(4000);
        }
        break;
      }

      // Step 5: pacs.008 + REAL TX: Bank A → Bank B on Tempo
      case 5: {
        const pacs008: ISOMessage = {
          id: generateId(),
          type: "pacs.008",
          from: BANK_A.name,
          to: BANK_B.name,
          fromBank: "A",
          toBank: "B",
          amount,
          currency: DEMO_CURRENCY,
          reference: "UETR/" + state.uetrFormatted,
          timestamp: now,
          status: "in-transit",
          description: "FI to FI customer credit transfer",
        };

        // Create placeholder transfer (will be updated with real tx data)
        const transferId = generateId();
        const placeholderTransfer: TempoTransfer = {
          id: transferId,
          from: process.env.NEXT_PUBLIC_BANK_A_ADDRESS || BANK_A.omnibusAddress,
          to: process.env.NEXT_PUBLIC_BANK_B_ADDRESS || BANK_B.omnibusAddress,
          amount,
          token: DEMO_TOKEN,
          txHash: "0x...",
          blockNumber: 0,
          timestamp: now,
          status: "in-transit",
        };

        set({
          step: nextStep,
          demoState: "transferring",
          txPending: true,
          isoMessages: [...state.isoMessages, pacs008],
          tempoTransfers: [...state.tempoTransfers, placeholderTransfer],
          transactions: [
            ...state.transactions,
            { id: pacs008.id, type: "iso", iso: pacs008, timestamp: now },
            { id: transferId, type: "tempo", tempo: placeholderTransfer, timestamp: now + 1 },
          ],
          activeISOMessage: pacs008,
          activeTempoTransfer: placeholderTransfer,
          swiftFlowDirection: "a-to-b",
          tempoFlowDirection: "a-to-b",
        });

        // Execute real onchain transfer
        try {
          const res = await fetch("/api/transfer", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ amount, uetr: state.uetr }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error);

          // Update transfer with real tx data
          const realTransfer: TempoTransfer = {
            ...placeholderTransfer,
            txHash: data.txHash,
            blockNumber: data.blockNumber,
            timestamp: data.timestamp * 1000,
            status: "confirmed",
          };

          const currentState = get();
          set({
            txPending: false,
            tempoTransfers: currentState.tempoTransfers.map((t) =>
              t.id === transferId ? realTransfer : t
            ),
            transactions: currentState.transactions.map((tx) =>
              tx.id === transferId
                ? { ...tx, tempo: realTransfer }
                : tx
            ),
          });

          await get().fetchBalances();
          scheduleNext(4000);
        } catch (e) {
          console.error("Transfer failed:", e);
          set({ txPending: false });
          scheduleNext(4000);
        }
        break;
      }

      // Step 6: pacs.002
      case 6: {
        const pacs002: ISOMessage = {
          id: generateId(),
          type: "pacs.002",
          from: BANK_B.name,
          to: BANK_A.name,
          fromBank: "B",
          toBank: "A",
          amount,
          currency: DEMO_CURRENCY,
          reference: "UETR/" + state.uetrFormatted,
          timestamp: now,
          status: "confirmed",
          description: "Accepted, settlement in process",
        };
        set({
          step: nextStep,
          demoState: "confirming",
          isoMessages: [...state.isoMessages, pacs002],
          transactions: [
            ...state.transactions.map((tx) =>
              tx.type === "tempo" && tx.tempo
                ? { ...tx, tempo: { ...tx.tempo, status: "confirmed" as const } }
                : tx
            ),
            { id: pacs002.id, type: "iso", iso: pacs002, timestamp: now },
          ],
          tempoTransfers: state.tempoTransfers.map((t) => ({ ...t, status: "confirmed" as const })),
          activeISOMessage: pacs002,
          activeTempoTransfer: null,
          swiftFlowDirection: "b-to-a",
          tempoFlowDirection: null,
        });
        break;
      }

      // Step 7: camt.054 (Debit) — Bank A
      case 7: {
        const camt054Debit: ISOMessage = {
          id: generateId(),
          type: "camt.054",
          variant: "debit",
          from: BANK_A.name,
          to: BANK_A.customerName,
          fromBank: "A",
          toBank: "A",
          amount,
          currency: DEMO_CURRENCY,
          reference: "DN/" + generateId().toUpperCase(),
          timestamp: now,
          status: "confirmed",
          description: "Debit notification",
        };
        set({
          step: nextStep,
          demoState: "confirming",
          isoMessages: [...state.isoMessages, camt054Debit],
          transactions: [
            ...state.transactions,
            { id: camt054Debit.id, type: "iso", iso: camt054Debit, timestamp: now },
          ],
          activeISOMessage: null,
          swiftFlowDirection: null,
        });
        break;
      }

      // Step 8: Offramp — REAL TX: Bank B omnibus → mint account
      case 8: {
        set({
          step: nextStep,
          demoState: "confirming",
          txPending: true,
          activeISOMessage: null,
          swiftFlowDirection: null,
        });

        // Execute real onchain transaction and wait for completion
        try {
          const res = await fetch("/api/offramp", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ amount, uetr: state.uetr }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error);

          await get().fetchBalances();

          // Add ledger event with txHash after tx is confirmed
          const currentState = get();
          set({
            txPending: false,
            transactions: [
              ...currentState.transactions,
              {
                id: generateId(),
                type: "ledger",
                ledger: {
                  id: generateId(),
                  action: "offramp",
                  bank: "B",
                  amount,
                  fromToken: "USDC",
                  toToken: "USD",
                  description: "Offramp — USDC → USD",
                  txHash: data.txHash,
                },
                timestamp: Date.now(),
              },
            ],
          });
          scheduleNext(4000);
        } catch (e) {
          console.error("Offramp failed:", e);
          set({ txPending: false });
          scheduleNext(4000);
        }
        break;
      }

      // Step 9: camt.054 (Credit) — Bank B
      case 9: {
        const camt054Credit: ISOMessage = {
          id: generateId(),
          type: "camt.054",
          variant: "credit",
          from: BANK_B.name,
          to: BANK_B.customerName,
          fromBank: "B",
          toBank: "B",
          amount,
          currency: DEMO_CURRENCY,
          reference: "CN/" + generateId().toUpperCase(),
          timestamp: now,
          status: "confirmed",
          description: "Credit notification",
        };
        set({
          step: nextStep,
          demoState: "confirming",
          isoMessages: [...state.isoMessages, camt054Credit],
          transactions: [
            ...state.transactions,
            { id: camt054Credit.id, type: "iso", iso: camt054Credit, timestamp: now },
          ],
          bankBCustomerUSD: state.bankBCustomerUSD + amount,
        });
        break;
      }

      // Step 10: Settlement complete
      case 10: {
        set({
          step: nextStep,
          demoState: "settled",
          isoMessages: state.isoMessages.map((m) => ({
            ...m,
            status: "settled" as const,
          })),
          tempoTransfers: state.tempoTransfers.map((t) => ({
            ...t,
            status: "settled" as const,
          })),
          activeISOMessage: null,
          activeTempoTransfer: null,
          swiftFlowDirection: null,
          tempoFlowDirection: null,
        });
        // Final balance refresh
        get().fetchBalances();
        break;
      }
    }
  },

  reset: () => {
    if (stepTimer) {
      clearTimeout(stepTimer);
      stepTimer = null;
    }
    set({
      demoState: "idle",
      step: 0,
      bankACustomerUSD: BANK_A.balances.customerUSD,
      bankAOmnibusUSD: BANK_A.balances.omnibusUSD,
      bankBCustomerUSD: BANK_B.balances.customerUSD,
      bankBOmnibusUSD: BANK_B.balances.omnibusUSD,
      bankAUSDC: 0,
      bankBUSDC: 0,
      isoMessages: [],
      tempoTransfers: [],
      transactions: [],
      activeISOMessage: null,
      activeTempoTransfer: null,
      swiftFlowDirection: null,
      tempoFlowDirection: null,
      txPending: false,
      uetr: "",
      uetrFormatted: "",
    });
    // Fetch fresh balances after reset
    setTimeout(() => get().fetchBalances(), 100);
  },
}));
