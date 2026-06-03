// landing.jsx — hero with GSAP scroll-triggered video background. Exposes window.Landing
const { useRef: lUseRef, useEffect: lUseEffect } = React;

/* ════════════════════════════════════════════════════════════════════════
   PENGATURAN EFEK VIDEO SCROLL  ·  ubah angka di sini saja
   ──────────────────────────────────────────────────────────────────────
   VIDEO_SRC        : lokasi file video.
   POSTER_SRC       : gambar diam (poster) — dipakai sebagai fallback di mobile,
                      saat prefers-reduced-motion, atau sebelum video siap.
   SCROLL_TRACK_VH  : tinggi "rel" scroll dalam % tinggi layar.
                      Makin BESAR → makin PANJANG jarak scroll → video terasa
                      makin LAMBAT (butuh lebih banyak scroll untuk selesai).
   SCRUB_SMOOTHING  : kehalusan. 0 = video menempel ketat pada scroll;
                      makin besar (mis. 1) → makin halus / "mengejar" scroll.
   CALM_START       : pada progres scroll berapa (0–1) hero mulai "menenang":
                      gerak meredup menjelang asesmen. 0.6 = mulai di 60% rel.
   MOBILE_MAX_PX    : lebar layar (px) ke bawah dianggap mobile → pakai poster
                      diam, video tidak dipaksa (hemat data & baterai).
   ════════════════════════════════════════════════════════════════════════ */
const VIDEO_SRC       = "assets/scroll-video.mp4";
const POSTER_SRC      = "assets/hero-poster.png";
const SCROLL_TRACK_VH = 320;
const SCRUB_SMOOTHING = 0.6;
const CALM_START      = 0.6;
const MOBILE_MAX_PX   = 640;

function Landing({ onStart }) {
  const trackRef = lUseRef(null);
  const videoRef = lUseRef(null);
  const stageRef = lUseRef(null);
  const cueRef   = lUseRef(null);

  lUseEffect(() => {
    const gsap = window.gsap, ST = window.ScrollTrigger;
    if (!gsap || !ST) return;
    gsap.registerPlugin(ST);

    const reduced = window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isMobile = window.matchMedia &&
      window.matchMedia(`(max-width: ${MOBILE_MAX_PX}px)`).matches;
    const video = videoRef.current;
    const track = trackRef.current;
    const stage = stageRef.current;

    // ── FALLBACK: mobile atau reduced-motion → tampilkan poster diam, lewati scrub.
    if (reduced || isMobile) {
      if (video) video.style.display = "none";
      return; // poster (di belakang) tetap terlihat; tidak ada gerak.
    }

    video.src = VIDEO_SRC;
    video.pause();

    let tl, fellBack = false, lastCT = 0, stuck = 0;
    const goAmbient = () => {
      if (fellBack) return; fellBack = true;
      if (tl && tl.scrollTrigger) tl.scrollTrigger.disable();
      video.loop = true; video.play().catch(() => {});
    };
    const build = () => {
      if (!video.duration || isNaN(video.duration)) return;
      tl = gsap.timeline({
        scrollTrigger: {
          trigger: track,
          start: "top top",
          end: "bottom bottom",
          scrub: reduced ? true : SCRUB_SMOOTHING, // ← scrub: video mengikuti posisi scroll
          onLeave:     () => { if (!fellBack) video.pause(); }, // berhenti saat scroll keluar (bawah)
          onLeaveBack: () => { if (!fellBack) video.pause(); }, // berhenti saat scroll keluar (atas)
          onUpdate: (self) => {
            // Pengaman: bila lingkungan tak bisa "seek" (video diam padahal scroll
            // bergerak cepat), beralih ke mode ambient (loop) agar tidak terlihat macet.
            if (fellBack) return;
            if (Math.abs(video.currentTime - lastCT) < 0.001 && Math.abs(self.getVelocity()) > 60) {
              if (++stuck > 14) goAmbient();
            } else stuck = 0;
            lastCT = video.currentTime;
          },
        },
      });
      // Inti efek: putar video dari detik 0 → akhir, dipetakan ke progres scroll.
      tl.fromTo(video, { currentTime: 0 },
        { currentTime: video.duration, ease: "none" }, 0);
      // Petunjuk "gulir" memudar di 12% awal.
      if (cueRef.current)
        tl.to(cueRef.current, { autoAlpha: 0, ease: "none", duration: 0.12 }, 0);
      // "Menenang": menjelang asesmen, gerak diredam — video & skala memudar pelan,
      // scrim menggelap, agar transisi ke form terasa tenang.
      if (stage)
        tl.to(stage, { opacity: 0.55, scale: 0.985, ease: "power1.in",
          duration: 1 - CALM_START }, CALM_START);
      ST.refresh();
    };

    if (video.readyState >= 1) build();
    else video.addEventListener("loadedmetadata", build, { once: true });

    return () => {
      if (tl) { tl.scrollTrigger && tl.scrollTrigger.kill(); tl.kill(); }
      video.removeEventListener("loadedmetadata", build);
    };
  }, []);

  return (
    // ── REL SCROLL: tinggi inilah yang menentukan jarak scrub video ──
    React.createElement("div", { ref: trackRef, className: "relative", style: { height: SCROLL_TRACK_VH + "vh" } },
      // ── PANGGUNG STICKY: tetap di tengah layar selama rel ini diakses ──
      React.createElement("div", { ref: stageRef, className: "sticky top-0 h-[100svh] overflow-hidden flex flex-col" },

        // poster diam di paling belakang (fallback mobile / reduced-motion / pra-muat)
        React.createElement("img", {
          src: POSTER_SRC, alt: "", "aria-hidden": "true",
          className: "absolute inset-0 w-full h-full object-cover",
          style: { transform: "scale(1.06)" },
        }),
        // video background (sticky/center, menutup layar)
        React.createElement("video", {
          ref: videoRef, muted: true, playsInline: true,
          preload: "auto", poster: POSTER_SRC, "aria-hidden": "true",
          className: "absolute inset-0 w-full h-full object-cover",
          style: { transform: "scale(1.06)" },
        }),
        // scrim agar teks terbaca di atas video
        React.createElement("div", { className: "absolute inset-0", style: {
          background: "radial-gradient(125% 95% at 50% 32%, rgba(11,12,15,0.45) 0%, rgba(11,12,15,0.78) 62%, #0b0c0f 100%)" } }),

        // header
        React.createElement("header", { className: "relative z-10 px-6 sm:px-10 pt-7 flex items-center justify-between" },
          React.createElement("div", { className: "flex items-center gap-2.5" },
            React.createElement("div", { className: "w-8 h-8 rounded-lg bg-white/[0.06] border border-white/10 grid place-items-center backdrop-blur-sm" },
              React.createElement(Icon, { name: "smartphone", size: 17, className: "text-zinc-300" })),
            React.createElement("span", { className: "font-mono text-sm tracking-tight text-zinc-300" }, "sinyal."),
          ),
          React.createElement("span", { className: "hidden sm:flex items-center gap-1.5 text-xs text-zinc-500 font-mono" },
            React.createElement("span", { className: "w-1.5 h-1.5 rounded-full bg-emerald-400/80" }), "model demo · v0.1")
        ),

        // centered hero (tetap terlihat; video bermain di belakangnya)
        React.createElement("main", { className: "relative z-10 flex-1 flex flex-col items-center justify-center text-center px-6" },
          React.createElement("div", { className: "inline-flex items-center gap-2 px-3 py-1.5 mb-8 rounded-full border border-white/10 bg-white/[0.04] backdrop-blur-sm text-xs text-zinc-400" },
            React.createElement(Icon, { name: "sparkles", size: 13, className: "text-zinc-300" }),
            "Refleksi hubunganmu dengan layar"
          ),
          React.createElement("h1", { className: "text-[clamp(2.4rem,7vw,4.75rem)] font-semibold leading-[1.02] tracking-[-0.03em] text-balance max-w-4xl" },
            "Seberapa lekat kamu ",
            React.createElement("span", { className: "text-zinc-500" }, "dengan ponselmu?")
          ),
          React.createElement("p", { className: "mt-6 max-w-xl text-lg leading-relaxed text-zinc-400 text-pretty" },
            "Jawab 19 pertanyaan singkat tentang pemakaian HP dan keseharianmu. Dapatkan indeks ketergantungan 1–10, faktor pendorongnya, dan langkah kecil untuk menyeimbangkan."
          ),
          React.createElement("div", { className: "mt-10 flex flex-col items-center gap-5" },
            React.createElement(Button, { variant: "primary", size: "lg", iconRight: "arrowRight", onClick: onStart }, "Mulai Tes"),
            React.createElement("span", { className: "text-xs text-zinc-500 font-mono" }, "± 2 menit · tanpa login · tanpa data tersimpan")
          ),

          React.createElement("div", { className: "mt-14 grid grid-cols-3 gap-px max-w-lg w-full rounded-2xl overflow-hidden border border-white/10 bg-white/[0.06] backdrop-blur-sm" },
            [["19", "faktor dinilai"], ["1–10", "skala indeks"], ["0", "data dikirim"]].map(([n, l]) =>
              React.createElement("div", { key: l, className: "bg-[#0b0c0f]/55 px-4 py-5" },
                React.createElement("div", { className: "font-mono text-2xl text-white tabular-nums" }, n),
                React.createElement("div", { className: "text-[11px] text-zinc-500 mt-1" }, l)
              )
            )
          )
        ),

        // scroll cue (memudar saat mulai scroll)
        React.createElement("div", { ref: cueRef, className: "relative z-10 pb-7 flex flex-col items-center gap-2 text-zinc-500" },
          React.createElement("span", { className: "font-mono text-[11px] tracking-wide" }, "gulir untuk memutar"),
          React.createElement(Icon, { name: "chevronDown", size: 16, className: "animate-bounce" })
        )
      )
    )
  );
}

window.Landing = Landing;
