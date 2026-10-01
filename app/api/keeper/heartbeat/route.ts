import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { getAddress, isAddress } from "viem";
import { saveHeartbeat } from "@/lib/server/db";

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
  const ok = await saveHeartbeat({
    vault,
    state: body.state,
    lastAction: bounded(body.lastAction, 160),
    lastTx: bounded(body.lastTx, 80),
    lastError: bounded(body.lastError, 300),
  });
  if (!ok) return NextResponse.json({ error: "Storage offline." }, { status: 503 });
  return NextResponse.json({ ok: true });
}
