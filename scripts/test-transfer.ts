import { createPublicClient, createWalletClient, http, parseAbi } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { tempoModerato } from "viem/chains";
import { tempoActions } from "viem/tempo";
import { readFileSync } from "fs";

const RPC_URL = "https://REDACTED_USER:REDACTED_PASS@rpc.moderato.tempo.xyz";
const PATHUSD = "0x20c0000000000000000000000000000000000000" as `0x${string}`;
const ABI = parseAbi([
  "function balanceOf(address) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
]);

function loadEnv(): Record<string, string> {
  const lines = readFileSync(".env.local", "utf-8").split("\n");
  const env: Record<string, string> = {};
  for (const line of lines) {
    const m = line.match(/^([^=]+)=(.*)$/);
    if (m) env[m[1]] = m[2];
  }
  return env;
}

async function main() {
  const env = loadEnv();
  const transport = http(RPC_URL);
  const pub = createPublicClient({ chain: tempoModerato, transport }).extend(tempoActions());

  const bankAAccount = privateKeyToAccount(env.BANK_A_PRIVATE_KEY as `0x${string}`);
  const mintAddr = env.MINT_ADDRESS as `0x${string}`;
  const bankAWallet = createWalletClient({ account: bankAAccount, chain: tempoModerato, transport }).extend(tempoActions());

  // Check balance before
  const balBefore = await pub.readContract({ address: PATHUSD, abi: ABI, functionName: "balanceOf", args: [bankAAccount.address] });
  const mintBefore = await pub.readContract({ address: PATHUSD, abi: ABI, functionName: "balanceOf", args: [mintAddr] });
  console.log(`Bank A before: ${Number(balBefore) / 1e6}`);
  console.log(`Mint before: ${Number(mintBefore) / 1e6}`);

  // Transfer 100 pathUSD
  const amount = 100_000_000n; // 100 pathUSD
  console.log(`\nTransferring 100 pathUSD from Bank A to Mint...`);

  const hash = await bankAWallet.writeContract({
    address: PATHUSD,
    abi: ABI,
    functionName: "transfer",
    args: [mintAddr, amount],
  });
  console.log(`tx: ${hash}`);

  const receipt = await pub.waitForTransactionReceipt({ hash });
  console.log(`status: ${receipt.status}`);
  console.log(`logs: ${receipt.logs.length}`);

  // Check balance after
  const balAfter = await pub.readContract({ address: PATHUSD, abi: ABI, functionName: "balanceOf", args: [bankAAccount.address] });
  const mintAfter = await pub.readContract({ address: PATHUSD, abi: ABI, functionName: "balanceOf", args: [mintAddr] });
  console.log(`\nBank A after: ${Number(balAfter) / 1e6} (delta: ${Number(balAfter - balBefore) / 1e6})`);
  console.log(`Mint after: ${Number(mintAfter) / 1e6} (delta: ${Number(mintAfter - mintBefore) / 1e6})`);
}

main().catch(console.error);
