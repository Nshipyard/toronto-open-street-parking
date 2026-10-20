"use client";

import { useLang } from "@/i18n";
import McpConnect from "./McpConnect";

const endpoints = [
  {
    method: "GET",
    path: "/api/v1/curb/summary",
    desc: "Headline counts: datasets, segments, rules, tickets, gaps",
    response: `{
  "datasets_inventoried": 34,
  "segments": 50027,
  "bylaw_rules_current": 27768,
  "ticket_rows": 6454694,
  "gaps_documented": 8
}`,
  },
  {
    method: "GET",
    path: "/api/v1/curb/inventory?attribute=price",
    desc: "Datasets that answer what street parking costs",
    response: `{ "count": 3, "datasets": [
  { "title": "Green P Parking", … },
  { "title": "Parking Occupancy", … },
  { "title": "Parking Lot Facilities", … } ] }`,
  },
  {
    method: "GET",
    path: "/api/v1/curb/streets?q=queen&limit=5",
    desc: "The combined street parking profile of streets matching a name",
    response: `{ "count": 6, "streets": [
  { "street": "Queen St W", "segments": 74,
    "bike_infra_share": 0.046, "permit_share": 0.824,
    "rules_total": 70, "tickets_2023_2025": 123995 }, … ] }`,
  },
  {
    method: "GET",
    path: "/api/v1/curb/streets/YONGE%20ST/segments",
    desc: "Every segment of one street, with the combined attributes on each segment",
    response: `{ "street": "Yonge St", "count": 214,
  "rule_categories": { "no_stopping": 85, … },
  "segments": [
    { "segment_id": 436600, "road_class": "Major Arterial",
      "length_m": 97.6, "bike_infra_type": null,
      "permit_area": null, "nearest_green_p_m": 1680 }, … ] }`,
  },
  {
    method: "GET",
    path: "/api/v1/curb/gaps",
    desc: "The gap report, each entry with its search evidence",
    response: `{ "count": 8, "gaps": [
  { "kind": "missing",
    "title": "Individual paid parking stalls have no public coordinates", … } ] }`,
  },
];

export default function Developers() {
  const { t } = useLang();
  return (
    <section id="developers" className="bg-ink text-white">
      <div className="mx-auto max-w-[1392px] px-6 py-20 md:py-28">
        <p className="text-[13px] font-semibold uppercase tracking-[0.12em] text-white/60">{t.developers.kicker}</p>
        <h2 className="display mt-4 max-w-[720px] text-[40px] md:text-[52px]">{t.developers.title}</h2>
        <p className="mt-5 max-w-[720px] text-[18px] leading-relaxed text-white/70">{t.developers.body}</p>

        <h3 className="mt-14 text-[13px] font-semibold uppercase tracking-[0.12em] text-white/60">{t.developers.endpoints}</h3>
        <div className="mt-5 grid gap-5 lg:grid-cols-3">
          {endpoints.map((e) => (
            <article key={e.path} className="overflow-hidden rounded-[24px] bg-white/[0.06]">
              <div className="border-b border-white/10 px-6 py-4">
                <span className="mr-3 rounded-full bg-canada px-2.5 py-1 font-mono text-[12px] font-semibold">{e.method}</span>
                <code className="font-mono text-[13px] text-white/85 break-all">{e.path}</code>
                <p className="mt-2 text-[14px] text-white/60">{e.desc}</p>
              </div>
              <pre className="overflow-x-auto px-6 py-4 font-mono text-[12.5px] leading-relaxed text-white/75">{e.response}</pre>
            </article>
          ))}
          <article className="overflow-hidden rounded-[24px] bg-white/[0.06]">
            <div className="border-b border-white/10 px-6 py-4">
              <span className="mr-3 rounded-full bg-canada px-2.5 py-1 font-mono text-[12px] font-semibold">GET</span>
              <code className="font-mono text-[13px] text-white/85 break-all">/api/v1/curb/joins</code>
              <p className="mt-2 text-[14px] text-white/60">Every join with keys, rows in, matched, and match rates</p>
            </div>
            <pre className="overflow-x-auto px-6 py-4 font-mono text-[12.5px] leading-relaxed text-white/75">{`{ "count": 5, "joins": [
  { "join": "cycling network -> centreline segments",
    "method": "spatial (line within 25 m) AND normalized street-name equality",
    "match_rate_left": 0.9534 }, … ] }`}</pre>
          </article>
        </div>

        <div className="mt-8">
          <a href="/api/openapi.json" className="block rounded-[24px] bg-white/[0.06] p-6 hover:bg-white/[0.09]">
            <h4 className="text-[19px] font-semibold">{t.developers.openapi}</h4>
            <code className="mt-2 block font-mono text-[13px] text-white/60">GET /api/openapi.json</code>
          </a>
        </div>

        <McpConnect
          config={{
            slug: "toronto-open-street-parking",
            displayName: "Toronto Open Street Parking",
            exampleEn: "Show me the street parking profile of Queen St W and list the top gaps in the gap report",
            exampleFr: "Montre-moi le profil de stationnement sur rue de Queen St W et liste les principaux manques du rapport",
          }}
        />
      </div>
    </section>
  );
}
