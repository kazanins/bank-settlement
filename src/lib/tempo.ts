import {
  createPublicClient,
  createWalletClient,
  http,
  parseAbi,
  type Address,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { tempoModerato } from "viem/chains";
import { tempoActions } from "viem/tempo";

// RPC
const RPC_USERNAME = process.env.RPC_USERNAME ?? "REDACTED_USER";
const RPC_PASSWORD = process.env.RPC_PASSWORD ?? "REDACTED_PASS";
export const RPC_URL = `https://${RPC_USERNAME}:${RPC_PASSWORD}@rpc.moderato.tempo.xyz`;

// pathUSD token address on Moderato
export const PATHUSD_ADDRESS = process.env.PATHUSD_ADDRESS as Address;

// Account addresses
export const MINT_ADDRESS = process.env.MINT_ADDRESS as Address;
export const BANK_A_ADDRESS = process.env.BANK_A_ADDRESS as Address;
export const BANK_B_ADDRESS = process.env.BANK_B_ADDRESS as Address;

// Explorer
export const EXPLORER_URL = "https://explore.moderato.tempo.xyz";

// Token decimals (TIP-20 uses 6)
export const TOKEN_DECIMALS = 6;

// ERC20/TIP-20 ABI subset
export const ERC20_ABI = parseAbi([
  "function balanceOf(address owner) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
]);

// Fee payer account (mint account pays fees for all transactions)
const feePayerAccount = privateKeyToAccount(process.env.MINT_PRIVATE_KEY as `0x${string}`);

// Default transport
const defaultTransport = http(RPC_URL);

// Public client (reads)
export const publicClient = createPublicClient({
  chain: tempoModerato,
  transport: defaultTransport,
}).extend(tempoActions());

// Wallet client factory
function createWallet(privateKey: `0x${string}`) {
  const account = privateKeyToAccount(privateKey);
  return createWalletClient({
    account,
    chain: tempoModerato,
    transport: defaultTransport,
  }).extend(tempoActions());
}

// Export fee payer account for use in writeContract calls
export { feePayerAccount };

export function getMintWallet() {
  return createWallet(process.env.MINT_PRIVATE_KEY as `0x${string}`);
}

export function getBankAWallet() {
  return createWallet(process.env.BANK_A_PRIVATE_KEY as `0x${string}`);
}

export function getBankBWallet() {
  return createWallet(process.env.BANK_B_PRIVATE_KEY as `0x${string}`);
}

// Helper: get pathUSD balance for an address (returns human-readable number)
export async function getPathUSDBalance(address: Address): Promise<number> {
  const raw = await publicClient.readContract({
    address: PATHUSD_ADDRESS,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [address],
  });
  return Number(raw) / 10 ** TOKEN_DECIMALS;
}

// Helper: convert dollar amount to token units
export function toTokenUnits(amount: number): bigint {
  return BigInt(Math.round(amount * 10 ** TOKEN_DECIMALS));
}
