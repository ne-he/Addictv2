// Result.jsx — result view: gauge + category verdict, driver chart,
// recommendations, and a live "what-if" panel. Lava Orange (#FF4500) appears
// only on the high-risk band; a non-alarmist disclaimer sits beside the result.
"use client";

import { useState, useMemo, useEffect } from "react";
import { categoryOf, computeScore, computeResult, FIELDS } from "@/lib/scoring";
import { ScoreGauge, colorForScore } from "./Gauge";
import { DriverChart } from "./DriverChart";
import { Button, Field, Disclaimer } from "./ui";
import { Icon } from "./Icons";

const CAT_STYLE = {
  low:    { color: "#34d399", bg: "rgba(52,211,153,0.12)", border: "rgba(52,211,153,0.35)", icon: "shield" },
  medium: { color: "#fbbf24", bg: "rgba(251,191,36,0.12)", border: "rgba(251,191,36,0.35)", icon: "info" },
  high:   { color: "#FF4500", bg: "rgba(255,69,0,0.12)",   border: "rgba(255,69,0,0.38)",   icon: "trendUp" },
};

function CategoryBadge({ category, label }) {
  const s = CAT_STYLE[category] || CAT_STYLE.medium;
  return (
    <span
      className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-sm font-semibold border"
      style={{ color: s.color, background: s.bg, borderColor: s.border }}
    >
      <Icon name={s.icon} size={15} />
      {`Risiko ${label}`}
    </span>
  );
}

function WhatIf({ baseValues, drivers, onScore, scoreColor }) {
  // NOTE: this panel is an intentionally-LOCAL simulation (clearly labelled as a
  // demo). It recomputes the score locally for instant feedback while you drag.
  // The real prediction still goes through predict() in lib/scoring.js.
  const sliders = useMemo(() => drivers.filter((d) => d.numeric).slice(0, 3), [drivers]);
  const [over, setOver] = useState({});

  const merged = { ...baseValues, ...over };
  const score = computeScore(merged);

  useEffect(() => {
    onScore(score);
  }, [score]);

  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.025] p-6">
      <div className="flex items-center gap-2.5 mb-1">
        <Icon name="sliders" size={18} className="text-zinc-300" />
        <h3 className="text-base font-semibold text-white">Simulasi &ldquo;bagaimana jika&rdquo;</h3>
      </div>
      <p className="text-sm text-zinc-500 mb-5">Geser faktor teratas dan lihat skor bergerak langsung. Demo, bukan prediksi nyata.</p>
      <div className="space-y-5">
        {sliders.map((d) => (
          <Field
            key={d.key}
            fieldKey={d.key}
            meta={FIELDS[d.key]}
            value={merged[d.key]}
            accent={scoreColor}
            onChange={(v) => setOver((p) => ({ ...p, [d.key]: v }))}
          />
        ))}
      </div>
      {Object.keys(over).length > 0 && (
        <button
          onClick={() => setOver({})}
          className="mt-5 inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors"
        >
          <Icon name="rotate" size={13} />Reset ke jawabanku
        </button>
      )}
    </div>
  );
}

export function Result({ values, result, onRestart }) {
  const [liveScore, setLiveScore] = useState(result.addiction_level);
  const cat = categoryOf(liveScore);
  const scoreColor = colorForScore(liveScore);
  const drifted = Math.abs(liveScore - result.addiction_level) > 0.05;

  // The what-if panel is a LOCAL sandbox on raw input fields, so its sliders come
  // from the local model's drivers (which carry field meta: .numeric/.key), not
  // the API drivers (model features that have no slider range).
  const whatIfDrivers = useMemo(() => computeResult(values).drivers, [values]);

  return (
    <div className="min-h-[100svh] px-5 sm:px-6 py-8">
      <div className="max-w-3xl mx-auto">
        {/* header row */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/[0.06] border border-white/10 grid place-items-center">
              <Icon name="smartphone" size={16} className="text-zinc-300" />
            </div>
            <span className="font-mono text-sm text-zinc-300">hasil tes</span>
          </div>
          <Button variant="ghost" size="sm" icon="rotate" onClick={onRestart}>Ulang tes</Button>
        </div>

        {/* hero: gauge + verdict */}
        <div className="om-fade grid sm:grid-cols-[auto_1fr] gap-8 items-center rounded-3xl border border-white/10 bg-white/[0.025] p-7 sm:p-9">
          <div className="justify-self-center">
            <ScoreGauge score={liveScore} label={cat.label} />
          </div>
          <div>
            <CategoryBadge category={cat.category} label={cat.label} />
            {drifted && (
              <span className="ml-2 align-middle font-mono text-xs text-zinc-500">{`· asli ${result.addiction_level.toFixed(1)}`}</span>
            )}
            <p className="mt-4 text-[15px] leading-relaxed text-zinc-300 text-pretty">{result.interpretation}</p>
          </div>
        </div>

        {/* drivers */}
        <section className="mt-5 rounded-3xl border border-white/10 bg-white/[0.025] p-6 sm:p-7">
          <h3 className="text-base font-semibold text-white mb-1">Apa yang menggerakkan skormu</h3>
          <p className="text-sm text-zinc-500 mb-5">Kontribusi tiap faktor terhadap indeks, dalam poin.</p>
          <DriverChart drivers={result.drivers} max={6} />
        </section>

        {/* recommendations */}
        {result.recommendations.length > 0 && (
          <section className="mt-5">
            <h3 className="text-base font-semibold text-white mb-3 px-1">Langkah kecil yang bisa dicoba</h3>
            <div className="grid sm:grid-cols-2 gap-3">
              {result.recommendations.map((r, i) => (
                <div key={i} className="flex items-start gap-3.5 rounded-2xl border border-white/10 bg-white/[0.025] p-4">
                  <div className="w-9 h-9 shrink-0 rounded-xl bg-white/[0.06] border border-white/10 grid place-items-center text-zinc-200">
                    <Icon name={r.icon} size={17} />
                  </div>
                  <p className="text-sm text-zinc-300 leading-snug pt-1">{r.text}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* what-if */}
        <section className="mt-5">
          <WhatIf baseValues={values} drivers={whatIfDrivers} onScore={setLiveScore} scoreColor={scoreColor} />
        </section>

        <div className="mt-8 flex flex-col items-center gap-6">
          <Button variant="primary" icon="rotate" onClick={onRestart}>Mulai dari awal</Button>
          <Disclaimer className="max-w-md text-center justify-center" />
        </div>
      </div>
    </div>
  );
}
