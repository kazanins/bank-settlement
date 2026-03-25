import { NextResponse } from "next/server";
import {
  getBankBWallet,
  publicClient,
  PATHUSD_ADDRESS,
  MINT_ADDRESS,
  ERC20_ABI,
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
    const bankBWallet = getBankBWallet();

    const txHash = await bankBWallet.writeContract({
      address: PATHUSD_ADDRESS,
      abi: ERC20_ABI,
      functionName: "transferWithMemo",
      args: [MINT_ADDRESS, tokenAmount, memo],
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
    console.error("Offramp error:", error);
    return NextResponse.json(
      { error: "Offramp transaction failed", details: String(error) },
      { status: 500 }
    );
  }
}
