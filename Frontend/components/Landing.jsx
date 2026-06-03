// Landing.jsx — hero with a SCROLL-DRIVEN IMAGE SEQUENCE (like Apple product
// pages). Frames are preloaded and drawn to a <canvas> (no <img> swapping →
// no flicker, no <video> seeking → no lag). Scroll progress maps to a frame
// index; scrolling up plays it backward automatically.
"use client";

import { useRef, useEffect, useState } from "react";
import { Icon } from "./Icons";
import { Button } from "./ui";

/* ════════════════════════════════════════════════════════════════════════
   PENGATURAN HERO SCROLL  ·  ubah angka di sini saja
   ──────────────────────────────────────────────────────────────────────
   FRAME_COUNT      : jumlah frame di public/sequence/ (frame_001.jpg … NNN).
                      Kalau nambah/ngurangin frame, ubah angka ini saja.
   SCROLL_TRACK_VH  : tinggi "rel" scroll dalam % tinggi layar.
                      Makin BESAR → jarak scroll makin panjang → sekuens terasa
                      makin LAMBAT (butuh lebih banyak scroll untuk selesai).
   CALM_START       : pada progres scroll berapa (0–1) hero mulai "menenang":
                      gerak meredup menjelang asesmen. 0.6 = mulai di 60% rel.
   MOBILE_MAX_PX    : lebar layar (px) ke bawah dianggap mobile → pakai frame
                      diam (tidak preload 48 gambar; hemat data & baterai).
   POSTER_FRAME     : frame yang dipakai sebagai gambar diam (fallback mobile /
                      reduced-motion / sebelum sekuens siap).
   ════════════════════════════════════════════════════════════════════════ */
const FRAME_COUNT     = 125;
const SCROLL_TRACK_VH = 350;
const CALM_START      = 0.6;
const MOBILE_MAX_PX   = 768;
const POSTER_FRAME    = 1;

const framePath = (i) => `/sequence/frame_${String(i).padStart(3, "0")}.jpg`;
const POSTER_SRC = framePath(POSTER_FRAME);

export function Landing({ onStart }) {
  const trackRef  = useRef(null);
  const canvasRef = useRef(null);
  const stageRef  = useRef(null);
  const cueRef    = useRef(null);

  const [ready, setReady]       = useState(false); // true setelah semua frame ke-preload
  const [isStatic, setIsStatic] = useState(false); // mobile / reduced-motion → frame diam

  useEffect(() => {
    const reduced = window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isMobile = window.matchMedia &&
      window.matchMedia(`(max-width: ${MOBILE_MAX_PX}px)`).matches;

    // ── FALLBACK: mobile atau reduced-motion → frame diam, lewati preload+canvas.
    if (reduced || isMobile) {
      setIsStatic(true);
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const frames = [];
    let loaded = 0;
    let curIndex = -1;
    let raf = 0;
    let cancelled = false;

    // gambar satu frame ke canvas dengan object-fit: cover
    function draw(i) {
      const img = frames[i];
      if (!img || !img.naturalWidth) return;
      const cw = canvas.clientWidth, ch = canvas.clientHeight;
      const ir = img.naturalWidth / img.naturalHeight;
      const cr = cw / ch;
      let dw, dh, dx, dy;
      if (cr > ir) { dw = cw; dh = cw / ir; dx = 0; dy = (ch - dh) / 2; }
      else         { dh = ch; dw = ch * ir; dy = 0; dx = (cw - dw) / 2; }
      ctx.clearRect(0, 0, cw, ch);
      ctx.drawImage(img, dx, dy, dw, dh);
    }
    function drawIndex(i, force) {
      i = Math.max(0, Math.min(FRAME_COUNT - 1, i));
      if (i === curIndex && !force) return;
      curIndex = i;
      draw(i);
    }
    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width  = canvas.clientWidth * dpr;
      canvas.height = canvas.clientHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawIndex(curIndex < 0 ? 0 : curIndex, true);
    }

    // map progres scroll (0→1) ke index frame + efek "menenang"
    function update() {
      raf = 0;
      const track = trackRef.current;
      if (!track) return;
      const r = track.getBoundingClientRect();
      const denom = r.height - window.innerHeight;
      const p = denom > 0 ? Math.min(Math.max(-r.top / denom, 0), 1) : 0;

      drawIndex(Math.round(p * (FRAME_COUNT - 1)));

      // "Menenang": menjelang asesmen, hero meredup & menyusut pelan.
      if (stageRef.current) {
        const t = p <= CALM_START ? 0 : (p - CALM_START) / (1 - CALM_START);
        stageRef.current.style.opacity = String(1 - 0.45 * t);
        stageRef.current.style.transform = `scale(${1 - 0.015 * t})`;
      }
      // Petunjuk "gulir" memudar cepat di awal scroll.
      if (cueRef.current) cueRef.current.style.opacity = String(Math.max(0, 1 - p * 8));
    }

    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };

    // ── preload semua frame, lalu gambar frame pertama ──
    const onAllLoaded = () => {
      if (cancelled) return;
      setReady(true);
      resize();
      update();
    };
    for (let i = 1; i <= FRAME_COUNT; i++) {
      const img = new Image();
      img.onload = img.onerror = () => { if (++loaded === FRAME_COUNT) onAllLoaded(); };
      img.src = framePath(i);
      frames.push(img);
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", resize);

    return () => {
      cancelled = true;
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", resize);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    // ── REL SCROLL: tinggi inilah yang menentukan jarak scrub sekuens ──
    // mobile/reduced-motion (isStatic) → 1 layar saja, tanpa rel panjang.
    <div ref={trackRef} className="relative" style={{ height: isStatic ? "100svh" : SCROLL_TRACK_VH + "vh" }}>
      {/* ── PANGGUNG STICKY: tetap di tengah layar selama rel ini diakses ── */}
      <div ref={stageRef} className="sticky top-0 h-[100svh] overflow-hidden flex flex-col">

        {/* frame diam di paling belakang (fallback + alas saat sekuens belum siap) */}
        <img
          src={POSTER_SRC}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ transform: "scale(1.06)" }}
        />
        {/* canvas sekuens (di atas poster; menggambar frame saat scroll) */}
        {!isStatic && (
          <canvas
            ref={canvasRef}
            aria-hidden="true"
            className="absolute inset-0 w-full h-full"
            style={{ transform: "scale(1.06)", opacity: ready ? 1 : 0, transition: "opacity 0.4s ease" }}
          />
        )}
        {/* scrim agar teks terbaca di atas gambar */}
        <div className="absolute inset-0" style={{
          background: "radial-gradient(125% 95% at 50% 32%, rgba(11,12,15,0.45) 0%, rgba(11,12,15,0.78) 62%, #0b0c0f 100%)" }} />

        {/* indikator memuat (hanya saat menyiapkan sekuens) */}
        {!isStatic && !ready && (
          <div className="absolute bottom-7 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 text-[11px] font-mono text-zinc-500">
            <span className="w-3 h-3 rounded-full border border-zinc-500 border-t-transparent animate-spin" />
            menyiapkan sekuens…
          </div>
        )}

        {/* header */}
        <header className="relative z-10 px-6 sm:px-10 pt-7 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/[0.06] border border-white/10 grid place-items-center backdrop-blur-sm">
              <Icon name="smartphone" size={17} className="text-zinc-300" />
            </div>
            <span className="font-mono text-sm tracking-tight text-zinc-300">sinyal.</span>
          </div>
          <span className="hidden sm:flex items-center gap-1.5 text-xs text-zinc-500 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/80" />model demo · v0.1
          </span>
        </header>

        {/* centered hero (tetap terlihat; sekuens bermain di belakangnya) */}
        <main className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 mb-8 rounded-full border border-white/10 bg-white/[0.04] backdrop-blur-sm text-xs text-zinc-400">
            <Icon name="sparkles" size={13} className="text-zinc-300" />
            Refleksi hubunganmu dengan layar
          </div>
          <h1 className="text-[clamp(2.4rem,7vw,4.75rem)] font-semibold leading-[1.02] tracking-[-0.03em] text-balance max-w-4xl">
            Seberapa lekat kamu <span className="text-zinc-500">dengan ponselmu?</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-zinc-400 text-pretty">
            Jawab 19 pertanyaan singkat tentang pemakaian HP dan keseharianmu. Dapatkan indeks ketergantungan 1–10, faktor pendorongnya, dan langkah kecil untuk menyeimbangkan.
          </p>
          <div className="mt-10 flex flex-col items-center gap-5">
            <Button variant="primary" size="lg" iconRight="arrowRight" onClick={onStart}>Mulai Tes</Button>
            <span className="text-xs text-zinc-500 font-mono">± 2 menit · tanpa login · tanpa data tersimpan</span>
          </div>

          <div className="mt-14 grid grid-cols-3 gap-px max-w-lg w-full rounded-2xl overflow-hidden border border-white/10 bg-white/[0.06] backdrop-blur-sm">
            {[["19", "faktor dinilai"], ["1–10", "skala indeks"], ["0", "data dikirim"]].map(([n, l]) => (
              <div key={l} className="bg-[#0b0c0f]/55 px-4 py-5">
                <div className="font-mono text-2xl text-white tabular-nums">{n}</div>
                <div className="text-[11px] text-zinc-500 mt-1">{l}</div>
              </div>
            ))}
          </div>
        </main>

        {/* scroll cue (memudar saat mulai scroll) */}
        <div ref={cueRef} className="relative z-10 pb-7 flex flex-col items-center gap-2 text-zinc-500">
          <span className="font-mono text-[11px] tracking-wide">gulir untuk memutar</span>
          <Icon name="chevronDown" size={16} className="animate-bounce" />
        </div>
      </div>
    </div>
  );
}
