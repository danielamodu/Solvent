import { NextResponse } from "next/server";
import { getAddress, isAddress } from "viem";
import { listAlerts } from "@/lib/server/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: { vault: string } }) {
  if (!isAddress(params.vault)) return NextResponse.json({ error: "Invalid vault address." }, { status: 400 });
  const vault = getAddress(params.vault).toLowerCase();
  const rows = await listAlerts(vault);
  if (!rows) return NextResponse.json({ alerts: [] });
  return NextResponse.json({ alerts: rows });
}
