import { NextResponse } from "next/server";
import { Actions } from "viem/tempo";
import {
  getMintWallet,
  publicClient,
  TOKEN_ADDRESS,
  BANK_A_ADDRESS,
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

    // Mint bankUSD directly to Bank A's account
    const txHash = await Actions.token.mint(mintWallet, {
      token: TOKEN_ADDRESS,
      to: BANK_A_ADDRESS,
      amount: tokenAmount,
      memo,
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
