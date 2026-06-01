"""Tests for the pydantic input model and its cross-field validation."""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from addiction_predictor.schema import AddictionInput


def test_valid_default_input(sample_input):
    obj = AddictionInput(**sample_input)
    assert 1 <= obj.Age <= 100


def test_age_out_of_range_rejected(sample_input):
    sample_input["Age"] = 999
    with pytest.raises(ValidationError):
        AddictionInput(**sample_input)


def test_negative_usage_rejected(sample_input):
    sample_input["Daily_Usage_Hours"] = -1.0
    with pytest.raises(ValidationError):
        AddictionInput(**sample_input)


def test_invalid_gender_literal_rejected(sample_input):
    sample_input["Gender"] = "Alien"
    with pytest.raises(ValidationError):
        AddictionInput(**sample_input)


def test_activity_budget_exceeded_rejected(sample_input):
    sample_input.update(
        Time_on_Social_Media=10.0, Time_on_Gaming=10.0, Time_on_Education=10.0
    )
    with pytest.raises(ValidationError) as exc:
        AddictionInput(**sample_input)
    assert "24 jam" in str(exc.value)


def test_activity_budget_exactly_24_ok(sample_input):
    sample_input.update(
        Time_on_Social_Media=12.0, Time_on_Gaming=8.0, Time_on_Education=4.0
    )
    obj = AddictionInput(**sample_input)
    assert obj.Time_on_Social_Media == 12.0
