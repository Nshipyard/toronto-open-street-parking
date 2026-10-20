"use client";

import { useEffect, useState } from "react";
import { useLang } from "@/i18n";

interface InvRow {
  ckan_id: string;
  title: string;
  last_updated: string;
  refresh_rate: string;
  formats: string[];
  geometry: string;
  curb_attributes: string[];
  joined: string;
  join_role: string;
  notes: string;
  catalogue_url: string;
}

interface JoinRow {
  join: string;
  method: string;
  match_rate_left?: number;
  match_rate_right?: number;
  matched_right_rows?: number;
  matched_left_rows?: number;
  ticket_coverage?: number;
  notes?: string;
}

function fmt(n: number) {
  return n.toLocaleString("en-CA");
}

const ATTR_KEYS = ["who", "where", "when", "price", "blocks", "use", "enforcement"] as const;

export default function Sources() {
  const { t } = useLang();
  const [q, setQ] = useState("");
  const [attr, setAttr] = useState("");
  const [inv, setInv] = useState<InvRow[]>([]);
  const [joins, setJoins] = useState<JoinRow[]>([]);

  useEffect(() => {
    fetch("/api/v1/curb/joins")
      .then((r) => r.json())
      .then((d) => setJoins(d.joins))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (attr) params.set("attribute", attr);
    const id = window.setTimeout(() => {
      fetch(`/api/v1/curb/inventory?${params.toString()}`)
        .then((r) => r.json())
        .then((d) => setInv(d.datasets))
        .catch(() => {});
    }, 200);
    return () => window.clearTimeout(id);
  }, [q, attr]);

  function rate(j: JoinRow): { label: string; pct: number } {
    const r = j.ticket_coverage ?? j.match_rate_right ?? j.match_rate_left ?? 0;
    const label =
      j.ticket_coverage !== undefined
        ? t.sources.rateTickets
        : j.matched_right_rows !== undefined
          ? `${fmt(j.matched_right_rows)} ${t.sources.rateSegments}`
          : j.matched_left_rows !== undefined
            ? `${fmt(j.matched_left_rows)} ${t.sources.rateRows}`
            : "";
    return { label, pct: Math.round(r * 100) };
  }

  const pill = (active: boolean) =>
    `rounded-full border px-4 py-2 text-[14px] font-medium ${
      active ? "border-ink bg-ink text-white" : "border-line text-ink/70 hover:border-ink"
    }`;

  return (
    <section id="sources" className="bg-paper-warm">
      <div className="mx-auto max-w-[1392px] px-6 py-20 md:py-28">
        <p className="text-[13px] font-semibold uppercase tracking-[0.12em] text-canada">{t.sources.kicker}</p>
        <h2 className="display mt-4 max-w-[820px] text-[40px] md:text-[52px]">{t.sources.title}</h2>
        <p className="mt-5 max-w-[820px] text-[18px] leading-relaxed text-ink/70">{t.sources.body}</p>

        <h3 className="display mt-14 text-[28px] md:text-[34px]">{t.sources.matchTitle}</h3>
        <p className="mt-3 max-w-[760px] text-[16px] leading-relaxed text-ink/70">{t.sources.matchBody}</p>
        <div className="mt-8 space-y-4">
          {joins.map((j) => {
            const { label, pct } = rate(j);
            return (
              <div key={j.join} className="rounded-[20px] border border-line bg-paper p-6">
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <h4 className="text-[16.5px] font-semibold">{j.join}</h4>
                  <p className="font-mono text-[14px] text-canada">
                    {pct}% <span className="text-ink/55">{label}</span>
                  </p>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-canada" style={{ width: `${pct}%` }} />
                </div>
                <p className="mt-3 font-mono text-[13px] text-ink/60">{j.method}</p>
                {j.notes && <p className="mt-1.5 max-w-[880px] text-[14px] leading-relaxed text-ink/65">{j.notes}</p>}
              </div>
            );
          })}
        </div>

        <div className="mt-14 flex max-w-[860px] flex-col gap-4">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t.sources.search}
            className="w-full rounded-full border border-line bg-paper px-6 py-4 text-[17px] outline-none placeholder:text-ink/40 focus:border-canada"
            aria-label={t.sources.search}
          />
          <div className="flex flex-wrap gap-2">
            <button className={pill(attr === "")} onClick={() => setAttr("")}>
              {t.sources.allAttrs}
            </button>
            {ATTR_KEYS.map((k) => (
              <button key={k} className={pill(attr === k)} onClick={() => setAttr(attr === k ? "" : k)}>
                {t.sources.attrs[k]}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-8 overflow-x-auto rounded-[24px] border border-line bg-paper">
          <table className="w-full min-w-[900px] text-left text-[14.5px]">
            <thead>
              <tr className="border-b border-line bg-paper-warm text-[13px] uppercase tracking-wide text-ink/55">
                <th className="px-5 py-3 font-semibold">{t.sources.colTitle}</th>
                <th className="px-5 py-3 font-semibold">{t.sources.colUpdated}</th>
                <th className="px-5 py-3 font-semibold">{t.sources.colRefresh}</th>
                <th className="px-5 py-3 font-semibold">{t.sources.colFormats}</th>
                <th className="px-5 py-3 font-semibold">{t.sources.colGeometry}</th>
                <th className="px-5 py-3 font-semibold">{t.sources.colInFile}</th>
              </tr>
            </thead>
            <tbody>
              {inv.map((r) => (
                <tr key={r.ckan_id} className="border-b border-line/60 align-top last:border-0 hover:bg-paper-warm">
                  <td className="px-5 py-3">
                    <a href={r.catalogue_url} className="font-medium text-canada hover:underline">
                      {r.title}
                    </a>
                    <p className="mt-1 max-w-[520px] text-[13.5px] leading-snug text-ink/60">
                      {r.joined === "joined" ? r.join_role : r.notes || r.join_role}
                    </p>
                  </td>
                  <td className="px-5 py-3 font-mono text-[13px]">{r.last_updated}</td>
                  <td className="px-5 py-3 text-[13.5px]">{r.refresh_rate || "—"}</td>
                  <td className="px-5 py-3 font-mono text-[12.5px]">{r.formats.join(", ")}</td>
                  <td className="px-5 py-3 text-[13.5px]">{r.geometry}</td>
                  <td className="px-5 py-3">
                    <span
                      className={`rounded-full px-3 py-1 text-[12.5px] font-semibold ${
                        r.joined === "joined" ? "bg-canada text-white" : "border border-line text-ink/60"
                      }`}
                    >
                      {r.joined === "joined" ? t.sources.yes : t.sources.no}
                    </span>
                  </td>
                </tr>
              ))}
              {inv.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-6 text-ink/60">
                    {t.sources.noResult}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
