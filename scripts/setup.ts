import { createPublicClient, createWalletClient, http } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { tempoModerato } from "viem/chains";
import { tempoActions, Actions } from "viem/tempo";
import { writeFileSync, readFileSync, existsSync } from "fs";

const RPC_USERNAME = "REDACTED_USER";
const RPC_PASSWORD = "REDACTED_PASS";
const RPC_URL = `https://${RPC_USERNAME}:${RPC_PASSWORD}@rpc.moderato.tempo.xyz`;
const RPC_URL_PLAIN = "https://rpc.moderato.tempo.xyz";
const BASIC_AUTH = Buffer.from(`${RPC_USERNAME}:${RPC_PASSWORD}`).toString("base64");

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

  // Only fund the mint account
  if (!hasKeys || forceReset) {
    console.log("\nStep 2: Funding mint account via tempo_fundAddress...");
    console.log(`  Funding Mint (${mintAccount.address})...`);
    await fundAddress(mintAccount.address);
    console.log("  Mint funded.");
    console.log("  Verifying balance...");
    await waitForBalance(mintAccount.address, "Mint");
    console.log("  Balance confirmed.");
  } else {
    console.log("\nStep 2: Skipping funding — keys already exist.");
  }

  // Create bankUSD token via TIP-20 factory
  let tokenAddress = existing.TOKEN_ADDRESS as `0x${string}` | undefined;

  if (!tokenAddress || forceReset) {
    console.log("\nStep 3: Creating bankUSD token via TIP-20 factory...");

    const mintWallet = createWalletClient({
      account: mintAccount,
      chain: tempoModerato,
      transport: http(RPC_URL),
    }).extend(tempoActions());

    const pub = createPublicClient({
      chain: tempoModerato,
      transport: http(RPC_URL),
    }).extend(tempoActions());

    const txHash = await Actions.token.create(mintWallet, {
      name: "bankUSD",
      symbol: "bankUSD",
      currency: "USD",
    });
    console.log(`  Create tx: ${txHash}`);

    const receipt = await pub.waitForTransactionReceipt({ hash: txHash });
    console.log(`  Status: ${receipt.status}`);

    // Extract token address from TokenCreated event
    // The factory emits TokenCreated(address token, ...)
    // Look for the created token address in the logs
    for (const log of receipt.logs) {
      // TokenCreated event topic
      if (log.topics.length > 0) {
        // The token address is typically in the first indexed parameter
        const potentialAddr = log.address;
        // Or check if it's from the factory
        if (log.address.toLowerCase() === "0x20fc000000000000000000000000000000000000") {
          // Token address is in the first topic after the event signature
          if (log.topics[1]) {
            tokenAddress = ("0x" + log.topics[1].slice(26)) as `0x${string}`;
            console.log(`  bankUSD token created at: ${tokenAddress}`);
            break;
          }
        }
      }
    }

    if (!tokenAddress) {
      console.log("  Could not extract from logs, checking via getTokenAddress...");
      console.log("  Receipt logs:", JSON.stringify(receipt.logs, null, 2));
      throw new Error("Could not determine bankUSD token address from transaction logs");
    }

    // Grant issuer role to mint wallet (needed for mint and burn)
    console.log("  Granting issuer role to mint wallet...");
    const grantTx = await Actions.token.grantRoles(mintWallet, {
      token: tokenAddress,
      to: mintAccount.address,
      roles: ["issuer"],
    });
    await pub.waitForTransactionReceipt({ hash: grantTx });
    console.log("  Issuer role granted.");
  } else {
    console.log(`\nStep 3: Using existing bankUSD token: ${tokenAddress}`);
  }

  // Write .env.local
  console.log("\nStep 4: Writing .env.local...");
  writeEnv({
    RPC_USERNAME,
    RPC_PASSWORD,
    MINT_PRIVATE_KEY: mintKey,
    BANK_A_PRIVATE_KEY: bankAKey,
    BANK_B_PRIVATE_KEY: bankBKey,
    MINT_ADDRESS: mintAccount.address,
    BANK_A_ADDRESS: bankAAccount.address,
    BANK_B_ADDRESS: bankBAccount.address,
    TOKEN_ADDRESS: tokenAddress!,
    NEXT_PUBLIC_MINT_ADDRESS: mintAccount.address,
    NEXT_PUBLIC_BANK_A_ADDRESS: bankAAccount.address,
    NEXT_PUBLIC_BANK_B_ADDRESS: bankBAccount.address,
    NEXT_PUBLIC_EXPLORER_URL: "https://explore.moderato.tempo.xyz",
  });

  console.log("\n✓ Setup complete!");
  console.log(`  Mint:      ${mintAccount.address} (funded, token admin)`);
  console.log(`  Bank A:    ${bankAAccount.address} (unfunded)`);
  console.log(`  Bank B:    ${bankBAccount.address} (unfunded)`);
  console.log(`  bankUSD:   ${tokenAddress}`);
  console.log("\n  Restart dev server to pick up new env vars.");
}

main().catch((err) => {
  console.error("Setup failed:", err);
  process.exit(1);
});
