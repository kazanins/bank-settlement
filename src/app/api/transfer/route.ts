import { NextResponse } from "next/server";
import {
  getBankAWallet,
  publicClient,
  PATHUSD_ADDRESS,
  BANK_B_ADDRESS,
  ERC20_ABI,
  toTokenUnits,
  EXPLORER_URL,
  feePayerAccount,
} from "@/lib/tempo";

export async function POST(request: Request) {
  try {
    const { amount } = await request.json();
    const tokenAmount = toTokenUnits(amount);
    const bankAWallet = getBankAWallet();

    const txHash = await bankAWallet.writeContract({
      address: PATHUSD_ADDRESS,
      abi: ERC20_ABI,
      functionName: "transfer",
      args: [BANK_B_ADDRESS, tokenAmount],
      feePayer: feePayerAccount,
    });

    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
    const block = await publicClient.getBlock({ blockNumber: receipt.blockNumber });

    return NextResponse.json({
      txHash,
      blockNumber: Number(receipt.blockNumber),
      timestamp: Number(block.timestamp),
      explorerUrl: `${EXPLORER_URL}/tx/${txHash}`,
      status: receipt.status,
    });
  } catch (error) {
    console.error("Transfer error:", error);
    return NextResponse.json(
      { error: "Transfer transaction failed", details: String(error) },
      { status: 500 }
    );
  }
}
