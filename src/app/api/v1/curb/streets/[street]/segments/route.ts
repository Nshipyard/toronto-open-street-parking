import { NextRequest, NextResponse } from "next/server";
import { getData, getSegmentsByStreet, expandSegment } from "@/lib/curb";

// Every segment of one street from the combined file, with the attributes
// combined onto each segment. Rule counts are street-level (the by-law names
// a street, not a segment), so they are returned once as rule_categories.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ street: string }> }
) {
  const { street } = await params;
  const wanted = decodeURIComponent(street).trim().toUpperCase();
  const byNorm = getSegmentsByStreet();
  let norm = wanted;
  let entry = byNorm[norm];
  if (!entry) {
    // Fall back to a case-insensitive match on the display name.
    const hit = Object.entries(byNorm).find(
      ([, v]) => v.street.toUpperCase() === wanted
    );
    if (hit) {
      norm = hit[0];
      entry = hit[1];
    }
  }
  if (!entry) {
    return NextResponse.json(
      { error: `No street named '${street}' in the combined file` },
      { status: 404 }
    );
  }
  const rollup = getData().streets.find((s) => s.street_norm === norm);
  return NextResponse.json({
    street: entry.street,
    street_norm: norm,
    rollup: rollup ?? null,
    rule_categories: entry.rule_categories,
    count: entry.segments.length,
    segments: entry.segments.map(expandSegment),
  });
}
