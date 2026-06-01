"""Shared preprocessing pipeline.

`Preprocessor` is the single source of truth for every data transformation.
Training calls `fit_transform`; the API and UI call `transform` / `transform_one`.
Because both paths run the exact same code, training and serving cannot drift
apart (the classic source of silent ML production bugs).

Per-sample steps (identical for train and inference):
    clean -> impute -> one-hot encode -> engineer features -> log transform -> scale
"""

from __future__ import annotations

import numpy as np
import pandas as pd
from sklearn.preprocessing import OneHotEncoder, StandardScaler

from . import config


class Preprocessor:
    """Stateful, picklable preprocessor.

    Fitted attributes (learned from the training set only):
        num_medians   : {col: median}  for numeric imputation
        cat_modes      : {col: mode}    for categorical imputation
        ohe            : fitted OneHotEncoder
        scaler         : fitted StandardScaler
        feature_order  : column order the model expects
    """

    def __init__(self) -> None:
        self.num_medians: dict = {}
        self.cat_modes: dict = {}
        self.ohe: OneHotEncoder | None = None
        self.scaler: StandardScaler | None = None
        self.feature_order: list[str] = []
        self._fitted: bool = False

    # ------------------------------------------------------------------
    # Stateless cleaning (pure functions of a single row/frame)
    # ------------------------------------------------------------------

    @staticmethod
    def clean(df: pd.DataFrame) -> pd.DataFrame:
        """Normalise raw values. Safe for both string and numeric inputs."""
        df = df.copy()

        # Sleep_Hours sometimes arrives as a quoted string e.g. '"6.1"'
        df["Sleep_Hours"] = df["Sleep_Hours"].astype(str).str.strip('"').astype(float)

        # Normalise Gender spelling/casing, fix the known "femle" typo
        df["Gender"] = (
            df["Gender"].astype(str).str.strip().str.lower()
            .replace("femle", "female").str.capitalize()
        )

        # "Unknown" purpose is a hidden missing value
        df["Phone_Usage_Purpose"] = df["Phone_Usage_Purpose"].replace("Unknown", np.nan)
        return df

    @staticmethod
    def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
        """Create the 10 derived features (ratios, interactions, a flag)."""
        x = df.copy()
        eps = config.EPS

        x["usage_zero_flag"] = (x["Daily_Usage_Hours"] <= 0).astype(int)

        denom_usage = x["Daily_Usage_Hours"].clip(lower=1)  # never divide by zero
        x["checks_per_hour"] = x["Phone_Checks_Per_Day"] / denom_usage
        x["apps_per_hour"] = x["Apps_Used_Daily"] / denom_usage
        x["screen_before_bed_ratio"] = x["Screen_Time_Before_Bed"] / denom_usage

        x["usage_to_sleep_ratio"] = x["Daily_Usage_Hours"] / (x["Sleep_Hours"] + eps)
        x["late_screen_ratio"] = x["Screen_Time_Before_Bed"] / (x["Sleep_Hours"] + eps)

        solo_usage = x["Time_on_Gaming"] + x["Time_on_Social_Media"]
        social_use = x["Family_Communication"] + x["Social_Interactions"]
        x["social_to_solo_ratio"] = social_use / (solo_usage + eps)

        mental_strain = x["Anxiety_Level"] + x["Depression_Level"]
        x["resilience_gap"] = x["Self_Esteem"] - mental_strain / 2.0

        x["high_gaming_x_sleep"] = x["Time_on_Gaming"] * x["Sleep_Hours"]
        x["social_media_x_anxiety"] = x["Time_on_Social_Media"] * x["Anxiety_Level"]
        return x

    @staticmethod
    def log_transform(df: pd.DataFrame) -> pd.DataFrame:
        """Apply log1p to right-skewed columns."""
        x = df.copy()
        for col in config.SKEWED_COLS:
            if col in x.columns:
                x[col] = np.log1p(x[col].clip(lower=0))
        return x

    # ------------------------------------------------------------------
    # Stateful steps (learn on fit, reuse on transform)
    # ------------------------------------------------------------------

    def _impute(self, df: pd.DataFrame, *, fit: bool) -> pd.DataFrame:
        df = df.copy()
        if fit:
            num_cols = df.select_dtypes(include=["number"]).columns
            cat_cols = df.select_dtypes(exclude=["number"]).columns
            self.num_medians = {c: df[c].median() for c in num_cols}
            self.cat_modes = {c: df[c].mode().iloc[0] for c in cat_cols}
        for col, val in self.num_medians.items():
            if col in df.columns:
                df[col] = df[col].fillna(val)
        for col, val in self.cat_modes.items():
            if col in df.columns:
                df[col] = df[col].fillna(val)
        return df

    def _encode(self, df: pd.DataFrame, *, fit: bool) -> pd.DataFrame:
        df = df.copy()
        if fit:
            self.ohe = OneHotEncoder(
                drop=config.OHE_DROP,
                sparse_output=False,
                handle_unknown="ignore",
            )
            self.ohe.fit(df[config.CAT_COLS])
        encoded = self.ohe.transform(df[config.CAT_COLS])
        encoded_df = pd.DataFrame(
            encoded,
            columns=self.ohe.get_feature_names_out(config.CAT_COLS),
            index=df.index,
        )
        return pd.concat([df.drop(columns=config.CAT_COLS), encoded_df], axis=1)

    def _scale(self, df: pd.DataFrame, *, fit: bool) -> pd.DataFrame:
        if fit:
            self.scaler = StandardScaler()
            scaled = self.scaler.fit_transform(df)
        else:
            scaled = self.scaler.transform(df)
        return pd.DataFrame(scaled, columns=df.columns, index=df.index)

    # ------------------------------------------------------------------
    # Public entry points
    # ------------------------------------------------------------------

    def fit_transform(self, raw: pd.DataFrame) -> pd.DataFrame:
        """Fit all stateful steps on the training frame and return processed X."""
        df = self.clean(raw)
        df = self._impute(df, fit=True)
        df = self._encode(df, fit=True)
        df = self.engineer_features(df)
        df = self.log_transform(df)
        self.feature_order = df.columns.tolist()
        df = self._scale(df, fit=True)
        self._fitted = True
        return df

    def transform(self, raw: pd.DataFrame) -> pd.DataFrame:
        """Apply the fitted pipeline to new data (inference / test set)."""
        if not self._fitted:
            raise RuntimeError("Preprocessor must be fitted before calling transform().")
        df = self.clean(raw)
        df = self._impute(df, fit=False)
        df = self._encode(df, fit=False)
        df = self.engineer_features(df)
        df = self.log_transform(df)
        df = df.reindex(columns=self.feature_order)  # enforce identical column order
        df = self._scale(df, fit=False)
        return df

    def transform_one(self, input_dict: dict) -> pd.DataFrame:
        """Convenience wrapper: a single raw input dict -> 1-row processed frame."""
        return self.transform(pd.DataFrame([input_dict]))
