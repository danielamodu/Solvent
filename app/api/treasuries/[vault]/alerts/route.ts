import { NextResponse } from "next/server";
import { getAddress, isAddress } from "viem";
import { getStore } from "@/lib/server/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: { vault: string } }) {
  if (!isAddress(params.vault)) return NextResponse.json({ error: "Invalid vault address." }, { status: 400 });
  const vault = getAddress(params.vault).toLowerCase();
  const rows = getStore().prepare(`
    SELECT id, type, obligation_id AS obligationId, amount, due_at AS dueAt,
           message, created_at AS createdAt, updated_at AS updatedAt
    FROM alerts WHERE vault = ? AND resolved = 0 ORDER BY updated_at DESC
  `).all(vault);
  return NextResponse.json({ alerts: rows });
}
