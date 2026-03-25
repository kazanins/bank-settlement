export const BANK_A = {
  name: "Deutsche Handelsbank",
  bank: "A" as const,
  customerName: "Müller GmbH",
  omnibusAddress: process.env.NEXT_PUBLIC_BANK_A_ADDRESS || "0x7a3B...9f21",
  balances: {
    customerUSD: 500_000,
    omnibusUSD: 1_000_000,
    USDC: 0, // real balance fetched from chain
  },
};

export const BANK_B = {
  name: "Pacific Commerce Bank",
  bank: "B" as const,
  customerName: "Sakura Trading Co.",
  omnibusAddress: process.env.NEXT_PUBLIC_BANK_B_ADDRESS || "0x3e8A...c4d7",
  balances: {
    customerUSD: 300_000,
    omnibusUSD: 1_000_000,
    USDC: 0, // real balance fetched from chain
  },
};

export const DEMO_TRANSFER_AMOUNT = 150_000;
export const DEMO_CURRENCY = "USD";
export const DEMO_TOKEN = "USDC";

export const EXPLORER_URL = process.env.NEXT_PUBLIC_EXPLORER_URL || "https://explore.moderato.tempo.xyz";
