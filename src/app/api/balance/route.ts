import { NextResponse } from "next/server";
import {
  getTokenBalance,
  MINT_ADDRESS,
  BANK_A_ADDRESS,
  BANK_B_ADDRESS,
} from "@/lib/tempo";

export async function GET() {
  try {
    const [mint, bankA, bankB] = await Promise.all([
      getTokenBalance(MINT_ADDRESS),
      getTokenBalance(BANK_A_ADDRESS),
      getTokenBalance(BANK_B_ADDRESS),
    ]);

    return NextResponse.json({
      mint,
      bankA,
      bankB,
    });
  } catch (error) {
    console.error("Balance fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch balances" },
      { status: 500 }
    );
  }
}
