"""Streamlit demo UI for the phone-addiction predictor.

A thin presentation layer: it builds the input form from the config feature
specs, validates through the same pydantic model the API uses, and calls the
shared core (`AddictionModel` + `interpret`) directly - so the UI and the API
always agree. No ML logic lives here.

Run with:
    streamlit run app/streamlit_app.py
"""

from __future__ import annotations

import sys
from pathlib import Path

# Make the src/ package importable when run via `streamlit run` (no install needed).
_SRC = Path(__file__).resolve().parent.parent / "src"
if str(_SRC) not in sys.path:
    sys.path.insert(0, str(_SRC))

import altair as alt
import pandas as pd
import streamlit as st
from pydantic import ValidationError

from addiction_predictor import __version__, config, interpret
from addiction_predictor.model import AddictionModel
from addiction_predictor.schema import AddictionInput

# Logical groupings for the form (UI concern only). Any feature not listed here
# is rendered under "Lainnya", so this never breaks if config gains a feature.
_SECTIONS: dict[str, tuple[str, ...]] = {
    "Demografi": ("Age", "Gender"),
    "Pemakaian HP": (
        "Daily_Usage_Hours",
        "Weekend_Usage_Hours",
        "Phone_Checks_Per_Day",
        "Apps_Used_Daily",
        "Phone_Usage_Purpose",
    ),
    "Aktivitas (jam/hari)": (
        "Time_on_Social_Media",
        "Time_on_Gaming",
        "Time_on_Education",
        "Screen_Time_Before_Bed",
        "Exercise_Hours",
    ),
    "Tidur & Kesehatan Mental": (
        "Sleep_Hours",
        "Anxiety_Level",
        "Depression_Level",
        "Self_Esteem",
        "Interllectual_Performance",
    ),
    "Interaksi Sosial": ("Social_Interactions", "Family_Communication"),
}

_DISCLAIMER = (
    "Hasil ini adalah **estimasi statistik**, BUKAN diagnosis medis atau "
    "psikologis. Model dilatih pada data yang kemungkinan sintetis (R2 sangat "
    "tinggi), jadi gunakan sebagai bahan refleksi, bukan vonis."
)


@st.cache_resource(show_spinner="Memuat model...")
def _load_model() -> AddictionModel:
    return AddictionModel.load()


def _numeric_widget(spec: config.NumericFeature):
    if spec.is_int:
        return st.number_input(
            spec.label,
            min_value=int(spec.minimum),
            max_value=int(spec.maximum),
            value=int(spec.default),
            step=int(spec.step),
            key=spec.name,
        )
    return st.number_input(
        spec.label,
        min_value=float(spec.minimum),
        max_value=float(spec.maximum),
        value=float(spec.default),
        step=float(spec.step),
        key=spec.name,
    )


def _categorical_widget(spec: config.CategoricalFeature):
    options = list(spec.options)
    return st.selectbox(
        spec.label, options=options, index=options.index(spec.default), key=spec.name
    )


def _render_form() -> dict:
    """Render every feature grouped into sections; return the raw input dict."""
    numeric = {f.name: f for f in config.NUMERIC_FEATURES}
    categorical = {c.name: c for c in config.CATEGORICAL_FEATURES}
    values: dict = {}

    sections = dict(_SECTIONS)
    leftovers = [n for n in config.RAW_FEATURE_NAMES if n not in sum(_SECTIONS.values(), ())]
    if leftovers:
        sections["Lainnya"] = tuple(leftovers)

    for title, names in sections.items():
        present = [n for n in names if n in numeric or n in categorical]
        if not present:
            continue
        st.markdown(f"**{title}**")
        cols = st.columns(min(3, len(present)))
        for i, name in enumerate(present):
            with cols[i % len(cols)]:
                if name in numeric:
                    values[name] = _numeric_widget(numeric[name])
                else:
                    values[name] = _categorical_widget(categorical[name])
    return values


def _show_result(result, drivers) -> None:
    box = {"low": st.success, "medium": st.warning, "high": st.error}[result.category]

    c1, c2 = st.columns([1, 2])
    with c1:
        st.metric("Skor ketergantungan (1-10)", f"{result.addiction_level:.2f}")
    with c2:
        box(f"**{result.category_label}** - {result.interpretation}")

    st.subheader("Faktor pendorong (SHAP)")
    st.caption("Oranye = menaikkan skor, hijau = menurunkan. Nilai dalam satuan skor.")
    df = pd.DataFrame(
        {
            "Faktor": [d.human_label for d in drivers],
            "Kontribusi": [d.contribution for d in drivers],
            "Arah": [d.direction for d in drivers],
        }
    )
    chart = (
        alt.Chart(df)
        .mark_bar()
        .encode(
            x=alt.X("Kontribusi:Q", title="Kontribusi ke skor"),
            y=alt.Y("Faktor:N", sort="-x", title=None),
            color=alt.Color(
                "Arah:N",
                scale=alt.Scale(
                    domain=["increases", "decreases"], range=["#FF4500", "#2E8B57"]
                ),
                legend=None,
            ),
            tooltip=["Faktor", "Kontribusi", "Arah"],
        )
    )
    st.altair_chart(chart, use_container_width=True)

    st.subheader("Rekomendasi")
    for rec in result.recommendations:
        st.markdown(f"- {rec}")


def main() -> None:
    st.set_page_config(page_title="Phone Addiction Predictor", page_icon="📱")
    st.title("📱 Phone Addiction Predictor")
    st.caption(f"v{__version__} - CatBoost + SHAP - demo UI")
    st.info(_DISCLAIMER)

    model = _load_model()

    with st.form("profile"):
        values = _render_form()
        submitted = st.form_submit_button("Prediksi", use_container_width=True)

    if not submitted:
        return

    try:
        valid = AddictionInput(**values)
    except ValidationError as exc:
        st.error("Input tidak valid:")
        for err in exc.errors():
            st.write(f"- {err['msg']}")
        return

    level, drivers = model.explain(valid.model_dump())
    result = interpret.build_result(level, drivers)
    st.divider()
    _show_result(result, drivers)
    st.caption(_DISCLAIMER)


if __name__ == "__main__":
    main()
