"""Pydantic schemas for request validation and structured responses.

The input model is generated from ``config`` so the accepted ranges live in
exactly one place. The output models describe the API/UI contract.
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field, create_model, model_validator

from . import config

# ---------------------------------------------------------------------------
# Input model (generated from config feature specs)
# ---------------------------------------------------------------------------

def _build_input_fields() -> dict:
    fields: dict = {}
    for f in config.NUMERIC_FEATURES:
        typ = int if f.is_int else float
        fields[f.name] = (
            typ,
            Field(default=f.default, ge=f.minimum, le=f.maximum, description=f.label),
        )
    for c in config.CATEGORICAL_FEATURES:
        literal_type = Literal[tuple(c.options)]  # type: ignore[valid-type]
        fields[c.name] = (literal_type, Field(default=c.default, description=c.label))
    return fields


class _InputBase(BaseModel):
    """Base holding cross-field validation shared by the generated input model."""

    @model_validator(mode="after")
    def _validate_activity_budget(self):
        total = sum(float(getattr(self, name)) for name in config.ACTIVITY_TIME_FIELDS)
        if total > 24.0 + 1e-9:
            raise ValueError(
                f"Total waktu aktivitas (social+gaming+education = {total:.1f} jam) "
                "tidak boleh melebihi 24 jam dalam sehari."
            )
        return self


AddictionInput = create_model(
    "AddictionInput",
    __base__=_InputBase,
    **_build_input_fields(),
)
AddictionInput.__doc__ = (
    "Raw smartphone-usage profile. 19 fields validated against the ranges in "
    "config.NUMERIC_FEATURES / CATEGORICAL_FEATURES."
)


# ---------------------------------------------------------------------------
# Output models
# ---------------------------------------------------------------------------

class FeatureDriver(BaseModel):
    """One feature's signed contribution to the prediction (from SHAP)."""

    feature: str
    human_label: str
    contribution: float = Field(description="Signed SHAP value; >0 pushes score up")
    direction: Literal["increases", "decreases"]


class PredictionResult(BaseModel):
    addiction_level: float = Field(description="Predicted level, clipped to 1.0-10.0")
    category: Literal["low", "medium", "high"]
    category_label: str = Field(description="Human label, e.g. 'Rendah'")
    interpretation: str
    recommendations: list[str]
    drivers: list[FeatureDriver] = Field(
        default_factory=list, description="Top feature contributions, largest first"
    )


class BatchPredictionResult(BaseModel):
    count: int
    results: list[PredictionResult]
