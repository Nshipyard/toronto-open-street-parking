import { NextResponse } from "next/server";
import { getData } from "@/lib/curb";

export async function GET() {
  const d = getData();
  return NextResponse.json({ count: d.gaps.length, gaps: d.gaps });
}
