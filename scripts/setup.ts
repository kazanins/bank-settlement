import { createPublicClient, http } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { tempoModerato } from "viem/chains";
import { tempoActions } from "viem/tempo";
import { writeFileSync, readFileSync, existsSync } from "fs";

const RPC_USERNAME = "REDACTED_USER";
const RPC_PASSWORD = "REDACTED_PASS";
const RPC_URL = `https://${RPC_USERNAME}:${RPC_PASSWORD}@rpc.moderato.tempo.xyz`;
const RPC_URL_PLAIN = "https://rpc.moderato.tempo.xyz";
const BASIC_AUTH = Buffer.from(`${RPC_USERNAME}:${RPC_PASSWORD}`).toString("base64");
const PATHUSD = "0x20c0000000000000000000000000000000000000";

function loadEnv(): Record<string, string> {
  if (!existsSync(".env.local")) return {};
  const lines = readFileSync(".env.local", "utf-8").split("\n");
  const env: Record<string, string> = {};
  for (const line of lines) {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) env[match[1]] = match[2];
  }
  return env;
}

function writeEnv(vars: Record<string, string>) {
  const content = Object.entries(vars)
    .map(([k, v]) => `${k}=${v}`)
    .join("\n") + "\n";
  writeFileSync(".env.local", content);
}

async function fundAddress(address: string) {
  const response = await fetch(RPC_URL_PLAIN, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${BASIC_AUTH}`,
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "tempo_fundAddress",
      params: [address],
      id: 1,
    }),
  });
  const result = await response.json();
  if (result.error) {
    throw new Error(`Failed to fund ${address}: ${JSON.stringify(result.error)}`);
  }
}

async function waitForBalance(address: `0x${string}`, label: string, maxAttempts = 15) {
  const client = createPublicClient({
    chain: tempoModerato,
    transport: http(RPC_URL),
  }).extend(tempoActions());

  for (let i = 0; i < maxAttempts; i++) {
    const balance = await client.getBalance({ address });
    if (balance > 0n) return balance;
    console.log(`  Waiting for ${label} balance... (attempt ${i + 1}/${maxAttempts})`);
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error(`${label} (${address}) still has 0 balance after ${maxAttempts} attempts`);
}

async function main() {
  const existing = loadEnv();
  const forceReset = process.argv[2] === "reset";
  const hasKeys = existing.MINT_PRIVATE_KEY && existing.BANK_A_PRIVATE_KEY && existing.BANK_B_PRIVATE_KEY;

  let mintKey: `0x${string}`;
  let bankAKey: `0x${string}`;
  let bankBKey: `0x${string}`;

  if (hasKeys && !forceReset) {
    console.log("Step 1: Reusing existing keys from .env.local");
    mintKey = existing.MINT_PRIVATE_KEY as `0x${string}`;
    bankAKey = existing.BANK_A_PRIVATE_KEY as `0x${string}`;
    bankBKey = existing.BANK_B_PRIVATE_KEY as `0x${string}`;
  } else {
    console.log("Step 1: Generating 3 new private keys...");
    mintKey = generatePrivateKey();
    bankAKey = generatePrivateKey();
    bankBKey = generatePrivateKey();
  }

  const mintAccount = privateKeyToAccount(mintKey);
  const bankAAccount = privateKeyToAccount(bankAKey);
  const bankBAccount = privateKeyToAccount(bankBKey);

  console.log(`  Mint:   ${mintAccount.address}`);
  console.log(`  Bank A: ${bankAAccount.address}`);
  console.log(`  Bank B: ${bankBAccount.address}`);

  // Only fund the mint account (it pays fees for everyone via fee payer)
  // Bank A and B don't need funding — they start with 0 pathUSD
  if (!hasKeys || forceReset) {
    console.log("\nStep 2: Funding mint account only via tempo_fundAddress...");
    console.log(`  Funding Mint (${mintAccount.address})...`);
    await fundAddress(mintAccount.address);
    console.log("  Mint funded.");
    console.log("  Verifying balance...");
    await waitForBalance(mintAccount.address, "Mint");
    console.log("  Balance confirmed.");
    console.log("  Bank A and Bank B: unfunded (0 pathUSD, fees paid by mint)");
  } else {
    console.log("\nStep 2: Skipping funding — keys already exist.");
  }

  // Write .env.local
  console.log("\nStep 3: Writing .env.local...");
  writeEnv({
    RPC_USERNAME,
    RPC_PASSWORD,
    MINT_PRIVATE_KEY: mintKey,
    BANK_A_PRIVATE_KEY: bankAKey,
    BANK_B_PRIVATE_KEY: bankBKey,
    MINT_ADDRESS: mintAccount.address,
    BANK_A_ADDRESS: bankAAccount.address,
    BANK_B_ADDRESS: bankBAccount.address,
    PATHUSD_ADDRESS: PATHUSD,
    NEXT_PUBLIC_MINT_ADDRESS: mintAccount.address,
    NEXT_PUBLIC_BANK_A_ADDRESS: bankAAccount.address,
    NEXT_PUBLIC_BANK_B_ADDRESS: bankBAccount.address,
    NEXT_PUBLIC_EXPLORER_URL: "https://explore.moderato.tempo.xyz",
  });

  console.log("\n✓ Setup complete!");
  console.log(`  Mint:      ${mintAccount.address} (funded)`);
  console.log(`  Bank A:    ${bankAAccount.address} (unfunded)`);
  console.log(`  Bank B:    ${bankBAccount.address} (unfunded)`);
  console.log(`  pathUSD:   ${PATHUSD}`);
  console.log("\n  Restart dev server to pick up new env vars.");
}

main().catch((err) => {
  console.error("Setup failed:", err);
  process.exit(1);
});
