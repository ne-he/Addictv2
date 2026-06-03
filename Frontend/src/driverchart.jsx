// driverchart.jsx — diverging horizontal bars. Exposes window.DriverChart
const { useState: dcUseState } = React;

const UP_COLOR = "#FF4500";   // raises score
const DOWN_COLOR = "#34d399"; // lowers score

function DriverChart({ drivers, max = 6 }) {
  const [hover, setHover] = dcUseState(null);
  const list = drivers.slice(0, max);
  const maxAbs = Math.max(...list.map((d) => Math.abs(d.contribution)), 0.1);
  const signed = (v) => `${v > 0 ? "+" : "−"}${Math.abs(v).toFixed(2)} poin`;

  return React.createElement("div", { className: "w-full" },
    React.createElement("div", { className: "flex items-center gap-4 mb-4 text-xs text-zinc-400" },
      React.createElement("span", { className: "flex items-center gap-1.5" },
        React.createElement("span", { className: "w-2.5 h-2.5 rounded-sm", style: { background: UP_COLOR } }),
        React.createElement(Icon, { name: "trendUp", size: 13 }), "Menaikkan skor"),
      React.createElement("span", { className: "flex items-center gap-1.5" },
        React.createElement("span", { className: "w-2.5 h-2.5 rounded-sm", style: { background: DOWN_COLOR } }),
        React.createElement(Icon, { name: "trendDown", size: 13 }), "Menurunkan skor")
    ),
    React.createElement("ul", { className: "space-y-2.5", role: "list", "aria-label": "Faktor pendorong skor" },
      list.map((d, i) => {
        const up = d.contribution > 0;
        const w = (Math.abs(d.contribution) / maxAbs) * 50; // % of half-width
        const color = up ? UP_COLOR : DOWN_COLOR;
        return React.createElement("li", {
          key: d.key, className: "relative",
          "aria-label": `${d.human_label}: ${signed(d.contribution)}, ${up ? "menaikkan" : "menurunkan"} skor`,
          onMouseEnter: () => setHover(d.key), onMouseLeave: () => setHover(null),
          tabIndex: 0, onFocus: () => setHover(d.key), onBlur: () => setHover(null),
        },
          React.createElement("div", { className: "flex items-center justify-between mb-1" },
            React.createElement("span", { className: "text-[13px] text-zinc-300" }, d.human_label),
            React.createElement("span", { className: "font-mono text-xs tabular-nums", style: { color } }, signed(d.contribution))
          ),
          React.createElement("div", { className: "relative h-3 rounded-full bg-white/[0.04]" },
            React.createElement("div", { className: "absolute top-0 bottom-0 left-1/2 w-px bg-white/15" }),
            React.createElement("div", {
              className: "absolute top-0 bottom-0 rounded-full",
              style: {
                background: color,
                left: up ? "50%" : `${50 - w}%`,
                width: `${w}%`,
                boxShadow: hover === d.key ? `0 0 12px ${color}77` : "none",
                transition: "width 0.7s cubic-bezier(.22,1,.36,1), box-shadow .2s ease",
                transitionDelay: `${i * 70}ms`,
              },
            })
          )
        );
      })
    )
  );
}

window.DriverChart = DriverChart;
