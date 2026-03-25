import { NextResponse } from "next/server";
import {
  getBankAWallet,
  publicClient,
  TOKEN_ADDRESS,
  BANK_B_ADDRESS,
  TIP20_ABI,
  toTokenUnits,
  uetrToBytes32,
  EXPLORER_URL,
  feePayerAccount,
} from "@/lib/tempo";

export async function POST(request: Request) {
  try {
    const { amount, uetr } = await request.json();
    const tokenAmount = toTokenUnits(amount);
    const memo = uetrToBytes32(uetr);
    const bankAWallet = getBankAWallet();

    const txHash = await bankAWallet.writeContract({
      address: TOKEN_ADDRESS,
      abi: TIP20_ABI,
      functionName: "transferWithMemo",
      args: [BANK_B_ADDRESS, tokenAmount, memo],
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
