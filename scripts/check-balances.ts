import { createPublicClient, http, parseAbi } from "viem";
import { tempoModerato } from "viem/chains";
import { tempoActions } from "viem/tempo";

const RPC_URL = "https://REDACTED_USER:REDACTED_PASS@rpc.moderato.tempo.xyz";
const client = createPublicClient({ chain: tempoModerato, transport: http(RPC_URL) }).extend(tempoActions());
const ABI = parseAbi([
  "function balanceOf(address) view returns (uint256)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
]);
const token = "0x20c0000000000000000000000000000000000000" as `0x${string}`;
const accounts: Record<string, `0x${string}`> = {
  mint: "0x32A61Cba4ea00C3C7e7Ca5336EEBEA63Ea656612",
  bankA: "0x8C748D9891016Cd57C1a064efc2e2FC63eCD4E1A",
  bankB: "0x3b1D60124Cba2F4b7A5c4724F7838Aa84a785Ccb",
};

async function main() {
  const symbol = await client.readContract({ address: token, abi: ABI, functionName: "symbol" });
  const decimals = await client.readContract({ address: token, abi: ABI, functionName: "decimals" });
  console.log(`Token: ${symbol}, decimals: ${decimals}`);

  for (const [name, addr] of Object.entries(accounts)) {
    const bal = await client.readContract({ address: token, abi: ABI, functionName: "balanceOf", args: [addr] });
    console.log(`${name}: ${Number(bal) / 10 ** Number(decimals)} ${symbol}`);
  }
}

main().catch(console.error);
