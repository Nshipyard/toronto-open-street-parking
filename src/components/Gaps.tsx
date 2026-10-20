"use client";

import { useEffect, useState } from "react";
import { useLang } from "@/i18n";

interface Gap {
  id: string;
  title: string;
  claim: string;
  evidence: string;
  kind: "missing" | "text-only" | "stale" | "partial";
}

const KIND_STYLE: Record<Gap["kind"], string> = {
  missing: "bg-ink text-white",
  "text-only": "bg-canada text-white",
  stale: "border border-line text-ink/70",
  partial: "bg-muted text-ink/80",
};

export default function Gaps() {
  const { t } = useLang();
  const [gaps, setGaps] = useState<Gap[]>([]);

  useEffect(() => {
    fetch("/api/v1/curb/gaps")
      .then((r) => r.json())
      .then((d) => setGaps(d.gaps))
      .catch(() => {});
  }, []);

  return (
    <section id="gaps" className="bg-paper">
      <div className="mx-auto max-w-[1392px] px-6 py-20 md:py-28">
        <p className="text-[13px] font-semibold uppercase tracking-[0.12em] text-canada">{t.gaps.kicker}</p>
        <h2 className="display mt-4 max-w-[820px] text-[40px] md:text-[52px]">{t.gaps.title}</h2>
        <p className="mt-5 max-w-[760px] text-[18px] leading-relaxed text-ink/70">{t.gaps.body}</p>

        <ol className="mt-10 max-w-[880px] space-y-6">
          {gaps.map((g, i) => (
            <li key={g.id} className="rounded-[24px] border border-line bg-paper-warm p-7">
              <div className="flex flex-wrap items-center gap-3">
                <span className="display text-[22px] text-canada">{i + 1}</span>
                <span className={`rounded-full px-3 py-1 text-[12px] font-semibold uppercase tracking-wide ${KIND_STYLE[g.kind]}`}>
                  {t.gaps.kindLabels[g.kind]}
                </span>
              </div>
              <h3 className="mt-3 text-[22px] font-semibold leading-snug">{g.title}</h3>
              <p className="mt-3 text-[16px] leading-relaxed text-ink/80">{g.claim}</p>
              <p className="mt-3 border-l-2 border-line pl-4 text-[14.5px] leading-relaxed text-ink/60">{g.evidence}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
