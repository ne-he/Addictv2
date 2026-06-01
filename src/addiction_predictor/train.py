"""Train the CatBoost regressor and persist all artifacts.

Run with:
    python -m addiction_predictor.train

Produces in models/:
    catboost_model.cbm   - the trained model (native format)
    preprocessor.pkl     - the fitted Preprocessor (ohe, scaler, medians, modes)
    model_card.json      - metrics, data hash, library versions, caveats

Dataset-level cleaning (drop columns, cap the Age=999 outlier, drop duplicates)
happens here; all per-sample transforms live in pipeline.Preprocessor so that
training and serving share identical logic.
"""

from __future__ import annotations

import hashlib
import json
import platform
from datetime import datetime, timezone

import joblib
import numpy as np
import pandas as pd
from catboost import CatBoostRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import train_test_split

from . import __version__, config
from .pipeline import Preprocessor


def _sha256(path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as fh:
        for chunk in iter(lambda: fh.read(8192), b""):
            h.update(chunk)
    return h.hexdigest()


def _metrics(y_true, y_pred) -> dict:
    return {
        "rmse": float(np.sqrt(mean_squared_error(y_true, y_pred))),
        "r2": float(r2_score(y_true, y_pred)),
        "mae": float(mean_absolute_error(y_true, y_pred)),
    }


def load_clean_dataset() -> pd.DataFrame:
    """Load the CSV and apply dataset-level cleaning."""
    df = pd.read_csv(config.DATA_PATH)
    df = df.drop(columns=[c for c in config.DROP_COLS if c in df.columns])

    # Cap the impossible Age outlier (e.g. 999) to the max sensible age
    sensible_max = df.loc[df["Age"] <= 150, "Age"].max()
    df.loc[df["Age"] > 150, "Age"] = sensible_max

    df = df.drop_duplicates().reset_index(drop=True)
    return df


def split(df: pd.DataFrame):
    """Train/test split, stratified on a binned target (robust for continuous y)."""
    y = df[config.TARGET]
    X = df.drop(columns=[config.TARGET])
    strata = pd.qcut(y, q=config.STRATIFY_BINS, duplicates="drop", labels=False)
    return train_test_split(
        X, y,
        test_size=config.TEST_SIZE,
        random_state=config.SPLIT_RANDOM_STATE,
        stratify=strata,
    )


def main() -> dict:
    print("Loading + cleaning dataset...")
    df = load_clean_dataset()
    print(f"  rows after cleaning: {len(df)}")

    print("Splitting...")
    X_train, X_test, y_train, y_test = split(df)

    print("Fitting preprocessor + transforming...")
    pp = Preprocessor()
    X_train_proc = pp.fit_transform(X_train)
    X_test_proc = pp.transform(X_test)
    print(f"  feature count: {len(pp.feature_order)}")

    print("Training CatBoost...")
    model = CatBoostRegressor(**config.CATBOOST_PARAMS)
    model.fit(X_train_proc, y_train)

    train_metrics = _metrics(y_train, model.predict(X_train_proc))
    test_metrics = _metrics(y_test, model.predict(X_test_proc))
    print(f"  Train: RMSE={train_metrics['rmse']:.4f}  R2={train_metrics['r2']:.4f}  MAE={train_metrics['mae']:.4f}")
    print(f"  Test : RMSE={test_metrics['rmse']:.4f}  R2={test_metrics['r2']:.4f}  MAE={test_metrics['mae']:.4f}")

    print("Saving artifacts...")
    config.MODELS_DIR.mkdir(parents=True, exist_ok=True)
    model.save_model(str(config.MODEL_PATH))
    joblib.dump(pp, config.PREPROCESSOR_PATH)

    import catboost, sklearn  # local import just for version capture

    model_card = {
        "model_name": "phone-addiction-predictor",
        "version": __version__,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "algorithm": "CatBoostRegressor",
        "target": config.TARGET,
        "prediction_range": [config.PRED_MIN, config.PRED_MAX],
        "dataset": {
            "file": config.DATA_PATH.name,
            "sha256": _sha256(config.DATA_PATH),
            "rows_after_cleaning": int(len(df)),
            "train_rows": int(len(X_train)),
            "test_rows": int(len(X_test)),
        },
        "split": {
            "test_size": config.TEST_SIZE,
            "random_state": config.SPLIT_RANDOM_STATE,
            "stratify_bins": config.STRATIFY_BINS,
        },
        "n_features": len(pp.feature_order),
        "feature_order": pp.feature_order,
        "hyperparameters": config.CATBOOST_PARAMS,
        "metrics": {"train": train_metrics, "test": test_metrics},
        "library_versions": {
            "python": platform.python_version(),
            "catboost": catboost.__version__,
            "scikit_learn": sklearn.__version__,
            "pandas": pd.__version__,
            "numpy": np.__version__,
        },
        "caveats": [
            "The dataset shows an unusually high test R2 (~0.95) for behavioural "
            "data, strongly suggesting it is synthetic. The model should not be "
            "treated as a validated clinical instrument.",
            "Boosting models overfit: train RMSE is far below test RMSE. Test "
            "metrics are the honest estimate of generalisation on THIS dataset.",
            "Predictions are statistical estimates, NOT a medical or psychological "
            "diagnosis.",
        ],
    }
    with open(config.MODEL_CARD_PATH, "w", encoding="utf-8") as fh:
        json.dump(model_card, fh, indent=2)

    print(f"  saved: {config.MODEL_PATH.name}, {config.PREPROCESSOR_PATH.name}, {config.MODEL_CARD_PATH.name}")
    print("Done.")
    return model_card


if __name__ == "__main__":
    main()
