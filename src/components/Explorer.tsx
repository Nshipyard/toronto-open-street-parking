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

interface StreetRow {
  street: string;
  segments: number;
  length_km: number;
  bike_infra_share: number;
  permit_share: number;
  rules_total: number;
  tickets_2023_2025: number;
}

function fmt(n: number) {
  return n.toLocaleString("en-CA");
}

const ATTR_KEYS = ["who", "where", "when", "price", "blocks", "use", "enforcement"] as const;

export default function Explorer() {
  const { t } = useLang();
  const [q, setQ] = useState("");
  const [attr, setAttr] = useState("");
  const [joinFilter, setJoinFilter] = useState("");
  const [inv, setInv] = useState<InvRow[]>([]);
  const [sq, setSq] = useState("");
  const [streets, setStreets] = useState<StreetRow[]>([]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (attr) params.set("attribute", attr);
    if (joinFilter) params.set("joined", joinFilter);
    const id = window.setTimeout(() => {
      fetch(`/api/v1/curb/inventory?${params.toString()}`)
        .then((r) => r.json())
        .then((d) => setInv(d.datasets))
        .catch(() => {});
    }, 200);
    return () => window.clearTimeout(id);
  }, [q, attr, joinFilter]);

  useEffect(() => {
    fetch("/api/v1/curb/inventory")
      .then((r) => r.json())
      .then((d) => setInv(d.datasets))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => {
      if (sq.trim().length < 2) {
        setStreets([]);
        return;
      }
      fetch(`/api/v1/curb/streets?q=${encodeURIComponent(sq.trim())}&limit=12`)
        .then((r) => r.json())
        .then((d) => setStreets(d.streets))
        .catch(() => {});
    }, 250);
    return () => window.clearTimeout(id);
  }, [sq]);

  const searched = sq.trim().length >= 2;
  const pill = (active: boolean) =>
    `rounded-full border px-4 py-2 text-[14px] font-medium ${
      active ? "border-ink bg-ink text-white" : "border-line text-ink/70 hover:border-ink"
    }`;

  return (
    <section id="explorer" className="bg-paper">
      <div className="mx-auto max-w-[1392px] px-6 py-20 md:py-28">
        <p className="text-[13px] font-semibold uppercase tracking-[0.12em] text-canada">{t.explorer.kicker}</p>
        <h2 className="display mt-4 max-w-[820px] text-[40px] md:text-[52px]">{t.explorer.title}</h2>
        <p className="mt-5 max-w-[760px] text-[18px] leading-relaxed text-ink/70">{t.explorer.body}</p>

        <div className="mt-8 flex max-w-[860px] flex-col gap-4">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t.explorer.search}
            className="w-full rounded-full border border-line bg-paper px-6 py-4 text-[17px] outline-none placeholder:text-ink/40 focus:border-canada"
            aria-label={t.explorer.search}
          />
          <div className="flex flex-wrap gap-2">
            <button className={pill(attr === "")} onClick={() => setAttr("")}>
              {t.explorer.allAttrs}
            </button>
            {ATTR_KEYS.map((k) => (
              <button key={k} className={pill(attr === k)} onClick={() => setAttr(attr === k ? "" : k)}>
                {t.explorer.attrs[k]}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <button className={pill(joinFilter === "")} onClick={() => setJoinFilter("")}>
              {t.explorer.allJoin}
            </button>
            <button className={pill(joinFilter === "joined")} onClick={() => setJoinFilter("joined")}>
              {t.explorer.joinedOnly}
            </button>
            <button className={pill(joinFilter === "not joined")} onClick={() => setJoinFilter("not joined")}>
              {t.explorer.notJoinedOnly}
            </button>
          </div>
        </div>

        <div className="mt-8 overflow-x-auto rounded-[24px] border border-line">
          <table className="w-full min-w-[900px] text-left text-[14.5px]">
            <thead>
              <tr className="border-b border-line bg-paper-warm text-[13px] uppercase tracking-wide text-ink/55">
                <th className="px-5 py-3 font-semibold">{t.explorer.colTitle}</th>
                <th className="px-5 py-3 font-semibold">{t.explorer.colUpdated}</th>
                <th className="px-5 py-3 font-semibold">{t.explorer.colRefresh}</th>
                <th className="px-5 py-3 font-semibold">{t.explorer.colFormats}</th>
                <th className="px-5 py-3 font-semibold">{t.explorer.colGeometry}</th>
                <th className="px-5 py-3 font-semibold">{t.explorer.colStatus}</th>
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
                      {r.joined === "joined" ? t.explorer.joinedWord : t.explorer.notJoinedWord}
                    </span>
                  </td>
                </tr>
              ))}
              {inv.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-6 text-ink/60">
                    {t.explorer.noResult}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-16">
          <h3 className="display text-[30px] md:text-[36px]">{t.explorer.streetTitle}</h3>
          <p className="mt-3 max-w-[680px] text-[16px] text-ink/70">{t.explorer.streetBody}</p>
          <input
            value={sq}
            onChange={(e) => setSq(e.target.value)}
            placeholder={t.explorer.streetSearch}
            className="mt-5 w-full max-w-[560px] rounded-full border border-line bg-paper px-6 py-3.5 text-[16px] outline-none placeholder:text-ink/40 focus:border-canada"
            aria-label={t.explorer.streetSearch}
          />
          {searched && (
            <div className="mt-5 overflow-x-auto rounded-[24px] border border-line">
              <table className="w-full min-w-[760px] text-left text-[14.5px]">
                <thead>
                  <tr className="border-b border-line bg-paper-warm text-[13px] uppercase tracking-wide text-ink/55">
                    <th className="px-5 py-3 font-semibold">{t.explorer.colStreet}</th>
                    <th className="px-5 py-3 text-right font-semibold">{t.explorer.colSegments}</th>
                    <th className="px-5 py-3 text-right font-semibold">{t.explorer.colLength}</th>
                    <th className="px-5 py-3 text-right font-semibold">{t.explorer.colBike}</th>
                    <th className="px-5 py-3 text-right font-semibold">{t.explorer.colPermit}</th>
                    <th className="px-5 py-3 text-right font-semibold">{t.explorer.colRules}</th>
                    <th className="px-5 py-3 text-right font-semibold">{t.explorer.colTickets}</th>
                  </tr>
                </thead>
                <tbody>
                  {streets.map((s) => (
                    <tr key={s.street} className="border-b border-line/60 last:border-0 hover:bg-paper-warm">
                      <td className="px-5 py-2.5 font-medium">{s.street}</td>
                      <td className="px-5 py-2.5 text-right font-mono">{fmt(s.segments)}</td>
                      <td className="px-5 py-2.5 text-right font-mono">{s.length_km.toFixed(1)} km</td>
                      <td className="px-5 py-2.5 text-right font-mono">{Math.round(s.bike_infra_share * 100)}%</td>
                      <td className="px-5 py-2.5 text-right font-mono">{Math.round(s.permit_share * 100)}%</td>
                      <td className="px-5 py-2.5 text-right font-mono">{fmt(s.rules_total)}</td>
                      <td className="px-5 py-2.5 text-right font-mono text-canada">{fmt(s.tickets_2023_2025)}</td>
                    </tr>
                  ))}
                  {streets.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-5 py-6 text-ink/60">
                        {t.explorer.noResult}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
