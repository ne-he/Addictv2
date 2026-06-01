"""Tests for the model serving layer (predict, clip, SHAP explain)."""

from __future__ import annotations

import pandas as pd
import pytest

from addiction_predictor import config


def test_feature_order_len(model):
    assert len(model.feature_order) == 33


def test_predict_within_bounds(model, sample_input):
    pred = model.predict(sample_input)
    assert config.PRED_MIN <= pred <= config.PRED_MAX


def test_prediction_is_clipped_high(model, sample_input):
    sample_input.update(
        Daily_Usage_Hours=24.0,
        Sleep_Hours=0.0,
        Phone_Checks_Per_Day=500,
        Apps_Used_Daily=100,
        Anxiety_Level=10,
        Depression_Level=10,
        Self_Esteem=0,
    )
    pred = model.predict(sample_input)
    assert pred <= config.PRED_MAX


def test_explain_returns_top_k(model, sample_input):
    pred, drivers = model.explain(sample_input, top_k=5)
    assert len(drivers) == 5
    assert config.PRED_MIN <= pred <= config.PRED_MAX
    for d in drivers:
        assert d.direction in {"increases", "decreases"}
        assert d.feature in model.feature_order
        assert d.human_label  # never a blank label


def test_explain_drivers_sorted_by_magnitude(model, sample_input):
    _pred, drivers = model.explain(sample_input, top_k=6)
    mags = [abs(d.contribution) for d in drivers]
    assert mags == sorted(mags, reverse=True)


def test_predict_batch(model, sample_input):
    frame = pd.DataFrame([sample_input, sample_input])
    preds = model.predict_batch(frame)
    assert len(preds) == 2
    assert all(config.PRED_MIN <= p <= config.PRED_MAX for p in preds)


def test_explain_batch_matches_single(model, sample_input):
    single_pred, _ = model.explain(sample_input)
    (batch_pred, _), = model.explain_batch(pd.DataFrame([sample_input]))
    assert batch_pred == pytest.approx(single_pred, rel=1e-6)
