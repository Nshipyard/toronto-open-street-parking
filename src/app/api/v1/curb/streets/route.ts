import { NextRequest, NextResponse } from "next/server";
import { getData } from "@/lib/curb";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const q = (sp.get("q") || "").toLowerCase();
  const limit = Math.min(200, Math.max(1, Number(sp.get("limit")) || 50));
  let rows = getData().streets;
  if (q) rows = rows.filter((r) => r.street_norm.toLowerCase().includes(q));
  return NextResponse.json({ count: rows.length, streets: rows.slice(0, limit) });
}
