"use client";

import { useEffect, useRef } from "react";

/* ════════════════════════════════════════════════════════════════════════
   ScrollVideo — video yang frame-nya dikendalikan oleh posisi scroll.
   Scroll ke bawah = maju, scroll ke atas = mundur. Video di-PAUSE; tidak
   pernah autoplay / loop. currentTime di-set manual dari progres scroll.

   ┌─ TUNING ────────────────────────────────────────────────────────────┐
   │ SECTION_HEIGHT_VH : tinggi "rel" scroll (kelipatan tinggi layar).    │
   │   Makin BESAR → jarak scroll makin panjang → video terasa LAMBAT     │
   │   (butuh lebih banyak scroll untuk habis). 400 = 4× tinggi layar.    │
   │   Coba 300 (lebih cepat) atau 600 (lebih lambat / sinematik).        │
   └──────────────────────────────────────────────────────────────────────┘
   ════════════════════════════════════════════════════════════════════════ */
const SECTION_HEIGHT_VH = 400;

export default function ScrollVideo({ children }) {
  const wrapRef = useRef(null);
  const videoRef = useRef(null);

  useEffect(() => {
    const v = videoRef.current;
    const w = wrapRef.current;
    if (!v || !w) return;

    // ── 1) prefers-reduced-motion → tidak ada scrub, poster diam saja.
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    // ── 2) Mobile / iOS → jangan scrub (seeking video tidak andal & boros).
    //    Tampilkan poster statis. Deteksi via lebar layar + pointer kasar.
    const isMobile =
      window.matchMedia("(max-width: 768px)").matches ||
      window.matchMedia("(pointer: coarse)").matches;

    if (reduced || isMobile) {
      // Biarkan elemen <video> menampilkan poster-nya; tidak ada gerak.
      v.removeAttribute("autoplay");
      try { v.pause(); } catch (_) {}
      return;
    }

    // ── 3) Mode scrub penuh (desktop) ──────────────────────────────────
    v.pause(); // WAJIB: kita yang mengendalikan frame, bukan playback.

    let raf = 0;
    let lastTarget = -1;

    const update = () => {
      raf = 0;
      const r = w.getBoundingClientRect();
      // progres 0→1 selama section melewati viewport
      const denom = r.height - window.innerHeight;
      const p = denom > 0
        ? Math.min(Math.max(-r.top / denom, 0), 1)
        : 0;

      if (v.duration) {
        const target = p * v.duration;
        // hindari set berulang ke nilai yang sama (kurangi kerja seek)
        if (Math.abs(target - lastTarget) > 0.001) {
          v.currentTime = target; // ← inti: scroll → frame (mundur otomatis saat scroll naik)
          lastTarget = target;
        }
      }
    };

    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };

    // set frame awal begitu metadata siap
    const onReady = () => update();
    if (v.readyState >= 1) onReady();
    else v.addEventListener("loadedmetadata", onReady, { once: true });

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      v.removeEventListener("loadedmetadata", onReady);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <section
      ref={wrapRef}
      style={{ height: `${SECTION_HEIGHT_VH}vh`, position: "relative" }}
    >
      {/* Sticky: menahan video di tengah layar selama section diakses */}
      <div
        style={{
          position: "sticky",
          top: 0,
          height: "100vh",
          overflow: "hidden",
        }}
      >
        <video
          ref={videoRef}
          src="/hero.mp4"
          poster="/hero-poster.jpg"
          muted
          playsInline
          preload="auto"
          /* JANGAN tambahkan autoplay / loop */
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            zIndex: 0,
          }}
        />

        {/* Konten hero — selalu DI ATAS video */}
        <div style={{ position: "relative", zIndex: 1, height: "100%" }}>
          {children}
        </div>
      </div>
    </section>
  );
}
