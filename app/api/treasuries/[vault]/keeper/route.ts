import { NextResponse } from "next/server";
import { getAddress, isAddress } from "viem";
import { getStore } from "@/lib/server/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: { vault: string } }) {
  if (!isAddress(params.vault)) return NextResponse.json({ error: "Invalid vault address." }, { status: 400 });
  const row = getStore().prepare(`SELECT last_heartbeat AS lastHeartbeat, state, last_action AS lastAction,
    last_tx AS lastTx, last_error AS lastError FROM keeper_status WHERE vault = ?`).get(getAddress(params.vault).toLowerCase()) as {
      lastHeartbeat: number; state: string; lastAction: string | null; lastTx: string | null; lastError: string | null;
    } | undefined;
  return NextResponse.json({ keeper: row ?? null });
}
