import { NextRequest, NextResponse } from "next/server";
import { getData } from "@/lib/curb";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const q = (sp.get("q") || "").toLowerCase();
  const attribute = sp.get("attribute") || "";
  const joined = sp.get("joined") || "";
  let rows = getData().inventory;
  if (q) {
    rows = rows.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        r.ckan_id.toLowerCase().includes(q) ||
        r.notes.toLowerCase().includes(q)
    );
  }
  if (attribute) rows = rows.filter((r) => r.curb_attributes.includes(attribute));
  if (joined) rows = rows.filter((r) => r.joined === joined);
  return NextResponse.json({ count: rows.length, datasets: rows });
}
