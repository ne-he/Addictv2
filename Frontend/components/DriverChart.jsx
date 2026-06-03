// DriverChart.jsx — diverging horizontal bars. Orange = raises score,
// green = lowers it; sorted by magnitude. Direction is conveyed by side,
// colour, label, and icon — never colour alone.
"use client";

import { useState } from "react";
import { Icon } from "./Icons";

const UP_COLOR = "#FF4500"; // raises score
const DOWN_COLOR = "#34d399"; // lowers score

export function DriverChart({ drivers, max = 6 }) {
  const [hover, setHover] = useState(null);
  const list = drivers.slice(0, max);
  const maxAbs = Math.max(...list.map((d) => Math.abs(d.contribution)), 0.1);
  const signed = (v) => `${v > 0 ? "+" : "−"}${Math.abs(v).toFixed(2)} poin`;

  return (
    <div className="w-full">
      <div className="flex items-center gap-4 mb-4 text-xs text-zinc-400">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm" style={{ background: UP_COLOR }} />
          <Icon name="trendUp" size={13} />Menaikkan skor
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm" style={{ background: DOWN_COLOR }} />
          <Icon name="trendDown" size={13} />Menurunkan skor
        </span>
      </div>
      <ul className="space-y-2.5" role="list" aria-label="Faktor pendorong skor">
        {list.map((d, i) => {
          const up = d.contribution > 0;
          const w = (Math.abs(d.contribution) / maxAbs) * 50; // % of half-width
          const color = up ? UP_COLOR : DOWN_COLOR;
          return (
            <li
              key={d.key}
              className="relative"
              aria-label={`${d.human_label}: ${signed(d.contribution)}, ${up ? "menaikkan" : "menurunkan"} skor`}
              onMouseEnter={() => setHover(d.key)}
              onMouseLeave={() => setHover(null)}
              tabIndex={0}
              onFocus={() => setHover(d.key)}
              onBlur={() => setHover(null)}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[13px] text-zinc-300">{d.human_label}</span>
                <span className="font-mono text-xs tabular-nums" style={{ color }}>{signed(d.contribution)}</span>
              </div>
              <div className="relative h-3 rounded-full bg-white/[0.04]">
                <div className="absolute top-0 bottom-0 left-1/2 w-px bg-white/15" />
                <div
                  className="absolute top-0 bottom-0 rounded-full"
                  style={{
                    background: color,
                    left: up ? "50%" : `${50 - w}%`,
                    width: `${w}%`,
                    boxShadow: hover === d.key ? `0 0 12px ${color}77` : "none",
                    transition: "width 0.7s cubic-bezier(.22,1,.36,1), box-shadow .2s ease",
                    transitionDelay: `${i * 70}ms`,
                  }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
