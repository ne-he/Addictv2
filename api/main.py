"""FastAPI service exposing the phone-addiction predictor.

A thin HTTP adapter over the shared core package. All ML logic lives in
`addiction_predictor`; this module only wires it to JSON endpoints.

Run locally:
    PYTHONPATH=src uvicorn api.main:app --reload

Endpoints:
    GET  /health         liveness + model/version info
    GET  /model-card     full model card (metrics, caveats, data hash)
    GET  /features       feature specs, so a frontend can build the form + validate
    POST /predict        one profile  -> PredictionResult (score, drivers, advice)
    POST /predict/batch  many profiles -> BatchPredictionResult
"""

from __future__ import annotations

import os
from contextlib import asynccontextmanager
from dataclasses import asdict

import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from addiction_predictor import __version__, config, interpret
from addiction_predictor.model import AddictionModel
from addiction_predictor.schema import (
    AddictionInput,
    BatchPredictionResult,
    PredictionResult,
)

MAX_BATCH = 1000  # guard against oversized payloads

# Process-wide singletons populated on startup.
_state: dict[str, object] = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load the model once at startup; release it on shutdown."""
    _state["model"] = AddictionModel.load()
    yield
    _state.clear()


app = FastAPI(
    title="Phone Addiction Predictor API",
    version=__version__,
    description=(
        "Predicts a smartphone-addiction level (1-10) from a usage + wellbeing "
        "profile, with SHAP-based drivers and personalised recommendations. "
        "Statistical estimate only - NOT a medical or psychological diagnosis."
    ),
    lifespan=lifespan,
)

# A separate frontend (e.g. Next.js) will call this API from another origin.
_origins = os.getenv("CORS_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in _origins],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


def get_model() -> AddictionModel:
    model = _state.get("model")
    if model is None:  # pragma: no cover - only if startup failed
        raise HTTPException(status_code=503, detail="Model is not loaded.")
    return model  # type: ignore[return-value]


@app.get("/health", tags=["meta"])
def health() -> dict:
    """Liveness probe plus a one-line summary of the loaded model."""
    model = get_model()
    test_metrics = model.model_card.get("metrics", {}).get("test", {})
    return {
        "status": "ok",
        "version": __version__,
        "model_loaded": True,
        "n_features": len(model.feature_order),
        "test_metrics": test_metrics,
    }


@app.get("/model-card", tags=["meta"])
def model_card() -> dict:
    """Return the full model card: metrics, data hash, versions, caveats."""
    return get_model().model_card


@app.get("/features", tags=["meta"])
def features() -> dict:
    """Feature specs so a frontend can render the form and validate client-side."""
    return {
        "numeric": [asdict(f) for f in config.NUMERIC_FEATURES],
        "categorical": [asdict(c) for c in config.CATEGORICAL_FEATURES],
        "activity_time_fields": list(config.ACTIVITY_TIME_FIELDS),
        "prediction_range": [config.PRED_MIN, config.PRED_MAX],
        "thresholds": {"low": config.THRESHOLD_LOW, "high": config.THRESHOLD_HIGH},
    }


@app.post("/predict", response_model=PredictionResult, tags=["predict"])
def predict(payload: AddictionInput) -> PredictionResult:
    """Score a single profile and return level, category, drivers, and advice."""
    model = get_model()
    level, drivers = model.explain(payload.model_dump())
    return interpret.build_result(level, drivers)


@app.post("/predict/batch", response_model=BatchPredictionResult, tags=["predict"])
def predict_batch(payload: list[AddictionInput]) -> BatchPredictionResult:
    """Score many profiles in one request (single SHAP pass over the frame)."""
    if not payload:
        raise HTTPException(status_code=422, detail="Batch payload is empty.")
    if len(payload) > MAX_BATCH:
        raise HTTPException(
            status_code=413,
            detail=f"Batch too large ({len(payload)} > {MAX_BATCH}).",
        )
    model = get_model()
    frame = pd.DataFrame([p.model_dump() for p in payload])
    scored = model.explain_batch(frame)
    results = [interpret.build_result(level, drivers) for level, drivers in scored]
    return BatchPredictionResult(count=len(results), results=results)
