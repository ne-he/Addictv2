// assessment.jsx — 5-step wizard. Exposes window.Assessment
const { useState: aUseState, useMemo: aUseMemo } = React;

const STEP_ACCENT = "#cbd5e1"; // calm slate accent across the form (one accent at a time)

function StepDots({ steps, current }) {
  return React.createElement("div", { className: "flex items-center gap-2" },
    steps.map((s, i) =>
      React.createElement("div", { key: s.id,
        className: `h-1 rounded-full transition-all duration-500 ${i < current ? "bg-white/70 w-6" : i === current ? "bg-white w-9" : "bg-white/15 w-6"}` })
    )
  );
}

function Assessment({ values, setValues, onSubmit, onBack }) {
  const [step, setStep] = aUseState(0);
  const { STEPS, FIELDS } = SCORING;
  const stepDef = STEPS[step];

  const setVal = (k, v) => setValues((prev) => ({ ...prev, [k]: v }));

  // live rule: social + gaming + education <= 24
  const activitySum = values.Time_on_Social_Media + values.Time_on_Gaming + values.Time_on_Education;
  const remaining = Math.round((24 - activitySum) * 10) / 10;
  const overflow = remaining < 0;
  const blocked = step === 2 && overflow;

  const next = () => { if (blocked) return; if (step < STEPS.length - 1) setStep(step + 1); else onSubmit(); };
  const prev = () => { if (step > 0) setStep(step - 1); else onBack(); };

  const renderField = (k) => {
    const meta = FIELDS[k];
    if (meta.type === "segment")
      return React.createElement(Segmented, { key: k, label: meta.label, options: meta.options, optionLabels: meta.optionLabels, value: values[k], onChange: (v) => setVal(k, v), accent: STEP_ACCENT });
    if (meta.type === "select")
      return React.createElement(SelectChips, { key: k, label: meta.label, options: meta.options, optionLabels: meta.optionLabels, value: values[k], onChange: (v) => setVal(k, v), accent: STEP_ACCENT });
    return React.createElement(Field, { key: k, fieldKey: k, meta, value: values[k], onChange: (v) => setVal(k, v), accent: STEP_ACCENT });
  };

  return React.createElement("div", { className: "min-h-[100svh] flex flex-col px-5 sm:px-6 py-6" },
    // top bar
    React.createElement("div", { className: "max-w-xl w-full mx-auto" },
      React.createElement("div", { className: "flex items-center justify-between mb-4" },
        React.createElement(Button, { variant: "quiet", size: "sm", icon: "arrowLeft", onClick: prev }, step === 0 ? "Keluar" : "Kembali"),
        React.createElement("span", { className: "font-mono text-xs text-zinc-500" }, `Langkah ${step + 1} / ${STEPS.length}`)
      ),
      React.createElement(StepDots, { steps: STEPS, current: step })
    ),

    // card
    React.createElement("div", { className: "flex-1 flex items-center justify-center py-8" },
      React.createElement("div", { key: step, className: "om-fade max-w-xl w-full rounded-3xl border border-white/10 bg-white/[0.025] backdrop-blur-sm p-6 sm:p-8" },
        React.createElement("div", { className: "flex items-center gap-3 mb-6" },
          React.createElement("div", { className: "w-10 h-10 rounded-xl bg-white/[0.06] border border-white/10 grid place-items-center" },
            React.createElement(Icon, { name: stepDef.icon, size: 19, className: "text-zinc-200" })),
          React.createElement("div", null,
            React.createElement("h2", { className: "text-lg font-semibold text-white leading-tight" }, stepDef.title),
            React.createElement("p", { className: "text-sm text-zinc-500" }, stepDef.subtitle)
          )
        ),
        React.createElement("div", { className: "space-y-6" }, stepDef.fields.map(renderField)),

        // live remaining-hours meter (step 3)
        step === 2 && React.createElement("div", { className: `mt-6 rounded-2xl border p-4 transition-colors duration-300 ${overflow ? "border-[#FF4500]/40 bg-[#FF4500]/[0.07]" : "border-white/10 bg-white/[0.03]"}` },
          React.createElement("div", { className: "flex items-center justify-between text-sm" },
            React.createElement("span", { className: overflow ? "text-[#ff7a4d] font-medium" : "text-zinc-300" }, "Sisa jam hari ini"),
            React.createElement("span", { className: `font-mono tabular-nums ${overflow ? "text-[#ff7a4d]" : "text-zinc-200"}` }, `${remaining} jam`)
          ),
          React.createElement("div", { className: "mt-2.5 h-2 rounded-full bg-white/[0.06] overflow-hidden" },
            React.createElement("div", { className: "h-full rounded-full transition-all duration-300",
              style: { width: `${SCORING.clamp((activitySum / 24) * 100, 0, 100)}%`, background: overflow ? "#FF4500" : STEP_ACCENT } })
          ),
          overflow && React.createElement("p", { className: "mt-2.5 text-xs text-[#ff7a4d]" },
            "Medsos + Game + Edukasi melebihi 24 jam. Kurangi dulu sebelum lanjut.")
        )
      )
    ),

    // footer nav
    React.createElement("div", { className: "max-w-xl w-full mx-auto flex items-center justify-between gap-4" },
      React.createElement(Button, { variant: "ghost", icon: "arrowLeft", onClick: prev }, "Kembali"),
      React.createElement(Button, { variant: "primary", iconRight: step === STEPS.length - 1 ? "check" : "arrowRight", onClick: next, disabled: blocked },
        step === STEPS.length - 1 ? "Lihat Hasil" : "Lanjut")
    )
  );
}

window.Assessment = Assessment;
