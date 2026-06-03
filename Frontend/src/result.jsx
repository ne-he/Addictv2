// result.jsx — result view. Exposes window.Result
const { useState: rUseState, useMemo: rUseMemo } = React;

const CAT_STYLE = {
  low:    { color: "#34d399", bg: "rgba(52,211,153,0.12)", border: "rgba(52,211,153,0.35)", icon: "shield" },
  medium: { color: "#fbbf24", bg: "rgba(251,191,36,0.12)", border: "rgba(251,191,36,0.35)", icon: "info" },
  high:   { color: "#FF4500", bg: "rgba(255,69,0,0.12)",   border: "rgba(255,69,0,0.38)",   icon: "trendUp" },
};

function CategoryBadge({ category, label }) {
  const s = CAT_STYLE[category] || CAT_STYLE.medium;
  return React.createElement("span", {
    className: "inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-sm font-semibold border",
    style: { color: s.color, background: s.bg, borderColor: s.border },
  },
    React.createElement(Icon, { name: s.icon, size: 15 }),
    `Risiko ${label}`
  );
}

function WhatIf({ baseValues, drivers, onScore, scoreColor }) {
  const sliders = rUseMemo(() => drivers.filter((d) => d.numeric).slice(0, 3), [drivers]);
  const [over, setOver] = rUseState({});

  const merged = { ...baseValues, ...over };
  const score = SCORING.computeScore(merged);

  React.useEffect(() => { onScore(score); }, [score]);

  return React.createElement("div", { className: "rounded-3xl border border-white/10 bg-white/[0.025] p-6" },
    React.createElement("div", { className: "flex items-center gap-2.5 mb-1" },
      React.createElement(Icon, { name: "sliders", size: 18, className: "text-zinc-300" }),
      React.createElement("h3", { className: "text-base font-semibold text-white" }, "Simulasi \u201Cbagaimana jika\u201D")
    ),
    React.createElement("p", { className: "text-sm text-zinc-500 mb-5" }, "Geser faktor teratas dan lihat skor bergerak langsung. Demo, bukan prediksi nyata."),
    React.createElement("div", { className: "space-y-5" },
      sliders.map((d) =>
        React.createElement(Field, {
          key: d.key, fieldKey: d.key, meta: SCORING.FIELDS[d.key],
          value: merged[d.key], accent: scoreColor,
          onChange: (v) => setOver((p) => ({ ...p, [d.key]: v })),
        })
      )
    ),
    Object.keys(over).length > 0 && React.createElement("button", {
      onClick: () => setOver({}),
      className: "mt-5 inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors",
    }, React.createElement(Icon, { name: "rotate", size: 13 }), "Reset ke jawabanku")
  );
}

function Result({ values, result, onRestart }) {
  const [liveScore, setLiveScore] = rUseState(result.addiction_level);
  const cat = SCORING.categoryOf(liveScore);
  const scoreColor = colorForScore(liveScore);
  const drifted = Math.abs(liveScore - result.addiction_level) > 0.05;

  return React.createElement("div", { className: "min-h-[100svh] px-5 sm:px-6 py-8" },
    React.createElement("div", { className: "max-w-3xl mx-auto" },
      // header row
      React.createElement("div", { className: "flex items-center justify-between mb-8" },
        React.createElement("div", { className: "flex items-center gap-2.5" },
          React.createElement("div", { className: "w-8 h-8 rounded-lg bg-white/[0.06] border border-white/10 grid place-items-center" },
            React.createElement(Icon, { name: "smartphone", size: 16, className: "text-zinc-300" })),
          React.createElement("span", { className: "font-mono text-sm text-zinc-300" }, "hasil tes")
        ),
        React.createElement(Button, { variant: "ghost", size: "sm", icon: "rotate", onClick: onRestart }, "Ulang tes")
      ),

      // hero: gauge + verdict
      React.createElement("div", { className: "om-fade grid sm:grid-cols-[auto_1fr] gap-8 items-center rounded-3xl border border-white/10 bg-white/[0.025] p-7 sm:p-9" },
        React.createElement("div", { className: "justify-self-center" },
          React.createElement(ScoreGauge, { score: liveScore, label: cat.label })),
        React.createElement("div", null,
          React.createElement(CategoryBadge, { category: cat.category, label: cat.label }),
          drifted && React.createElement("span", { className: "ml-2 align-middle font-mono text-xs text-zinc-500" },
            `· asli ${result.addiction_level.toFixed(1)}`),
          React.createElement("p", { className: "mt-4 text-[15px] leading-relaxed text-zinc-300 text-pretty" }, result.interpretation)
        )
      ),

      // drivers
      React.createElement("section", { className: "mt-5 rounded-3xl border border-white/10 bg-white/[0.025] p-6 sm:p-7" },
        React.createElement("h3", { className: "text-base font-semibold text-white mb-1" }, "Apa yang menggerakkan skormu"),
        React.createElement("p", { className: "text-sm text-zinc-500 mb-5" }, "Kontribusi tiap faktor terhadap indeks, dalam poin."),
        React.createElement(DriverChart, { drivers: result.drivers, max: 6 })
      ),

      // recommendations
      result.recommendations.length > 0 && React.createElement("section", { className: "mt-5" },
        React.createElement("h3", { className: "text-base font-semibold text-white mb-3 px-1" }, "Langkah kecil yang bisa dicoba"),
        React.createElement("div", { className: "grid sm:grid-cols-2 gap-3" },
          result.recommendations.map((r, i) =>
            React.createElement("div", { key: i, className: "flex items-start gap-3.5 rounded-2xl border border-white/10 bg-white/[0.025] p-4" },
              React.createElement("div", { className: "w-9 h-9 shrink-0 rounded-xl bg-white/[0.06] border border-white/10 grid place-items-center text-zinc-200" },
                React.createElement(Icon, { name: r.icon, size: 17 })),
              React.createElement("p", { className: "text-sm text-zinc-300 leading-snug pt-1" }, r.text)
            )
          )
        )
      ),

      // what-if
      React.createElement("section", { className: "mt-5" },
        React.createElement(WhatIf, { baseValues: values, drivers: result.drivers, onScore: setLiveScore, scoreColor })
      ),

      React.createElement("div", { className: "mt-8 flex flex-col items-center gap-6" },
        React.createElement(Button, { variant: "primary", icon: "rotate", onClick: onRestart }, "Mulai dari awal"),
        React.createElement(Disclaimer, { className: "max-w-md text-center justify-center" })
      )
    )
  );
}

window.Result = Result;
