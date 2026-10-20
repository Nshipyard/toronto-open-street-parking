import { NextResponse } from "next/server";

const spec = {
  openapi: "3.1.0",
  info: {
    title: "Toronto Open Street Parking API",
    version: "1.0.0",
    description:
      "Toronto street parking data combined into one file: 50,027 centreline road segments carrying by-law rule counts, bike infrastructure, permit areas, nearby facilities, and 2023-2025 ticket counts, searchable street by street and segment by segment. Plus the source inventory and the gap report: what the City holds about street parking that it does not publish. MIT licensed.",
  },
  servers: [{ url: "https://open-street-parking.canada.nshipyard.com/api/v1" }],
  paths: {
    "/curb/summary": {
      get: {
        summary: "Headline counts: datasets inventoried and joined, segments, rules, tickets, gaps",
        responses: { "200": { description: "Summary object" } },
      },
    },
    "/curb/inventory": {
      get: {
        summary: "The street parking dataset inventory: every inventoried dataset with formats, geometry, refresh rate, street parking attributes, and join status",
        parameters: [
          { name: "q", in: "query", required: false, schema: { type: "string" }, example: "parking" },
          { name: "attribute", in: "query", required: false, schema: { type: "string", enum: ["who", "where", "when", "price", "blocks", "use", "enforcement"] }, example: "price" },
          { name: "joined", in: "query", required: false, schema: { type: "string", enum: ["joined", "not joined"] }, example: "joined" },
        ],
        responses: { "200": { description: "Dataset list" } },
      },
    },
    "/curb/streets": {
      get: {
        summary: "Street-level rollup of the combined segment dataset: segments, length, bike infrastructure share, permit coverage, rule counts, ticket counts",
        parameters: [
          { name: "q", in: "query", required: false, schema: { type: "string" }, example: "queen" },
          { name: "limit", in: "query", required: false, schema: { type: "integer" }, example: 20 },
        ],
        responses: { "200": { description: "Street list, ordered by ticket count" } },
      },
    },
    "/curb/streets/{street}/segments": {
      get: {
        summary: "Every segment of one street from the combined file, with the combined attributes on each segment: road class, one-way, length, address range, cycling infrastructure type, permit area, facility counts within 250 m, nearest Green P distance, and the street's Chapter 950 rule counts by category",
        parameters: [
          { name: "street", in: "path", required: true, schema: { type: "string" }, example: "YONGE ST" },
        ],
        responses: {
          "200": { description: "Street segments with rule_categories and rollup" },
          "404": { description: "Street not in the combined file" },
        },
      },
    },
    "/curb/joins": {
      get: {
        summary: "The join log: every join performed, with keys, rows in, rows matched, and match rates",
        responses: { "200": { description: "Join log" } },
      },
    },
    "/curb/gaps": {
      get: {
        summary: "The gap report: street parking data the City holds or uses that is not published as open data, each with the search evidence",
        responses: { "200": { description: "Gap list" } },
      },
    },
  },
};

export async function GET() {
  return NextResponse.json(spec);
}
