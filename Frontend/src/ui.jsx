// ui.jsx — shared controls. Exposes Button, Field, Segmented, SelectChips, Disclaimer
const { useState, useRef, useId } = React;

function Button({ children, variant = "primary", size = "md", className = "", icon, iconRight, ...rest }) {
  const base = "inline-flex items-center justify-center gap-2 font-medium rounded-full transition-all duration-200 select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0c0f] disabled:opacity-40 disabled:cursor-not-allowed";
  const sizes = { md: "px-5 py-2.5 text-sm", lg: "px-7 py-3.5 text-base", sm: "px-4 py-2 text-sm" };
  const variants = {
    primary: "bg-[#f4f4f5] text-[#0b0c0f] hover:bg-white hover:-translate-y-px active:translate-y-0 focus-visible:ring-white/70 shadow-[0_2px_20px_-6px_rgba(255,255,255,0.5)]",
    danger: "bg-[#FF4500] text-white hover:brightness-110 hover:-translate-y-px focus-visible:ring-[#FF4500]/60 shadow-[0_4px_24px_-6px_rgba(255,69,0,0.6)]",
    ghost: "bg-white/[0.04] text-zinc-300 border border-white/10 hover:bg-white/[0.08] hover:text-white focus-visible:ring-white/30",
    quiet: "text-zinc-400 hover:text-white",
  };
  return React.createElement("button", { className: `${base} ${sizes[size]} ${variants[variant]} ${className}`, ...rest },
    icon && React.createElement(Icon, { name: icon, size: size === "lg" ? 20 : 17 }),
    React.createElement("span", null, children),
    iconRight && React.createElement(Icon, { name: iconRight, size: size === "lg" ? 20 : 17 })
  );
}

const fmt = (v, integer) => (integer ? Math.round(v) : (Math.round(v * 10) / 10));

// numeric field: slider + bound number input
function Field({ fieldKey, meta, value, onChange, accent = "#e4e4e7" }) {
  const id = useId();
  const { label, min, max, step, integer, unit } = meta;
  const pct = ((value - min) / (max - min)) * 100;
  const set = (v) => {
    let n = Number(v);
    if (Number.isNaN(n)) return;
    n = SCORING.clamp(n, min, max);
    if (integer) n = Math.round(n);
    onChange(n);
  };
  return React.createElement("div", { className: "group" },
    React.createElement("div", { className: "flex items-baseline justify-between mb-2.5" },
      React.createElement("label", { htmlFor: id, className: "text-sm text-zinc-300 font-medium" }, label),
      React.createElement("div", { className: "flex items-center gap-1.5" },
        React.createElement("input", {
          id, type: "number", min, max, step, value: fmt(value, integer),
          onChange: (e) => set(e.target.value),
          "aria-label": label,
          className: "w-16 bg-white/[0.04] border border-white/10 rounded-lg px-2 py-1 text-right font-mono text-sm text-white tabular-nums focus:outline-none focus:border-white/30 focus:bg-white/[0.07] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
        }),
        React.createElement("span", { className: "text-xs text-zinc-500 font-mono w-7" }, unit)
      )
    ),
    React.createElement("input", {
      type: "range", min, max, step, value,
      onChange: (e) => set(e.target.value),
      "aria-label": label, "aria-valuetext": `${fmt(value, integer)} ${unit}`,
      className: "om-range w-full",
      style: { "--pct": `${pct}%`, "--accent": accent },
    })
  );
}

function Segmented({ label, options, optionLabels, value, onChange, accent = "#e4e4e7" }) {
  return React.createElement("div", null,
    label && React.createElement("div", { className: "text-sm text-zinc-300 font-medium mb-2.5" }, label),
    React.createElement("div", { role: "radiogroup", "aria-label": label, className: "flex gap-1.5 p-1 bg-white/[0.03] border border-white/10 rounded-xl" },
      options.map((opt, i) => {
        const active = value === opt;
        return React.createElement("button", {
          key: opt, role: "radio", "aria-checked": active, onClick: () => onChange(opt),
          className: `flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 ${active ? "text-[#0b0c0f]" : "text-zinc-400 hover:text-zinc-200"}`,
          style: active ? { background: accent } : {},
        }, (optionLabels && optionLabels[i]) || opt);
      })
    )
  );
}

function SelectChips({ label, options, optionLabels, value, onChange, accent = "#e4e4e7" }) {
  return React.createElement("div", null,
    label && React.createElement("div", { className: "text-sm text-zinc-300 font-medium mb-2.5" }, label),
    React.createElement("div", { role: "radiogroup", "aria-label": label, className: "flex flex-wrap gap-2" },
      options.map((opt, i) => {
        const active = value === opt;
        return React.createElement("button", {
          key: opt, role: "radio", "aria-checked": active, onClick: () => onChange(opt),
          className: `px-3.5 py-2 rounded-full text-sm font-medium border transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 ${active ? "text-[#0b0c0f] border-transparent" : "text-zinc-400 border-white/10 hover:border-white/25 hover:text-zinc-200"}`,
          style: active ? { background: accent } : {},
        }, (optionLabels && optionLabels[i]) || opt);
      })
    )
  );
}

function Disclaimer({ className = "" }) {
  return React.createElement("div", { className: `flex items-start gap-2.5 text-xs leading-relaxed text-zinc-500 ${className}` },
    React.createElement(Icon, { name: "info", size: 15, className: "mt-px shrink-0 text-zinc-600" }),
    React.createElement("p", null,
      "Estimasi statistik, ",
      React.createElement("span", { className: "text-zinc-400" }, "BUKAN diagnosis medis/psikologis"),
      ". Dataset kemungkinan sintetis."
    )
  );
}

Object.assign(window, { Button, Field, Segmented, SelectChips, Disclaimer });
