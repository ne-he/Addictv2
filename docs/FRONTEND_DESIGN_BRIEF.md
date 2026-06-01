# Frontend Design Brief — Phone Addiction Predictor

A brief for designing the **web frontend** that sits on top of the existing
FastAPI backend in this repo. It specifies *structure, features, data contract,
and interaction* — and gives an opinionated visual direction (including the
"video background" question). Layout, exact colours, and illustration style are
left to the designer. The last section is a condensed **paste-ready prompt** for
a design AI (v0 / Claude / Lovable / etc.).

> The backend is done: a FastAPI service exposing `/predict`, `/predict/batch`,
> `/features`, `/model-card`, `/health`. The frontend's job is to make filling a
> profile and reading the result feel effortless, trustworthy, and a little
> memorable — without ever pretending to be a medical diagnosis.

---

## 1. What this product is

A user enters their phone-usage + wellbeing profile (19 fields). The app returns
a **smartphone-addiction score (1–10)**, a **category** (low / medium / high),
a plain-language **interpretation**, **personalised recommendations**, and the
**top factors (SHAP)** that pushed the score up or down.

- **Audience:** general public (students, young adults). Casual, not clinical.
- **Tone:** calm, honest, encouraging — *reflection tool, not a verdict*.
- **Hard constraint:** an ethical disclaimer ("statistical estimate, NOT a
  medical/psychological diagnosis; dataset is likely synthetic") must be visible
  on the landing and beside every result. Never use alarmist language.
- **Language:** UI copy is **Indonesian** (labels come from the API, see §4).

---

## 2. Recommended stack (matches the rest of the project)

- **Next.js (App Router)** — SSR landing page (recruiter/Google-readable), client
  components for the interactive parts.
- **Talk to the API via Next.js Route Handlers** that proxy to FastAPI (keeps the
  API URL server-side, avoids prod CORS). CORS is already enabled on the backend
  for local dev.
- Suggested libs: **Tailwind + shadcn/ui** (components), **react-hook-form + zod**
  (form + validation mirroring the backend), **TanStack Query** (fetch/cache),
  **Recharts / visx** (gauge + driver chart), **framer-motion** (transitions).
- The existing **Streamlit app stays** as the quick internal demo; this Next.js
  app is the polished public face.

---

## 3. App structure (routes)

| Route      | Purpose | Key elements |
| ---------- | ------- | ------------ |
| `/`        | Landing / hero | One-line pitch, what you'll get, **Start** CTA, disclaimer, ambient hero visual (see §6) |
| `/assess`  | The assessment | 5-step wizard (grouped, progress bar), live validation, 24h activity meter |
| `/result`  | The outcome | Score gauge, category verdict, interpretation, **driver chart**, recommendations, **What-if** panel, disclaimer, share/export |
| `/about`   | Transparency | How it works, pipeline explained, model-card data (metrics, **honest caveats**) from `/model-card` |
| `/batch`   | *(optional, power-user)* | CSV upload → table of scored rows → download; uses `/predict/batch` |

`/assess` → `/result` can be one continuous flow (no full reload) or separate
routes; designer's choice. Keep state so "edit my answers" is one click.

---

## 4. The data contract (build the form to THIS)

Fetch field specs at runtime from **`GET /features`** so the form never drifts
from the backend. Shape:

```jsonc
{
  "numeric": [ { "name","label","minimum","maximum","default","step","is_int" }, ... ], // 17
  "categorical": [ { "name","label","options":[...],"default" }, ... ],                 // 2
  "activity_time_fields": ["Time_on_Social_Media","Time_on_Gaming","Time_on_Education"],
  "prediction_range": [1.0, 10.0],
  "thresholds": { "low": 4.0, "high": 7.0 }
}
```

**The 19 inputs** (label = Indonesian text shown to the user), grouped into 5
sensible wizard steps:

1. **Demografi** — `Age` (Usia, 1–100), `Gender` (Male/Female/Other)
2. **Pemakaian HP** — `Daily_Usage_Hours`, `Weekend_Usage_Hours`,
   `Phone_Checks_Per_Day` (0–500), `Apps_Used_Daily` (0–100),
   `Phone_Usage_Purpose` (Browsing/Education/Gaming/Social Media/Other)
3. **Aktivitas (jam/hari)** — `Time_on_Social_Media`, `Time_on_Gaming`,
   `Time_on_Education`, `Screen_Time_Before_Bed`, `Exercise_Hours`
4. **Tidur & Kesehatan Mental** — `Sleep_Hours`, `Anxiety_Level` (0–10),
   `Depression_Level` (0–10), `Self_Esteem` (0–10),
   `Interllectual_Performance` (0–100)
5. **Interaksi Sosial** — `Social_Interactions` (0–20), `Family_Communication` (0–20)

**Cross-field rule (must enforce client-side too):**
`Time_on_Social_Media + Time_on_Gaming + Time_on_Education ≤ 24`. Show this as a
live **"sisa jam hari ini"** meter on step 3; block submit if exceeded (the API
returns HTTP 422 otherwise).

**Output** from `POST /predict` (one profile) — design the result screen to this:

```jsonc
{
  "addiction_level": 7.7,                 // float, 1.0–10.0
  "category": "high",                     // "low" | "medium" | "high"
  "category_label": "Tinggi",             // Rendah | Sedang | Tinggi
  "interpretation": "….",                 // one paragraph
  "recommendations": ["…", "…"],          // 1–4 bullet actions
  "drivers": [                            // top factors, largest |contribution| first
    { "feature":"Daily_Usage_Hours", "human_label":"Jam pakai HP / hari",
      "contribution": 0.42, "direction": "increases" },  // + raises score, − lowers it
    ...
  ]
}
```

Category cutoffs: **low** `< 4.0`, **medium** `4.0–<7.0`, **high** `≥ 7.0`.

---

## 5. Feature / component inventory

**Form**
- `FeatureField` — renders a slider+number for numeric (respect `is_int`,
  `min/max/step`) or a segmented control / select for categorical. Driven by
  `/features` so adding a backend field needs no redesign.
- `WizardStepper` + progress; "back/next"; per-step validation.
- `ActivityBudgetMeter` — visualises the 24h rule as you type (turns red past 24h).

**Result**
- `ScoreGauge` — 1–10 arc/radial gauge, needle/fill coloured by category
  (green→amber→red). Animate a count-up on reveal.
- `CategoryBadge` — Rendah / Sedang / Tinggi, colour + **text** (never colour
  alone — accessibility).
- `DriverChart` — **diverging horizontal bars**: orange bars = factors that
  *raise* the score, green = factors that *lower* it; sorted by magnitude.
  Tooltip shows the signed contribution in score units.
- `RecommendationCard` — icon + action text, one per recommendation.
- `WhatIfPanel` *(highlight feature)* — sliders bound to the top 3–4 drivers;
  dragging re-calls `/predict` (debounced) and re-animates the gauge live. This
  shows the model is interactive and fast — a great portfolio moment.
- `DisclaimerBanner` — persistent, calm, non-alarmist.

**About**
- `ModelCardViewer` — renders `/model-card`: metrics table, library versions,
  and the *caveats* verbatim (the honesty is a selling point, not a footnote).

---

## 6. Visual direction — and the "video background" question

**My recommendation, with reasoning (this is the part you asked me to think
about):**

**Do NOT reuse the particle-face videos here.** Those belong to your *personal
portfolio* (Saturn Protocol) — the subject there is *you*. On an addiction tool
the subject is the *user's behaviour*; your face on it would be confusing and
off-topic. Save those assets for the portfolio.

**Should there be a generated/video background at all? Partially — and tied to
the theme, not decoration.** A health/assessment tool lives or dies on feeling
*calm and trustworthy*; heavy motion behind a form or a result undermines that
(and hurts Lighthouse, mobile data, and motion-sensitive users — ironic for a
*digital-wellbeing* app). So:

- **Landing hero — yes, ambient + lightweight.** Use a **canvas/WebGL particle
  field** (drifting notification dots, app-icon glints, a faint network of
  connections) rather than a heavy MP4. It evokes "digital noise" on-theme, stays
  < a few hundred KB, and runs at 60fps. A short, *muted, compressed* video loop
  is acceptable **only** with a poster fallback, lazy-load, and a static gradient
  on mobile.
- **Assessment + Result — no background video/heavy motion.** Clean, dark,
  focused. Motion only as micro-interactions (gauge count-up, bars growing in,
  step transitions).
- **Narrative hook (optional but strong):** make the hero feel *slightly
  overstimulating* (lots of particles) — that's the problem — and have the UI
  visibly **calm down** the moment the assessment starts (fewer particles, more
  whitespace, slower motion). The design *enacts* the message. Recruiters
  remember that.
- **Always** honour `prefers-reduced-motion` (disable the field, show a still
  gradient).

**Palette / mood (suggested, flexible):**
- **Dark mode default** — easy on the eyes, on-theme (screen wellbeing), matches
  your aesthetic.
- **Risk-coded score:** green (low) → amber (medium) → red (high). Let your
  **Lava Orange (#FF4500)** be the *high-risk* accent — so the app quietly nods
  to your Saturn identity *without* copying the face.
- Generous whitespace, large legible type, one accent at a time. Think "Apple
  Screen Time / Google Digital Wellbeing, but with more personality."

---

## 7. Interaction & states

- **Live what-if** recompute via debounced `/predict` calls.
- **Client validation** mirrors the backend: ranges from `/features`, the 24h
  budget rule, categorical options. Inline errors; never let an invalid form hit
  submit. Still handle a 422 gracefully (toast) as a backstop.
- **Loading:** skeletons on the result screen; a subtle progress state on submit.
- **Empty/error:** friendly messages; a retry on network error.
- **Shareable result:** "download as image/PDF" and/or a copyable summary
  (no personal data is stored server-side — say so).

---

## 8. Fixed vs. free

**Fixed (must respect):**
- The 19 fields, their ranges, and the 24h activity rule (all from `/features`).
- The output contract in §4 and the category cutoffs (low `<4`, high `≥7`).
- The ethical disclaimer is prominent; never framed as medical diagnosis;
  non-alarmist copy.
- Accessible: keyboard-navigable, `prefers-reduced-motion`, colour never the
  only signal, ARIA on the gauge/chart.

**Free (designer's call):**
- Layout, exact palette, type, illustration/motion style, wizard-vs-single-page,
  hero treatment, copy voice (within "calm + honest").
- Performance target: Lighthouse ≥ 90 (matches your portfolio bar).

---

## 9. Paste-ready prompt for a design AI

> Design a responsive **Next.js (App Router) + Tailwind + shadcn/ui** frontend
> for a **Phone Addiction Predictor**. A user fills a 19-field usage/wellbeing
> profile and gets a 1–10 addiction score, a low/medium/high category, a
> plain-language interpretation, 1–4 personalised recommendations, and a chart of
> the top factors (signed SHAP contributions) that raised or lowered the score.
> UI copy is **Indonesian**.
>
> **Routes:** `/` landing hero, `/assess` 5-step wizard, `/result`, `/about`
> (transparency/model-card), optional `/batch` CSV upload.
>
> **Form** is driven by a `/features` JSON endpoint (numeric fields have
> name/label/min/max/default/step/is_int; 2 categorical fields with options).
> Group into 5 steps: Demografi; Pemakaian HP; Aktivitas (jam/hari); Tidur &
> Kesehatan Mental; Interaksi Sosial. Enforce a live rule:
> social + gaming + education hours ≤ 24, shown as a "remaining hours" meter.
>
> **Result screen:** an animated 1–10 **gauge** coloured green→amber→red by
> category; a **CategoryBadge** with text; a **diverging horizontal bar chart**
> of drivers (orange = raises score, green = lowers); recommendation cards; and a
> **"What-if" panel** with sliders on the top drivers that live-updates the score.
>
> **Visual direction:** dark mode, calm and trustworthy, data-forward. Hero may
> have a **lightweight canvas/WebGL particle background** evoking "digital noise"
> that **calms down** once the assessment starts (no heavy video; honour
> `prefers-reduced-motion`). Accent **Lava Orange #FF4500** for high-risk. Think
> "Apple Screen Time meets a sharp indie product." A persistent, non-alarmist
> disclaimer states this is a **statistical estimate, not a medical diagnosis**.
> Target Lighthouse ≥ 90, mobile-first, accessible (keyboard, ARIA, colour never
> the only signal).
>
> Deliver: landing hero, the 5-step form, and the result screen (with gauge +
> driver chart + what-if), in both desktop and mobile layouts.
