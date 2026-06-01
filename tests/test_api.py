"""Tests for the FastAPI HTTP layer."""

from __future__ import annotations


def test_health(client):
    body = client.get("/health").json()
    assert body["status"] == "ok"
    assert body["n_features"] == 33
    assert "r2" in body["test_metrics"]


def test_features(client):
    body = client.get("/features").json()
    assert len(body["numeric"]) == 17
    assert len(body["categorical"]) == 2
    assert body["thresholds"]["high"] == 7.0


def test_model_card(client):
    body = client.get("/model-card").json()
    assert body["algorithm"] == "CatBoostRegressor"
    assert "caveats" in body


def test_predict_ok(client, sample_input):
    resp = client.post("/predict", json=sample_input)
    assert resp.status_code == 200
    body = resp.json()
    assert 1.0 <= body["addiction_level"] <= 10.0
    assert body["category"] in {"low", "medium", "high"}
    assert body["drivers"]
    assert body["recommendations"]


def test_predict_validation_error(client, sample_input):
    sample_input.update(
        Time_on_Social_Media=20.0, Time_on_Gaming=20.0, Time_on_Education=20.0
    )
    resp = client.post("/predict", json=sample_input)
    assert resp.status_code == 422


def test_predict_out_of_range(client, sample_input):
    sample_input["Age"] = 999
    resp = client.post("/predict", json=sample_input)
    assert resp.status_code == 422


def test_batch_ok(client, sample_input):
    resp = client.post("/predict/batch", json=[sample_input, sample_input])
    assert resp.status_code == 200
    body = resp.json()
    assert body["count"] == 2
    assert len(body["results"]) == 2


def test_batch_empty_rejected(client):
    resp = client.post("/predict/batch", json=[])
    assert resp.status_code == 422
