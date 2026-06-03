// app.jsx — root: view state + transitions. Exposes window.App
const { useState: appUseState, useMemo: appUseMemo } = React;

function App() {
  const [view, setView] = appUseState("landing"); // landing | assessment | result
  const [values, setValues] = appUseState({ ...SCORING.DEFAULTS });
  const [result, setResult] = appUseState(null);

  const calm = view === "landing" ? 0 : 1;

  const start = () => { setView("assessment"); window.scrollTo(0, 0); };
  const submit = () => { setResult(SCORING.computeResult(values)); setView("result"); window.scrollTo(0, 0); };
  const restart = () => { setValues({ ...SCORING.DEFAULTS }); setResult(null); setView("landing"); window.scrollTo(0, 0); };
  const backToLanding = () => { setView("landing"); window.scrollTo(0, 0); };

  return React.createElement(React.Fragment, null,
    view !== "landing" && React.createElement(Background, { calm }),
    React.createElement("div", { key: view, className: "om-view" },
      view === "landing" && React.createElement(Landing, { onStart: start }),
      view === "assessment" && React.createElement(Assessment, { values, setValues, onSubmit: submit, onBack: backToLanding }),
      view === "result" && result && React.createElement(Result, { values, result, onRestart: restart })
    )
  );
}

window.App = App;

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(React.createElement(App));
