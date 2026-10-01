import { NextResponse } from "next/server";
import { getAddress, isAddress } from "viem";
import { getKeeperStatus } from "@/lib/server/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: { vault: string } }) {
  if (!isAddress(params.vault)) return NextResponse.json({ error: "Invalid vault address." }, { status: 400 });
  const row = await getKeeperStatus(getAddress(params.vault).toLowerCase());
  return NextResponse.json({ keeper: row ?? null });
}
