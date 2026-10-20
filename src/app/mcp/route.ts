import { NextResponse } from "next/server";
import { getData } from "@/lib/curb";

// Minimal MCP server over streamable HTTP (JSON-RPC 2.0 via POST).
// Supports: initialize, tools/list, tools/call. Stateless.

const SERVER = { name: "toronto-open-street-parking", version: "1.0.0" };

const TOOLS = [
  {
    name: "curb_summary",
    description:
      "Headline numbers for Toronto Open Street Parking: how many street parking datasets were inventoried and joined, how many street segments the joined dataset holds, how many current by-law street parking rules exist, ticket coverage, and how many gaps are documented.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "curb_inventory_search",
    description:
      "Search the inventory of Toronto open datasets that describe street parking. Filter by text, by street parking attribute (who, where, when, price, blocks, use, enforcement), or by join status (joined, not joined).",
    inputSchema: {
      type: "object",
      properties: {
        q: { type: "string", description: "Search titles and notes, e.g. 'snow'" },
        attribute: { type: "string", description: "One of: who, where, when, price, blocks, use, enforcement" },
        joined: { type: "string", description: "'joined' or 'not joined'" },
        limit: { type: "number", description: "Max rows (default 20)" },
      },
    },
  },
  {
    name: "curb_street_profile",
    description:
      "The joined street parking profile for one Toronto street: segment count, length, bike infrastructure share, permit parking coverage, by-law rule count, and 2023-2025 parking ticket count. Pass a street name fragment, e.g. 'Queen St W'.",
    inputSchema: {
      type: "object",
      properties: { street: { type: "string", description: "Street name fragment, e.g. 'queen'" } },
      required: ["street"],
    },
  },
  {
    name: "curb_gaps",
    description:
      "The gap report: street parking data that is missing, text-only, stale, or partial in Toronto open data, each with the search evidence behind the claim.",
    inputSchema: { type: "object", properties: {} },
  },
];

function ok(id: unknown, result: unknown) {
  return { jsonrpc: "2.0", id, result };
}
function err(id: unknown, code: number, message: string) {
  return { jsonrpc: "2.0", id, error: { code, message } };
}
function textResult(data: unknown) {
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
}

function handle(msg: any) {
  if (!msg || msg.jsonrpc !== "2.0" || typeof msg.method !== "string") {
    return err(msg?.id ?? null, -32600, "Invalid Request");
  }
  const id = msg.id ?? null;
  switch (msg.method) {
    case "initialize":
      return ok(id, {
        protocolVersion: "2024-11-05",
        capabilities: { tools: {} },
        serverInfo: SERVER,
      });
    case "notifications/initialized":
      return null;
    case "tools/list":
      return ok(id, { tools: TOOLS });
    case "tools/call": {
      const { name, arguments: args } = msg.params ?? {};
      try {
        const d = getData();
        if (name === "curb_summary") {
          return ok(id, textResult(d.summary));
        }
        if (name === "curb_gaps") {
          return ok(id, textResult({ count: d.gaps.length, gaps: d.gaps }));
        }
        if (name === "curb_inventory_search") {
          let rows = d.inventory;
          if (args.q) {
            const q = String(args.q).toLowerCase();
            rows = rows.filter(
              (r) =>
                r.title.toLowerCase().includes(q) ||
                r.ckan_id.toLowerCase().includes(q) ||
                r.notes.toLowerCase().includes(q)
            );
          }
          if (args.attribute) rows = rows.filter((r) => r.curb_attributes.includes(String(args.attribute)));
          if (args.joined) rows = rows.filter((r) => r.joined === String(args.joined));
          const limit = Math.min(100, Math.max(1, Number(args.limit) || 20));
          return ok(id, textResult({ count: rows.length, datasets: rows.slice(0, limit) }));
        }
        if (name === "curb_street_profile") {
          const q = String(args.street || "").toLowerCase();
          const rows = d.streets.filter((r) => r.street_norm.toLowerCase().includes(q));
          if (!rows.length) return err(id, -32001, `No street matching '${args.street}'`);
          return ok(id, textResult({ count: rows.length, streets: rows.slice(0, 10) }));
        }
        return err(id, -32602, `Unknown tool ${name}`);
      } catch (e) {
        return err(id, -32000, `Tool error: ${(e as Error).message}`);
      }
    }
    default:
      return err(id, -32601, `Method not found: ${msg.method}`);
  }
}

export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(err(null, -32700, "Parse error"), { status: 400 });
  }
  if (Array.isArray(body)) {
    const out = body.map(handle).filter((r) => r !== null);
    return NextResponse.json(out);
  }
  const out = handle(body);
  if (out === null) return new NextResponse(null, { status: 202 });
  return NextResponse.json(out);
}

export async function GET() {
  return NextResponse.json(
    { error: "This MCP server accepts JSON-RPC 2.0 via POST only." },
    { status: 405 }
  );
}

export async function DELETE() {
  return new NextResponse(null, { status: 405 });
}
