"""Model serving layer: load artifacts once, predict (clipped), explain (SHAP).

`AddictionModel` wraps the trained CatBoost model and the fitted Preprocessor.
It is the only place inference happens, so the API and the Streamlit UI share
identical predictions. SHAP values come from CatBoost natively
(`get_feature_importance(type="ShapValues")`) — no external shap dependency.
"""

from __future__ import annotations

import json
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from catboost import CatBoostRegressor, Pool

from . import config
from .pipeline import Preprocessor
from .schema import FeatureDriver


class AddictionModel:
    """Loaded model + preprocessor, ready to predict and explain."""

    def __init__(
        self,
        model: CatBoostRegressor,
        preprocessor: Preprocessor,
        model_card: dict | None = None,
    ) -> None:
        self.model = model
        self.preprocessor = preprocessor
        self.model_card = model_card or {}

    @property
    def feature_order(self) -> list[str]:
        return self.preprocessor.feature_order

    @classmethod
    def load(
        cls,
        model_path: str | Path | None = None,
        preprocessor_path: str | Path | None = None,
        card_path: str | Path | None = None,
    ) -> "AddictionModel":
        """Load the persisted artifacts produced by `train.main()`."""
        model_path = Path(model_path or config.MODEL_PATH)
        preprocessor_path = Path(preprocessor_path or config.PREPROCESSOR_PATH)
        card_path = Path(card_path or config.MODEL_CARD_PATH)

        if not model_path.exists() or not preprocessor_path.exists():
            raise FileNotFoundError(
                "Model artifacts not found. Run `python -m addiction_predictor.train` "
                f"to generate them (looked in {model_path.parent})."
            )

        model = CatBoostRegressor()
        model.load_model(str(model_path))
        preprocessor = joblib.load(preprocessor_path)

        card: dict = {}
        if card_path.exists():
            with open(card_path, encoding="utf-8") as fh:
                card = json.load(fh)

        return cls(model, preprocessor, card)

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _to_processed(self, raw: dict | pd.DataFrame) -> pd.DataFrame:
        if isinstance(raw, pd.DataFrame):
            return self.preprocessor.transform(raw)
        if isinstance(raw, dict):
            return self.preprocessor.transform_one(raw)
        raise TypeError("raw must be a dict or a pandas DataFrame")

    @staticmethod
    def _clip(preds: np.ndarray) -> np.ndarray:
        return np.clip(preds, config.PRED_MIN, config.PRED_MAX)

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def predict(self, raw: dict | pd.DataFrame) -> float:
        """Predict the addiction level for a single raw input."""
        X = self._to_processed(raw)
        return float(self._clip(self.model.predict(X))[0])

    def predict_batch(self, raw_df: pd.DataFrame) -> list[float]:
        """Predict for a frame of raw rows; returns one clipped score per row."""
        X = self.preprocessor.transform(raw_df)
        return [float(v) for v in self._clip(self.model.predict(X))]

    def _drivers(self, contributions: np.ndarray, top_k: int) -> list[FeatureDriver]:
        """Build the top_k signed drivers for one row's SHAP contributions."""
        order = np.argsort(np.abs(contributions))[::-1][:top_k]
        return [
            FeatureDriver(
                feature=self.feature_order[i],
                human_label=config.human_label(self.feature_order[i]),
                contribution=float(contributions[i]),
                direction="increases" if contributions[i] > 0 else "decreases",
            )
            for i in order
        ]

    def explain(
        self, raw: dict | pd.DataFrame, top_k: int = 6
    ) -> tuple[float, list[FeatureDriver]]:
        """Return the prediction plus its top_k signed SHAP drivers.

        SHAP contributions are in the units of the prediction (addiction level),
        so a value of +0.4 means that feature pushed the score up by ~0.4.
        """
        X = self._to_processed(raw)
        pred = float(self._clip(self.model.predict(X))[0])
        shap = np.asarray(
            self.model.get_feature_importance(Pool(X), type="ShapValues")
        )
        return pred, self._drivers(shap[0, :-1], top_k)  # last col is base value

    def explain_batch(
        self, raw_df: pd.DataFrame, top_k: int = 6
    ) -> list[tuple[float, list[FeatureDriver]]]:
        """Per-row predictions + drivers from a single SHAP pass over the frame."""
        X = self.preprocessor.transform(raw_df)
        preds = self._clip(self.model.predict(X))
        shap = np.asarray(
            self.model.get_feature_importance(Pool(X), type="ShapValues")
        )
        return [
            (float(preds[r]), self._drivers(shap[r, :-1], top_k))
            for r in range(len(X))
        ]
