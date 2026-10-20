"use client";

import { useEffect, useState } from "react";
import { useLang } from "@/i18n";
import { Banner, Nav, Footer } from "@/components/chrome";
import StreetData from "@/components/StreetData";
import Sources from "@/components/Sources";
import Gaps from "@/components/Gaps";
import Developers from "@/components/Developers";

interface Summary {
  datasets_inventoried: number;
  datasets_joined: number;
  segments: number;
  bylaw_rules_current: number;
  gaps_documented: number;
}

function fmt(n: number) {
  return n.toLocaleString("en-CA");
}

function Hero() {
  const { t } = useLang();
  const [s, setS] = useState<Summary | null>(null);
  useEffect(() => {
    fetch("/api/v1/curb/summary")
      .then((r) => r.json())
      .then(setS)
      .catch(() => {});
  }, []);
  const stats = s
    ? [
        { value: fmt(s.datasets_inventoried), label: t.statsLabels[0] },
        { value: fmt(s.segments), label: t.statsLabels[1] },
        { value: fmt(s.bylaw_rules_current), label: t.statsLabels[2] },
        { value: "0", label: t.statsLabels[3] },
      ]
    : [];
  return (
    <section id="top" className="bg-paper">
      <div className="mx-auto max-w-[1392px] px-6 pb-16 pt-16 md:pb-24 md:pt-24">
        <p className="text-[13px] font-semibold uppercase tracking-[0.12em] text-canada">{t.hero.kicker}</p>
        <h1 className="display mt-5 max-w-[880px] text-[52px] md:text-[84px]">{t.hero.title}</h1>
        <p className="mt-6 max-w-[680px] text-[19px] leading-relaxed text-ink/70 md:text-[21px]">{t.hero.lead}</p>
        <p className="mt-6 max-w-[680px] text-[19px] leading-relaxed text-ink/70 md:text-[21px]">{t.hero.sub}</p>
        <div className="mt-9 flex flex-wrap gap-3">
          <a href="#explorer" className="rounded-full bg-canada px-7 py-3.5 text-[16px] font-semibold text-white hover:bg-canada-dark">
            {t.hero.cta1}
          </a>
          <a href="#gaps" className="rounded-full border border-line px-7 py-3.5 text-[16px] font-semibold hover:border-ink">
            {t.hero.cta2}
          </a>
        </div>
        {stats.length > 0 && (
          <div className="mt-16 grid gap-px overflow-hidden rounded-[24px] border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((st) => (
              <div key={st.label} className="bg-paper p-7">
                <p className="display text-[44px] text-canada">{st.value}</p>
                <p className="mt-2 text-[15px] leading-snug text-ink/65">{st.label}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function CombinedDownloads() {
  const { t } = useLang();
  const files = [
    { label: t.combinedDl.csv, name: "open_curb_segments.csv", path: "/data/open_curb_segments.csv" },
    { label: t.combinedDl.geojson, name: "open_curb_segments.geojson", path: "/data/open_curb_segments.geojson" },
    { label: t.combinedDl.dict, name: "data_dictionary.md", path: "/data/data_dictionary.md" },
  ];
  return (
    <section className="border-t border-line bg-paper">
      <div className="mx-auto max-w-[1392px] px-6 py-12">
        <div className="flex flex-wrap items-baseline gap-x-5 gap-y-2">
          <h2 className="display text-[26px] md:text-[30px]">{t.combinedDl.title}</h2>
          <p className="text-[15.5px] text-ink/65">{t.combinedDl.note}</p>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {files.map((f) => (
            <div key={f.name} className="flex items-center justify-between gap-4 rounded-[20px] border border-line bg-paper-warm px-5 py-4">
              <div className="min-w-0">
                <p className="text-[15px] font-semibold">{f.label}</p>
                <code className="block truncate font-mono text-[12.5px] text-ink/55">{f.name}</code>
              </div>
              <a href={f.path} download className="shrink-0 rounded-full border border-line bg-paper px-4 py-2 text-[14px] font-semibold hover:border-ink">
                {t.downloads.download}
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Methodology() {
  const { t } = useLang();
  return (
    <section id="methodology" className="bg-paper">
      <div className="mx-auto max-w-[1392px] px-6 py-20 md:py-28">
        <p className="text-[13px] font-semibold uppercase tracking-[0.12em] text-canada">{t.methodology.kicker}</p>
        <h2 className="display mt-4 max-w-[720px] text-[40px] md:text-[52px]">{t.methodology.title}</h2>
        <ul className="mt-8 max-w-[760px] space-y-4">
          {t.methodology.points.map((p, i) => (
            <li key={i} className="flex gap-4 rounded-[20px] border border-line bg-paper-warm p-5">
              <span className="display shrink-0 text-[22px] text-canada">{i + 1}</span>
              <p className="text-[16px] leading-relaxed text-ink/75">{p}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Downloads() {
  const { t } = useLang();
  const files = [
    { name: "open_curb_segments.csv", path: "/data/open_curb_segments.csv" },
    { name: "open_curb_segments.geojson", path: "/data/open_curb_segments.geojson" },
    { name: "inventory.csv", path: "/data/inventory.csv" },
    { name: "bylaw_rules.csv", path: "/data/bylaw_rules.csv" },
    { name: "green_p_facilities.csv", path: "/data/green_p_facilities.csv" },
    { name: "data_dictionary.md", path: "/data/data_dictionary.md" },
  ];
  return (
    <section id="data" className="bg-paper-warm">
      <div className="mx-auto max-w-[1392px] px-6 py-20 md:py-28">
        <p className="text-[13px] font-semibold uppercase tracking-[0.12em] text-canada">{t.downloads.kicker}</p>
        <h2 className="display mt-4 max-w-[720px] text-[40px] md:text-[52px]">{t.downloads.title}</h2>
        <p className="mt-5 max-w-[720px] text-[18px] leading-relaxed text-ink/70">{t.downloads.body}</p>
        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          {files.map((f) => (
            <div key={f.name} className="flex items-center justify-between gap-4 rounded-[24px] border border-line bg-paper p-6">
              <code className="min-w-0 flex-1 break-all font-mono text-[15px] font-medium">{f.name}</code>
              <a href={f.path} download className="shrink-0 rounded-full border border-line px-5 py-2.5 text-[15px] font-semibold hover:border-ink">
                {t.downloads.download}
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  return (
    <>
      <Banner />
      <Nav />
      <main className="flex-1">
        <Hero />
        <CombinedDownloads />
        <StreetData />
        <Gaps />
        <Developers />
        <Sources />
        <Methodology />
        <Downloads />
      </main>
      <Footer />
    </>
  );
}
