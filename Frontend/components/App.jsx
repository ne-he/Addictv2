// App.jsx — root: view state + transitions (landing → assessment → result).
// This is the single client-side state machine; page.js mounts it at "/".
"use client";

import { useState } from "react";
import { DEFAULTS, predict } from "@/lib/scoring";
import { Background } from "./Background";
import { Landing } from "./Landing";
import { Assessment } from "./Assessment";
import { Result } from "./Result";

export default function App() {
  const [view, setView] = useState("landing"); // landing | assessment | result
  const [values, setValues] = useState({ ...DEFAULTS });
  const [result, setResult] = useState(null);

  const calm = view === "landing" ? 0 : 1;

  const start = () => { setView("assessment"); window.scrollTo(0, 0); };
  const submit = async () => {
    // predict() is the ONE swap point — local mock today, your API later.
    const r = await predict(values);
    setResult(r);
    setView("result");
    window.scrollTo(0, 0);
  };
  const restart = () => { setValues({ ...DEFAULTS }); setResult(null); setView("landing"); window.scrollTo(0, 0); };
  const backToLanding = () => { setView("landing"); window.scrollTo(0, 0); };

  return (
    <>
      {view !== "landing" && <Background calm={calm} />}
      <div key={view} className="om-view">
        {view === "landing" && <Landing onStart={start} />}
        {view === "assessment" && (
          <Assessment values={values} setValues={setValues} onSubmit={submit} onBack={backToLanding} />
        )}
        {view === "result" && result && <Result values={values} result={result} onRestart={restart} />}
      </div>
    </>
  );
}
