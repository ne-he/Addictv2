"""Tests for the interpretation layer (category, recommendations)."""

from __future__ import annotations

from addiction_predictor import config, interpret
from addiction_predictor.schema import FeatureDriver


def _driver(feature, contribution):
    return FeatureDriver(
        feature=feature,
        human_label=config.human_label(feature),
        contribution=contribution,
        direction="increases" if contribution > 0 else "decreases",
    )


def test_categorize_boundaries():
    assert interpret.categorize(config.THRESHOLD_LOW - 0.01) == "low"
    assert interpret.categorize(config.THRESHOLD_LOW) == "medium"
    assert interpret.categorize(config.THRESHOLD_HIGH - 0.01) == "medium"
    assert interpret.categorize(config.THRESHOLD_HIGH) == "high"


def test_recommend_dedupes_shared_advice():
    # Daily_Usage_Hours and usage_to_sleep_ratio map to the SAME advice string.
    drivers = [_driver("Daily_Usage_Hours", 0.5), _driver("usage_to_sleep_ratio", 0.4)]
    recs = interpret.recommend("high", drivers)
    assert len(recs) == 1


def test_recommend_falls_back_to_generic_when_no_up_driver():
    drivers = [_driver("Sleep_Hours", -0.6), _driver("Exercise_Hours", -0.3)]
    recs = interpret.recommend("low", drivers)
    assert recs == [interpret._GENERIC_RECS["low"]]


def test_recommend_respects_max():
    drivers = [
        _driver("Daily_Usage_Hours", 0.9),
        _driver("Phone_Checks_Per_Day", 0.8),
        _driver("Time_on_Gaming", 0.7),
        _driver("Time_on_Social_Media", 0.6),
        _driver("Exercise_Hours", 0.5),
    ]
    recs = interpret.recommend("high", drivers, max_recs=3)
    assert len(recs) == 3


def test_build_result_shape():
    drivers = [_driver("Daily_Usage_Hours", 0.9)]
    result = interpret.build_result(8.5, drivers)
    assert result.category == "high"
    assert result.category_label == "Tinggi"
    assert result.addiction_level == 8.5
    assert result.drivers == drivers
    assert result.recommendations
