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
]);
const FEE_BUFFER = 10_000n; // 0.01 pathUSD buffer for tx fee

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
  const mintAddr = env.MINT_ADDRESS as `0x${string}`;

  for (const [label, keyName] of [["Bank A", "BANK_A_PRIVATE_KEY"], ["Bank B", "BANK_B_PRIVATE_KEY"]] as const) {
    const account = privateKeyToAccount(env[keyName] as `0x${string}`);
    const wallet = createWalletClient({ account, chain: tempoModerato, transport }).extend(tempoActions());

    const balance = await pub.readContract({
      address: PATHUSD, abi: ABI, functionName: "balanceOf", args: [account.address],
    });

    if (balance > FEE_BUFFER) {
      const sendAmount = balance - FEE_BUFFER;
      console.log(`${label}: ${Number(balance) / 1e6} pathUSD → sending ${Number(sendAmount) / 1e6} to mint...`);
      const hash = await wallet.writeContract({
        address: PATHUSD, abi: ABI, functionName: "transfer", args: [mintAddr, sendAmount],
      });
      await pub.waitForTransactionReceipt({ hash });
      console.log(`  Done. tx: ${hash}`);
    } else {
      console.log(`${label}: ${Number(balance) / 1e6} pathUSD (too low to drain)`);
    }
  }

  console.log("\nFinal balances:");
  for (const [label, addr] of [["Mint", mintAddr], ["Bank A", env.BANK_A_ADDRESS], ["Bank B", env.BANK_B_ADDRESS]]) {
    const bal = await pub.readContract({ address: PATHUSD, abi: ABI, functionName: "balanceOf", args: [addr as `0x${string}`] });
    console.log(`  ${label}: ${Number(bal) / 1e6} pathUSD`);
  }
}

main().catch(console.error);
