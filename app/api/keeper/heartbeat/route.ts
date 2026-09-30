import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { getAddress, isAddress } from "viem";
import { getStore } from "@/lib/server/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(request: Request) {
  const expected = process.env.KEEPER_HEARTBEAT_TOKEN;
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!expected || expected.length < 24 || !supplied || supplied.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(supplied), Buffer.from(expected));
}

export async function POST(request: Request) {
  if (!process.env.KEEPER_HEARTBEAT_TOKEN) return NextResponse.json({ error: "Heartbeat endpoint is not configured." }, { status: 503 });
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  let body: Record<string, unknown>;
  try { body = await request.json() as Record<string, unknown>; }
  catch { return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 }); }
  if (typeof body.vault !== "string" || !isAddress(body.vault)) return NextResponse.json({ error: "Invalid vault address." }, { status: 400 });
  if (body.state !== "healthy" && body.state !== "degraded") return NextResponse.json({ error: "Invalid keeper state." }, { status: 400 });
  const vault = getAddress(body.vault).toLowerCase();
  const bounded = (value: unknown, limit: number) => typeof value === "string" ? value.slice(0, limit) : null;
  getStore().prepare(`
    INSERT INTO keeper_status(vault,last_heartbeat,state,last_action,last_tx,last_error)
    VALUES(?,?,?,?,?,?)
    ON CONFLICT(vault) DO UPDATE SET last_heartbeat=excluded.last_heartbeat,
      state=excluded.state,last_action=excluded.last_action,last_tx=excluded.last_tx,last_error=excluded.last_error
  `).run(vault, Date.now(), body.state, bounded(body.lastAction, 160), bounded(body.lastTx, 80), bounded(body.lastError, 300));
  return NextResponse.json({ ok: true });
}
