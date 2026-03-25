import { NextResponse } from "next/server";
import {
  getMintWallet,
  publicClient,
  PATHUSD_ADDRESS,
  BANK_A_ADDRESS,
  ERC20_ABI,
  toTokenUnits,
  uetrToBytes32,
  EXPLORER_URL,
} from "@/lib/tempo";

export async function POST(request: Request) {
  try {
    const { amount, uetr } = await request.json();
    const tokenAmount = toTokenUnits(amount);
    const memo = uetrToBytes32(uetr);

    const mintWallet = getMintWallet();

    const txHash = await mintWallet.writeContract({
      address: PATHUSD_ADDRESS,
      abi: ERC20_ABI,
      functionName: "transferWithMemo",
      args: [BANK_A_ADDRESS, tokenAmount, memo],
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
    console.error("Onramp error:", error);
    return NextResponse.json(
      { error: "Onramp transaction failed", details: String(error) },
      { status: 500 }
    );
  }
}
