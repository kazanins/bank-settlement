import { NextResponse } from "next/server";
import { Actions } from "viem/tempo";
import {
  getBankBWallet,
  getMintWallet,
  publicClient,
  TOKEN_ADDRESS,
  MINT_ADDRESS,
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
    const bankBWallet = getBankBWallet();
    const mintWallet = getMintWallet();

    // Step 1: Bank B transfers bankUSD back to mint wallet
    const transferHash = await bankBWallet.writeContract({
      address: TOKEN_ADDRESS,
      abi: TIP20_ABI,
      functionName: "transferWithMemo",
      args: [MINT_ADDRESS, tokenAmount, memo],
      feePayer: feePayerAccount,
    });
    await publicClient.waitForTransactionReceipt({ hash: transferHash });

    // Step 2: Mint wallet burns the bankUSD
    const burnHash = await Actions.token.burn(mintWallet, {
      token: TOKEN_ADDRESS,
      amount: tokenAmount,
      memo,
    });
    const receipt = await publicClient.waitForTransactionReceipt({ hash: burnHash });
    const block = await publicClient.getBlock({ blockNumber: receipt.blockNumber });

    return NextResponse.json({
      txHash: transferHash,
      burnTxHash: burnHash,
      blockNumber: Number(receipt.blockNumber),
      timestamp: Number(block.timestamp),
      explorerUrl: `${EXPLORER_URL}/tx/${transferHash}`,
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
