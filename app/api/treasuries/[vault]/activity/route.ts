import { NextResponse } from "next/server";
import { getAddress, isAddress } from "viem";
import { getStore } from "@/lib/server/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: { vault: string } }) {
  if (!isAddress(params.vault)) return NextResponse.json({ error: "Invalid vault address." }, { status: 400 });
  const vault = getAddress(params.vault).toLowerCase();
  const rows = getStore().prepare(`
    SELECT id, block_number AS blockNumber, timestamp, event_type AS eventType,
           amount, detail, transaction_hash AS transactionHash
    FROM activity WHERE vault = ? ORDER BY block_number DESC, log_index DESC LIMIT 50
  `).all(vault);
  return NextResponse.json({ activity: rows });
}
