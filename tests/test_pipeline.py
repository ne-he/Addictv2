"""Tests for the shared Preprocessor (the single source of truth)."""

from __future__ import annotations

import numpy as np
import pandas as pd
import pytest

from addiction_predictor import config
from addiction_predictor.pipeline import Preprocessor


def test_feature_count_is_33(trained_split):
    assert len(trained_split["pp"].feature_order) == 33
    assert list(trained_split["x_tr"].columns) == trained_split["pp"].feature_order


def test_no_phantom_gender_nan_column(trained_split):
    cols = trained_split["pp"].feature_order
    assert "Gender_Nan" not in cols
    assert "Gender_Female" in cols and "Gender_Male" in cols


def test_train_and_test_columns_match(trained_split):
    assert list(trained_split["x_tr"].columns) == list(trained_split["x_te"].columns)


def test_engineered_features_present(trained_split):
    cols = set(trained_split["pp"].feature_order)
    assert set(config.ENGINEERED_FEATURES).issubset(cols)


def test_clean_fixes_gender_typo_and_casing():
    df = pd.DataFrame(
        {
            "Gender": ["femle", "FEMALE", "male", np.nan],
            "Sleep_Hours": ['"6.1"', "7", "8.0", "5.5"],
            "Phone_Usage_Purpose": ["Browsing", "Unknown", "Gaming", "Education"],
        }
    )
    cleaned = Preprocessor.clean(df)
    # "femle" and "FEMALE" both normalise to "Female"; missing stays NaN (imputed later)
    assert cleaned["Gender"].tolist()[:3] == ["Female", "Female", "Male"]
    assert pd.isna(cleaned["Gender"].iloc[3])
    # quoted Sleep_Hours becomes float
    assert cleaned["Sleep_Hours"].iloc[0] == pytest.approx(6.1)
    # "Unknown" purpose becomes NaN
    assert pd.isna(cleaned["Phone_Usage_Purpose"].iloc[1])


def test_transform_before_fit_raises():
    df = pd.DataFrame({"Gender": ["Male"], "Sleep_Hours": [7.0]})
    with pytest.raises(RuntimeError):
        Preprocessor().transform(df)


def test_engineer_features_handles_zero_usage():
    row = {name: 1.0 for name in config.NUMERIC_FEATURE_NAMES}
    row["Daily_Usage_Hours"] = 0.0
    out = Preprocessor.engineer_features(pd.DataFrame([row]))
    assert out["usage_zero_flag"].iloc[0] == 1
    # division guarded -> finite, no inf/nan
    assert np.isfinite(out["checks_per_hour"].iloc[0])
    assert np.isfinite(out["apps_per_hour"].iloc[0])


def test_transform_output_has_no_nans(trained_split):
    assert not trained_split["x_te"].isna().any().any()
