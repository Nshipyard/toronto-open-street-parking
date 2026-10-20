"use client";

import { useLang } from "@/i18n";
import type { Lang } from "@/i18n";
import { Banner, Nav, Footer } from "@/components/chrome";
import data from "@/lib/charts-data.json";

// Every number on this page comes from src/lib/charts-data.json, computed by
// scripts/build_charts.py from this project's own files: the join log in
// data/app_data.json and the street rollup in public/data/streets.json.
// Charts are plain SVG bars in the site's colours, drawn at build time from
// that data. No outside numbers.

function fmt(n: number) {
  return n.toLocaleString("en-CA");
}

function rateText(rate: number, lang: Lang) {
  return lang === "fr" ? `${rate.toFixed(1).replace(".", ",")} %` : `${rate.toFixed(1)}%`;
}

// One horizontal bar row: label on the left, bar, value at the end of the bar.
function BarRow({
  label,
  valueText,
  frac,
}: {
  label: string;
  valueText: string;
  frac: number; // 0..1 of the chart width
}) {
  const W = 860;
  const labelW = 300;
  const barW = W - labelW - 110;
  const w = Math.max(2, Math.round(frac * barW));
  return (
    <svg viewBox={`0 0 ${W} 34`} className="block w-full" role="img" aria-label={`${label}: ${valueText}`}>
      <text x={0} y={21} fontSize={14.5} fill="#0a0f1e">
        {label}
      </text>
      <rect x={labelW} y={7} width={barW} height={18} rx={4} fill="#efe9e1" />
      <rect x={labelW} y={7} width={w} height={18} rx={4} fill="#d80621" />
      <text x={labelW + w + 10} y={21} fontSize={14.5} fontWeight={600} fill="#0a0f1e">
        {valueText}
      </text>
    </svg>
  );
}

function ChartShell({
  title,
  takeaway,
  note,
  children,
}: {
  title: string;
  takeaway: string;
  note: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-16 first:mt-12">
      <h2 className="display max-w-[820px] text-[32px] md:text-[40px]">{title}</h2>
      <p className="mt-3 max-w-[760px] text-[17px] leading-relaxed text-ink/75">{takeaway}</p>
      <div className="mt-6 rounded-[24px] border border-line bg-paper p-5 md:p-7">{children}</div>
      <p className="mt-3 max-w-[760px] text-[13.5px] leading-relaxed text-ink/55">{note}</p>
    </section>
  );
}

export default function ChartsPage() {
  const { t, lang } = useLang();
  const maxTop = Math.max(...data.top15.map((r) => r.rules));
  const maxBucket = Math.max(...data.buckets.map((b) => b.count));
  return (
    <>
      <Banner />
      <Nav />
      <main className="flex-1 bg-paper-warm">
        <div className="mx-auto max-w-[1392px] px-6 py-16 md:py-20">
          <p className="text-[13px] font-semibold uppercase tracking-[0.12em] text-canada">{t.charts.kicker}</p>
          <h1 className="display mt-4 max-w-[820px] text-[40px] md:text-[52px]">{t.charts.title}</h1>
          <p className="mt-5 max-w-[760px] text-[18px] leading-relaxed text-ink/70">{t.charts.intro}</p>

          <ChartShell title={t.charts.c1.title} takeaway={t.charts.c1.takeaway} note={t.charts.c1.note}>
            <div className="space-y-1.5">
              {data.match.map((m) => (
                <BarRow
                  key={m.source}
                  label={t.charts.c1.sources[m.source as keyof typeof t.charts.c1.sources]}
                  valueText={rateText(m.rate, lang)}
                  frac={m.rate / 100}
                />
              ))}
            </div>
          </ChartShell>

          <ChartShell title={t.charts.c2.title} takeaway={t.charts.c2.takeaway} note={t.charts.c2.note}>
            <div className="space-y-1.5">
              {data.top15.map((r) => (
                <BarRow key={r.street} label={r.street} valueText={fmt(r.rules)} frac={r.rules / maxTop} />
              ))}
            </div>
          </ChartShell>

          <ChartShell title={t.charts.c3.title} takeaway={t.charts.c3.takeaway} note={t.charts.c3.note}>
            <div className="space-y-1.5">
              {data.coverage.map((c) => (
                <BarRow
                  key={c.key}
                  label={t.charts.c3.labels[c.key as keyof typeof t.charts.c3.labels]}
                  valueText={`${rateText(c.share, lang)} · ${fmt(c.count)} ${t.charts.ofStreets}`}
                  frac={c.share / 100}
                />
              ))}
            </div>
          </ChartShell>

          <ChartShell title={t.charts.c4.title} takeaway={t.charts.c4.takeaway} note={t.charts.c4.note}>
            <div className="space-y-1.5">
              {data.buckets.map((b) => (
                <BarRow
                  key={b.key}
                  label={t.charts.c4.buckets[b.key as keyof typeof t.charts.c4.buckets]}
                  valueText={`${fmt(b.count)} ${t.charts.ofStreets}`}
                  frac={b.count / maxBucket}
                />
              ))}
            </div>
          </ChartShell>
        </div>
      </main>
      <Footer />
    </>
  );
}
