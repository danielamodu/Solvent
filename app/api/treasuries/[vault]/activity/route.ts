import { NextResponse } from "next/server";
import { getAddress, isAddress } from "viem";
import { listActivity } from "@/lib/server/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: { vault: string } }) {
  if (!isAddress(params.vault)) return NextResponse.json({ error: "Invalid vault address." }, { status: 400 });
  const vault = getAddress(params.vault).toLowerCase();
  const rows = await listActivity(vault);
  if (!rows) return NextResponse.json({ activity: [] });
  return NextResponse.json({ activity: rows });
}
