// Background.jsx — canvas particle field ("digital noise"). The field is busy
// on the landing (calm=0) and visibly settles down once the assessment starts
// (calm=1) — the UI enacts the message. Honours prefers-reduced-motion.
"use client";

import { useRef, useEffect } from "react";

export function Background({ calm = 0 }) {
  // calm: 0 = energetic (landing), 1 = calm (assessment/result)
  const canvasRef = useRef(null);
  const targetRef = useRef(calm);
  const stateRef = useRef({ calm, particles: [], raf: 0, w: 0, h: 0, dpr: 1 });
  const reduced = useRef(false);

  useEffect(() => {
    targetRef.current = calm;
  }, [calm]);

  useEffect(() => {
    reduced.current = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced.current) return; // static gradient handled in render

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const S = stateRef.current;

    const MAX = 100;
    const rand = (a, b) => a + Math.random() * (b - a);

    function resize() {
      S.dpr = Math.min(window.devicePixelRatio || 1, 2);
      S.w = canvas.clientWidth;
      S.h = canvas.clientHeight;
      canvas.width = S.w * S.dpr;
      canvas.height = S.h * S.dpr;
      ctx.setTransform(S.dpr, 0, 0, S.dpr, 0, 0);
    }
    resize();

    function spawn() {
      return {
        x: rand(0, S.w), y: rand(0, S.h), r: rand(0.6, 1.8),
        vx: rand(-1, 1), vy: rand(-1, 1), base: rand(0.18, 0.6), tw: rand(0, Math.PI * 2),
      };
    }
    S.particles = Array.from({ length: MAX }, spawn);

    let last = performance.now();
    function frame(now) {
      const dt = Math.min((now - last) / 16.67, 3);
      last = now;
      // ease current calm toward target
      S.calm += (targetRef.current - S.calm) * 0.05;
      const energy = 1 - 0.62 * S.calm; // speed multiplier
      const visible = Math.round(MAX * (1 - 0.55 * S.calm)); // fewer when calm

      ctx.clearRect(0, 0, S.w, S.h);
      for (let i = 0; i < S.particles.length; i++) {
        const p = S.particles[i];
        p.x += p.vx * energy * dt * 0.35;
        p.y += p.vy * energy * dt * 0.35;
        if (p.x < -5) p.x = S.w + 5;
        else if (p.x > S.w + 5) p.x = -5;
        if (p.y < -5) p.y = S.h + 5;
        else if (p.y > S.h + 5) p.y = -5;
        if (i >= visible) continue;
        p.tw += 0.02 * dt;
        const a = p.base * (0.6 + 0.4 * Math.sin(p.tw)) * (0.5 + 0.5 * (1 - S.calm * 0.4));
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(180,198,230,${a})`;
        ctx.fill();
      }
      S.raf = requestAnimationFrame(frame);
    }
    S.raf = requestAnimationFrame(frame);
    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(S.raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
      {/* base gradient wash (also the reduced-motion fallback) */}
      <div
        className="absolute inset-0"
        style={{ background: "radial-gradient(120% 80% at 50% -10%, #15171d 0%, #0b0c0f 55%, #090a0c 100%)" }}
      />
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
    </div>
  );
}
