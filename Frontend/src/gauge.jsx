// gauge.jsx — animated radial 1–10 score gauge. Exposes window.ScoreGauge
const { useState: gUseState, useEffect: gUseEffect, useRef: gUseRef } = React;

const GAUGE_COLORS = { low: "#34d399", medium: "#fbbf24", high: "#FF4500" };

function colorForScore(s) {
  if (s < 4) return GAUGE_COLORS.low;
  if (s < 7) return GAUGE_COLORS.medium;
  return GAUGE_COLORS.high;
}

function bandFloor(s) { return s >= 7 ? 7 : s >= 4 ? 4 : 1; }

function ScoreGauge({ score, label, size = 248, animate = true }) {
  const [display, setDisplay] = gUseState(animate ? bandFloor(score) : score);
  const fromRef = gUseRef(animate ? bandFloor(score) : score);
  const rafRef = gUseRef(0);

  gUseEffect(() => {
    const reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const from = fromRef.current;
    const to = score;
    if (reduced || !animate) { setDisplay(to); fromRef.current = to; return; }
    const dur = 950; const t0 = performance.now();
    const ease = (t) => 1 - Math.pow(1 - t, 3);
    cancelAnimationFrame(rafRef.current);
    const tick = (now) => {
      const t = Math.min((now - t0) / dur, 1);
      const v = from + (to - from) * ease(t);
      setDisplay(v);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
      else fromRef.current = to;
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [score, animate]);

  const stroke = 16;
  const r = (size - stroke) / 2 - 6;
  const cx = size / 2, cy = size / 2;
  const circ = 2 * Math.PI * r;
  const sweep = 0.75;                 // 270° arc
  const arc = circ * sweep;
  const frac = (SCORING.clamp(display, 1, 10) - 1) / 9;
  const color = colorForScore(display);

  return React.createElement("div", {
    className: "relative inline-flex items-center justify-center",
    style: { width: size, height: size },
    role: "img",
    "aria-label": `Skor ketergantungan ${(Math.round(display * 10) / 10).toFixed(1)} dari 10, kategori ${label}`,
  },
    React.createElement("svg", { width: size, height: size, className: "rotate-[135deg]" },
      React.createElement("circle", {
        cx, cy, r, fill: "none", stroke: "rgba(255,255,255,0.07)", strokeWidth: stroke,
        strokeLinecap: "round", strokeDasharray: `${arc} ${circ}`,
      }),
      React.createElement("circle", {
        cx, cy, r, fill: "none", stroke: color, strokeWidth: stroke, strokeLinecap: "round",
        strokeDasharray: `${arc * frac} ${circ}`,
        style: { transition: "stroke 0.4s ease", filter: `drop-shadow(0 0 10px ${color}66)` },
      })
    ),
    React.createElement("div", { className: "absolute inset-0 flex flex-col items-center justify-center" },
      React.createElement("div", { className: "flex items-baseline gap-0.5" },
        React.createElement("span", { className: "font-mono font-semibold tabular-nums leading-none", style: { fontSize: size * 0.3, color } },
          (Math.round(display * 10) / 10).toFixed(1)),
        React.createElement("span", { className: "font-mono text-zinc-500 text-base" }, "/10")
      ),
      React.createElement("span", { className: "mt-2 text-[11px] uppercase tracking-[0.2em] text-zinc-500" }, "Indeks")
    )
  );
}

window.ScoreGauge = ScoreGauge;
window.colorForScore = colorForScore;
