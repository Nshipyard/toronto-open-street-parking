"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLang } from "@/i18n";
import StreetMap from "@/components/StreetMap";

// Row of public/data/streets.json (built by scripts/build_segments.py):
// [street, street_norm, segments, length_km, bike_share, permit_share,
//  rules_total, tickets, green_p_max, bike_share_max, cafeto_max]
type StreetTuple = [string, string, number, number, number, number, number, number, number, number, number];

interface Street {
  street: string;
  norm: string;
  segments: number;
  lengthKm: number;
  bikeShare: number;
  permitShare: number;
  rules: number;
  tickets: number;
}

interface Seg {
  segment_id: number;
  road_class: string;
  oneway: boolean;
  length_m: number;
  addr_lo_l: number | null;
  addr_hi_l: number | null;
  addr_lo_r: number | null;
  addr_hi_r: number | null;
  bike_infra_type: string | null;
  permit_area: string | null;
  green_p_250m: number;
  bike_share_250m: number;
  cafeto_curb_lane_250m: number;
  accessible_stalls_250m: number;
  ev_chargers_250m: number;
  nearest_green_p_m: number | null;
}

interface StreetDetail {
  street: string;
  street_norm: string;
  rule_categories: Record<string, number>;
  count: number;
  segments: Seg[];
}

function fmt(n: number) {
  return n.toLocaleString("en-CA");
}

type SortKey = "street" | "segments" | "lengthKm" | "bikeShare" | "permitShare" | "rules" | "tickets";
const PAGE_SIZE = 50;
const SEG_PREVIEW = 100;

export default function StreetData() {
  const { t } = useLang();
  const [streets, setStreets] = useState<Street[]>([]);
  const [query, setQuery] = useState("");
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [selected, setSelected] = useState<Street | null>(null);
  const [detail, setDetail] = useState<StreetDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [showAllSegs, setShowAllSegs] = useState(false);
  const [filter, setFilter] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("tickets");
  const [sortDir, setSortDir] = useState<1 | -1>(-1);
  const [page, setPage] = useState(0);
  const detailRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/data/streets.json")
      .then((r) => r.json())
      .then((rows: StreetTuple[]) =>
        setStreets(
          rows.map((r) => ({
            street: r[0],
            norm: r[1],
            segments: r[2],
            lengthKm: r[3],
            bikeShare: r[4],
            permitShare: r[5],
            rules: r[6],
            tickets: r[7],
          }))
        )
      )
      .catch(() => {});
  }, []);

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2 || streets.length === 0) return [];
    if (selected && selected.street.toLowerCase() === q) return [];
    return streets
      .filter((s) => s.street.toLowerCase().includes(q) || s.norm.toLowerCase().includes(q.toLowerCase()))
      .sort((a, b) => b.tickets - a.tickets)
      .slice(0, 8);
  }, [query, streets, selected]);

  const streetsRef = useRef<Street[]>([]);
  useEffect(() => {
    streetsRef.current = streets;
  }, [streets]);

  function handleMapPick(norm: string) {
    const s = streetsRef.current.find((x) => x.norm === norm);
    if (s) selectStreet(s);
  }

  function selectStreet(s: Street, scroll = true) {
    setSelected(s);
    setQuery(s.street);
    setSuggestOpen(false);
    setShowAllSegs(false);
    setDetail(null);
    setLoadingDetail(true);
    fetch(`/api/v1/curb/streets/${encodeURIComponent(s.norm)}/segments`)
      .then((r) => r.json())
      .then((d) => setDetail(d))
      .catch(() => {})
      .finally(() => setLoadingDetail(false));
    if (scroll) {
      requestAnimationFrame(() =>
        detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
      );
    }
  }

  const tableRows = useMemo(() => {
    const f = filter.trim().toLowerCase();
    let rows = f
      ? streets.filter((s) => s.street.toLowerCase().includes(f) || s.norm.toLowerCase().includes(f))
      : [...streets];
    rows.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === "string" && typeof bv === "string")
        return sortDir * av.localeCompare(bv);
      return sortDir * ((av as number) - (bv as number));
    });
    return rows;
  }, [streets, filter, sortKey, sortDir]);

  const pageCount = Math.max(1, Math.ceil(tableRows.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const pageRows = tableRows.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  function toggleSort(k: SortKey) {
    if (k === sortKey) {
      setSortDir((d) => (d === 1 ? -1 : 1));
    } else {
      setSortKey(k);
      setSortDir(k === "street" ? 1 : -1);
    }
    setPage(0);
  }

  const th = (label: string, k: SortKey, right = true) => (
    <th className={`px-5 py-3 font-semibold ${right ? "text-right" : ""}`}>
      <button onClick={() => toggleSort(k)} className="uppercase tracking-wide hover:text-ink">
        {label}
        {sortKey === k ? (sortDir === 1 ? " ↑" : " ↓") : ""}
      </button>
    </th>
  );

  const shownSegs = detail ? (showAllSegs ? detail.segments : detail.segments.slice(0, SEG_PREVIEW)) : [];

  return (
    <section id="explorer" className="bg-paper-warm">
      <div className="mx-auto max-w-[1392px] px-6 py-20 md:py-28">
        <StreetMap selectedNorm={selected?.norm ?? null} onPick={handleMapPick} />
        <p className="text-[13px] font-semibold uppercase tracking-[0.12em] text-canada">{t.search.kicker}</p>
        <h2 className="display mt-4 max-w-[820px] text-[40px] md:text-[52px]">{t.search.title}</h2>
        <p className="mt-5 max-w-[820px] text-[18px] leading-relaxed text-ink/70">{t.search.body}</p>

        <div className="relative mt-9 max-w-[720px]">
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSuggestOpen(true);
            }}
            onFocus={() => setSuggestOpen(true)}
            placeholder={t.search.placeholder}
            className="w-full rounded-full border border-line bg-paper px-6 py-4 text-[17px] outline-none placeholder:text-ink/40 focus:border-canada"
            aria-label={t.search.placeholder}
          />
          {suggestOpen && suggestions.length > 0 && (
            <ul className="absolute inset-x-0 top-full z-20 mt-2 overflow-hidden rounded-[20px] border border-line bg-paper shadow-lg">
              {suggestions.map((s) => (
                <li key={s.norm}>
                  <button
                    onClick={() => selectStreet(s)}
                    className="flex w-full items-baseline justify-between gap-4 px-5 py-3 text-left hover:bg-paper-warm"
                  >
                    <span className="text-[16px] font-medium">{s.street}</span>
                    <span className="shrink-0 font-mono text-[13px] text-ink/60">
                      {s.lengthKm.toFixed(1)} km · {fmt(s.tickets)} {t.search.ticketsWord}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {query.trim().length >= 2 && suggestions.length === 0 && !selected && (
            <p className="mt-3 text-[15px] text-ink/60">{t.search.noMatch}</p>
          )}
        </div>

        <div ref={detailRef} className="scroll-mt-24">
          {loadingDetail && <p className="mt-10 text-[16px] text-ink/60">{t.search.loadingSegs}</p>}
          {selected && detail && (
            <div className="mt-10 rounded-[24px] border border-line bg-paper p-6 md:p-8">
              <h3 className="display text-[32px] md:text-[40px]">{detail.street}</h3>
              <div className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-[20px] border border-line bg-line md:grid-cols-3 xl:grid-cols-6">
                {[
                  { v: `${selected.lengthKm.toFixed(1)} km`, l: t.search.statLength },
                  { v: fmt(selected.tickets), l: t.search.statTickets },
                  { v: fmt(selected.rules), l: t.search.statRules },
                  {
                    v: fmt(
                      (detail.rule_categories.no_stopping ?? 0) +
                        (detail.rule_categories.no_parking ?? 0)
                    ),
                    l: t.search.statNoStopPark,
                  },
                  { v: `${Math.round(selected.bikeShare * 100)}%`, l: t.search.statBike },
                  { v: `${Math.round(selected.permitShare * 100)}%`, l: t.search.statPermit },
                ].map((st) => (
                  <div key={st.l} className="bg-paper p-5">
                    <p className="display text-[30px] text-canada">{st.v}</p>
                    <p className="mt-1 text-[13.5px] leading-snug text-ink/65">{st.l}</p>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-[14.5px] text-ink/60">
                {selected.segments === 1
                  ? t.search.sectionsNoteOne
                  : t.search.sectionsNote.replace("{n}", fmt(selected.segments))}
              </p>

              {Object.keys(detail.rule_categories).length > 0 && (
                <>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {Object.entries(detail.rule_categories)
                      .sort((a, b) => b[1] - a[1])
                      .map(([k, v]) => (
                        <span key={k} className="rounded-full border border-line px-3.5 py-1.5 text-[13.5px] text-ink/75">
                          {t.search.ruleCats[k as keyof typeof t.search.ruleCats] ?? k} · {fmt(v)} {v === 1 ? t.search.rulesWordOne : t.search.rulesWord}
                        </span>
                      ))}
                  </div>
                  <p className="mt-3 text-[13.5px] text-ink/55">{t.search.rulesNote}</p>
                </>
              )}

              <h4 className="mt-8 text-[15px] font-semibold uppercase tracking-[0.1em] text-ink/55">
                {t.search.segmentsWord} · {fmt(detail.count)}
                {!showAllSegs && detail.count > SEG_PREVIEW &&
                  ` · ${t.search.showingFirst} ${SEG_PREVIEW} ${t.search.ofWord} ${fmt(detail.count)}`}
              </h4>
              <ul className="mt-4 max-h-[560px] divide-y divide-line/70 overflow-y-auto pr-1">
                {shownSegs.map((g) => {
                  const near: string[] = [];
                  if (g.green_p_250m > 0) near.push(`${g.green_p_250m} ${t.search.gpWord}`);
                  if (g.bike_share_250m > 0) near.push(`${g.bike_share_250m} ${t.search.bsWord}`);
                  if (g.cafeto_curb_lane_250m > 0) near.push(`${g.cafeto_curb_lane_250m} ${t.search.cafetoWord}`);
                  if (g.accessible_stalls_250m > 0) near.push(`${g.accessible_stalls_250m} ${t.search.accWord}`);
                  if (g.ev_chargers_250m > 0) near.push(`${g.ev_chargers_250m} ${t.search.evWord}`);
                  const sides: string[] = [];
                  if (g.addr_lo_l !== null && g.addr_hi_l !== null) sides.push(`${g.addr_lo_l}–${g.addr_hi_l}`);
                  if (g.addr_lo_r !== null && g.addr_hi_r !== null) sides.push(`${g.addr_lo_r}–${g.addr_hi_r}`);
                  return (
                    <li key={g.segment_id} className="py-3">
                      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                        <p className="text-[15px] font-medium">
                          {g.road_class} · {Math.round(g.length_m)} m · {g.oneway ? t.search.oneway : t.search.twoway}
                          {sides.length > 0 && (
                            <span className="text-ink/60"> · {t.search.addrRange} {sides.join(" / ")}</span>
                          )}
                        </p>
                        {g.nearest_green_p_m !== null && (
                          <p className="font-mono text-[13px] text-ink/60">
                            {t.search.nearestGp} {fmt(g.nearest_green_p_m)} m
                          </p>
                        )}
                      </div>
                      {(g.bike_infra_type || g.permit_area || near.length > 0) && (
                        <p className="mt-1 text-[13.5px] text-ink/65">
                          {[
                            g.bike_infra_type,
                            g.permit_area ? `${t.search.permitWord} ${g.permit_area}` : null,
                            near.length > 0 ? `${t.search.nearWord}: ${near.join(" · ")}` : null,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
              {!showAllSegs && detail.count > SEG_PREVIEW && (
                <button
                  onClick={() => setShowAllSegs(true)}
                  className="mt-4 rounded-full border border-line px-5 py-2.5 text-[15px] font-semibold hover:border-ink"
                >
                  {t.search.showAll} {fmt(detail.count)} {t.search.segmentsWord.toLowerCase()}
                </button>
              )}
            </div>
          )}
        </div>

        <div className="mt-20">
          <h3 className="display text-[32px] md:text-[40px]">{t.search.allTitle}</h3>
          <p className="mt-3 max-w-[760px] text-[16px] leading-relaxed text-ink/70">{t.search.allBody}</p>
          <input
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value);
              setPage(0);
            }}
            placeholder={t.search.filterPlaceholder}
            className="mt-5 w-full max-w-[560px] rounded-full border border-line bg-paper px-6 py-3.5 text-[16px] outline-none placeholder:text-ink/40 focus:border-canada"
            aria-label={t.search.filterPlaceholder}
          />
          <div className="mt-5 overflow-x-auto rounded-[24px] border border-line bg-paper">
            <table className="w-full min-w-[820px] text-left text-[14.5px]">
              <thead>
                <tr className="border-b border-line bg-paper text-[13px] uppercase tracking-wide text-ink/55">
                  {th(t.search.colStreet, "street", false)}
                  {th(t.search.colLength, "lengthKm")}
                  {th(t.search.colBike, "bikeShare")}
                  {th(t.search.colPermit, "permitShare")}
                  {th(t.search.colRules, "rules")}
                  {th(t.search.colTickets, "tickets")}
                </tr>
              </thead>
              <tbody>
                {pageRows.map((s) => (
                  <tr
                    key={s.norm}
                    onClick={() => selectStreet(s)}
                    className={`cursor-pointer border-b border-line/60 last:border-0 hover:bg-paper-warm ${
                      selected?.norm === s.norm ? "bg-paper-warm" : ""
                    }`}
                  >
                    <td className="px-5 py-2.5 font-medium">{s.street}</td>
                    <td className="px-5 py-2.5 text-right font-mono">{s.lengthKm.toFixed(1)} km</td>
                    <td className="px-5 py-2.5 text-right font-mono">{Math.round(s.bikeShare * 100)}%</td>
                    <td className="px-5 py-2.5 text-right font-mono">{Math.round(s.permitShare * 100)}%</td>
                    <td className="px-5 py-2.5 text-right font-mono">{fmt(s.rules)}</td>
                    <td className="px-5 py-2.5 text-right font-mono text-canada">{fmt(s.tickets)}</td>
                  </tr>
                ))}
                {pageRows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-6 text-ink/60">
                      {t.search.noMatch}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={safePage === 0}
              className="rounded-full border border-line bg-paper px-5 py-2 text-[14.5px] font-semibold disabled:opacity-40"
            >
              {t.search.prev}
            </button>
            <p className="text-[14.5px] text-ink/65">
              {t.search.pageWord} {safePage + 1} / {fmt(pageCount)} · {fmt(tableRows.length)} {t.search.streetsWord}
            </p>
            <button
              onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
              disabled={safePage >= pageCount - 1}
              className="rounded-full border border-line bg-paper px-5 py-2 text-[14.5px] font-semibold disabled:opacity-40"
            >
              {t.search.next}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
