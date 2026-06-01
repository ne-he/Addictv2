"""Central configuration: paths, feature specs, constants, model hyperparameters.

This module is the single place where domain constants live. Both training and
inference import from here, so there is no risk of the two drifting apart.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------

PACKAGE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = PACKAGE_DIR.parent.parent
DATA_PATH = PROJECT_ROOT / "data" / "Phone_Addiction.csv"
MODELS_DIR = PROJECT_ROOT / "models"

MODEL_PATH = MODELS_DIR / "catboost_model.cbm"
PREPROCESSOR_PATH = MODELS_DIR / "preprocessor.pkl"
MODEL_CARD_PATH = MODELS_DIR / "model_card.json"

# ---------------------------------------------------------------------------
# Target & prediction bounds
# ---------------------------------------------------------------------------

TARGET = "Addiction_Level"
PRED_MIN = 1.0
PRED_MAX = 10.0

# Interpretation thresholds (on the 1-10 scale)
THRESHOLD_LOW = 4.0   # < 4.0  -> low
THRESHOLD_HIGH = 7.0  # >= 7.0 -> high

# ---------------------------------------------------------------------------
# Train/test split
# ---------------------------------------------------------------------------

SEED = 1
TEST_SIZE = 0.2
SPLIT_RANDOM_STATE = 284091
STRATIFY_BINS = 10  # quantile bins used to stratify a continuous target safely

# ---------------------------------------------------------------------------
# Columns dropped during cleaning (uninformative / duplicated)
# ---------------------------------------------------------------------------

DROP_COLS = ["Name", "Location", "Unnamed: 0", "ConstantCol", "Apps_Used_Weekly"]

# ---------------------------------------------------------------------------
# Raw input feature specifications (19 features the user provides)
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class NumericFeature:
    name: str
    label: str
    minimum: float
    maximum: float
    default: float
    step: float
    is_int: bool = False


@dataclass(frozen=True)
class CategoricalFeature:
    name: str
    label: str
    options: tuple[str, ...]
    default: str


NUMERIC_FEATURES: tuple[NumericFeature, ...] = (
    NumericFeature("Age", "Usia", 1, 100, 18, 1, is_int=True),
    NumericFeature("Daily_Usage_Hours", "Jam pakai HP / hari", 0.0, 24.0, 5.0, 0.5),
    NumericFeature("Sleep_Hours", "Jam tidur / hari", 0.0, 24.0, 7.0, 0.5),
    NumericFeature("Weekend_Usage_Hours", "Jam pakai HP akhir pekan", 0.0, 24.0, 6.0, 0.5),
    NumericFeature("Phone_Checks_Per_Day", "Cek HP / hari", 0, 500, 50, 1, is_int=True),
    NumericFeature("Apps_Used_Daily", "Jumlah app dipakai / hari", 0, 100, 10, 1, is_int=True),
    NumericFeature("Screen_Time_Before_Bed", "Layar sebelum tidur (jam)", 0.0, 24.0, 1.0, 0.5),
    NumericFeature("Time_on_Social_Media", "Waktu media sosial (jam)", 0.0, 24.0, 2.0, 0.5),
    NumericFeature("Time_on_Gaming", "Waktu gaming (jam)", 0.0, 24.0, 1.0, 0.5),
    NumericFeature("Time_on_Education", "Waktu edukasi (jam)", 0.0, 24.0, 1.0, 0.5),
    NumericFeature("Anxiety_Level", "Tingkat kecemasan (0-10)", 0, 10, 5, 1, is_int=True),
    NumericFeature("Depression_Level", "Tingkat depresi (0-10)", 0, 10, 5, 1, is_int=True),
    NumericFeature("Self_Esteem", "Harga diri (0-10)", 0, 10, 5, 1, is_int=True),
    NumericFeature("Interllectual_Performance", "Performa intelektual (0-100)", 0, 100, 70, 1, is_int=True),
    NumericFeature("Social_Interactions", "Interaksi sosial / hari", 0, 20, 5, 1, is_int=True),
    NumericFeature("Exercise_Hours", "Jam olahraga / hari", 0.0, 24.0, 1.0, 0.5),
    NumericFeature("Family_Communication", "Komunikasi keluarga / hari", 0, 20, 5, 1, is_int=True),
)

CATEGORICAL_FEATURES: tuple[CategoricalFeature, ...] = (
    CategoricalFeature("Gender", "Jenis kelamin", ("Male", "Female", "Other"), "Male"),
    CategoricalFeature(
        "Phone_Usage_Purpose",
        "Tujuan utama pakai HP",
        ("Browsing", "Education", "Gaming", "Social Media", "Other"),
        "Browsing",
    ),
)

# Derived convenience collections
NUMERIC_FEATURE_NAMES = [f.name for f in NUMERIC_FEATURES]
CATEGORICAL_FEATURE_NAMES = [f.name for f in CATEGORICAL_FEATURES]
RAW_FEATURE_NAMES = NUMERIC_FEATURE_NAMES + CATEGORICAL_FEATURE_NAMES

# Sum of these activity-time fields cannot exceed 24h in a single day
ACTIVITY_TIME_FIELDS = ("Time_on_Social_Media", "Time_on_Gaming", "Time_on_Education")

# ---------------------------------------------------------------------------
# Preprocessing constants
# ---------------------------------------------------------------------------

CAT_COLS = ["Gender", "Phone_Usage_Purpose"]
OHE_DROP = ["Other", "Other"]  # baseline category dropped for each cat col

# 10 engineered feature names (created in pipeline.engineer_features)
ENGINEERED_FEATURES = [
    "usage_zero_flag",
    "checks_per_hour",
    "apps_per_hour",
    "screen_before_bed_ratio",
    "usage_to_sleep_ratio",
    "late_screen_ratio",
    "social_to_solo_ratio",
    "resilience_gap",
    "high_gaming_x_sleep",
    "social_media_x_anxiety",
]

# Human-readable labels for the engineered features (raw-feature labels already
# live on NUMERIC_FEATURES / CATEGORICAL_FEATURES). Used when surfacing SHAP
# drivers so the UI/API never shows a cryptic column name.
ENGINEERED_FEATURE_LABELS = {
    "usage_zero_flag": "Penanda tidak memakai HP",
    "checks_per_hour": "Frekuensi cek HP per jam pakai",
    "apps_per_hour": "Jumlah app per jam pakai",
    "screen_before_bed_ratio": "Porsi layar sebelum tidur",
    "usage_to_sleep_ratio": "Rasio jam pakai HP vs tidur",
    "late_screen_ratio": "Rasio layar malam vs tidur",
    "social_to_solo_ratio": "Rasio interaksi sosial vs soliter",
    "resilience_gap": "Selisih harga diri vs tekanan mental",
    "high_gaming_x_sleep": "Interaksi gaming x tidur",
    "social_media_x_anxiety": "Interaksi medsos x kecemasan",
}

_NUMERIC_LABELS = {f.name: f.label for f in NUMERIC_FEATURES}


def human_label(feature: str) -> str:
    """Map any model feature name (raw, engineered, or one-hot) to a label."""
    if feature in _NUMERIC_LABELS:
        return _NUMERIC_LABELS[feature]
    if feature in ENGINEERED_FEATURE_LABELS:
        return ENGINEERED_FEATURE_LABELS[feature]
    for cat in CATEGORICAL_FEATURES:  # one-hot cols look like "Gender_Female"
        prefix = cat.name + "_"
        if feature.startswith(prefix):
            return f"{cat.label}: {feature[len(prefix):]}"
    return feature


# Columns that get np.log1p applied (right-skewed)
SKEWED_COLS = [
    "Age",
    "checks_per_hour",
    "apps_per_hour",
    "screen_before_bed_ratio",
    "usage_to_sleep_ratio",
    "social_to_solo_ratio",
    "social_media_x_anxiety",
]

EPS = 1e-3  # guards divisions in feature engineering

# ---------------------------------------------------------------------------
# Model hyperparameters (best params from the notebook's Optuna search)
# ---------------------------------------------------------------------------

CATBOOST_PARAMS = {
    "iterations": 1000,
    "learning_rate": 0.05,
    "depth": 6,
    "l2_leaf_reg": 3.0,
    "loss_function": "RMSE",
    "random_seed": SEED,
    "verbose": 0,
}
