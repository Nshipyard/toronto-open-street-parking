"use client";

import { useEffect, useState } from "react";
import { useLang } from "@/i18n";

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

interface TopStreet {
  street: string;
  tickets_2023_2025: number;
  rules_total: number;
  bike_infra_share: number;
  permit_share: number;
}

function fmt(n: number) {
  return n.toLocaleString("en-CA");
}

function rate(j: JoinRow): { label: string; pct: number } {
  const r = j.ticket_coverage ?? j.match_rate_right ?? j.match_rate_left ?? 0;
  const label =
    j.ticket_coverage !== undefined
      ? "of ticket rows sit on streets the centreline names"
      : j.matched_right_rows !== undefined
        ? `${fmt(j.matched_right_rows)} of 50,027 segments`
        : j.matched_left_rows !== undefined
          ? `${fmt(j.matched_left_rows)} source rows matched`
          : "";
  return { label, pct: Math.round(r * 100) };
}

export default function Showcase() {
  const { t } = useLang();
  const [joins, setJoins] = useState<JoinRow[]>([]);
  const [top, setTop] = useState<TopStreet[]>([]);

  useEffect(() => {
    fetch("/api/v1/curb/joins")
      .then((r) => r.json())
      .then((d) => setJoins(d.joins))
      .catch(() => {});
    fetch("/api/v1/curb/streets?limit=10")
      .then((r) => r.json())
      .then((d) => setTop(d.streets))
      .catch(() => {});
  }, []);

  const maxTickets = top.length > 0 ? top[0].tickets_2023_2025 : 1;

  return (
    <section id="showcase" className="bg-paper-warm">
      <div className="mx-auto max-w-[1392px] px-6 py-20 md:py-28">
        <p className="text-[13px] font-semibold uppercase tracking-[0.12em] text-canada">{t.showcase.kicker}</p>
        <h2 className="display mt-4 max-w-[820px] text-[40px] md:text-[52px]">{t.showcase.title}</h2>
        <p className="mt-5 max-w-[760px] text-[18px] leading-relaxed text-ink/70">{t.showcase.body}</p>

        <div className="mt-10 space-y-4">
          {joins.map((j) => {
            const { label, pct } = rate(j);
            return (
              <div key={j.join} className="rounded-[20px] border border-line bg-paper p-6">
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <h3 className="text-[16.5px] font-semibold">{j.join}</h3>
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

        <div className="mt-16">
          <h3 className="display text-[30px] md:text-[36px]">{t.showcase.topStreets}</h3>
          <p className="mt-3 max-w-[680px] text-[16px] text-ink/70">{t.showcase.topStreetsBody}</p>
          <div className="mt-6 space-y-3">
            {top.map((s) => (
              <div key={s.street} className="grid grid-cols-[160px_1fr_auto] items-center gap-4 md:grid-cols-[220px_1fr_auto]">
                <p className="truncate text-[15px] font-medium">{s.street}</p>
                <div className="h-6 overflow-hidden rounded-lg bg-muted">
                  <div
                    className="flex h-full items-center justify-end rounded-lg bg-canada pr-2"
                    style={{ width: `${Math.max(4, (s.tickets_2023_2025 / maxTickets) * 100)}%` }}
                  />
                </div>
                <p className="w-[160px] text-right font-mono text-[13.5px] text-ink/70">
                  {fmt(s.tickets_2023_2025)} · {fmt(s.rules_total)} {t.explorer.colRules.toLowerCase()}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
