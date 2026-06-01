"""Shared pytest fixtures and import-path bootstrap.

Adds src/ (the package) and the repo root (for the `api` package) to sys.path
so the suite runs whether or not the project is pip-installed.
"""

from __future__ import annotations

import sys
from pathlib import Path

import pytest

_ROOT = Path(__file__).resolve().parent.parent
_SRC = _ROOT / "src"
for _p in (str(_SRC), str(_ROOT)):
    if _p not in sys.path:
        sys.path.insert(0, _p)


@pytest.fixture(scope="session")
def model():
    """The loaded AddictionModel (artifacts are committed in models/)."""
    from addiction_predictor.model import AddictionModel

    return AddictionModel.load()


@pytest.fixture
def sample_input() -> dict:
    """A valid raw input built from the config defaults."""
    from addiction_predictor import config

    data = {f.name: f.default for f in config.NUMERIC_FEATURES}
    data.update({c.name: c.default for c in config.CATEGORICAL_FEATURES})
    return data


@pytest.fixture(scope="session")
def trained_split() -> dict:
    """Fit a preprocessor on the real train split; reused by pipeline tests."""
    from addiction_predictor import pipeline, train

    df = train.load_clean_dataset()
    X_train, X_test, _y_train, _y_test = train.split(df)
    pp = pipeline.Preprocessor()
    x_tr = pp.fit_transform(X_train)
    x_te = pp.transform(X_test)
    return {"pp": pp, "x_tr": x_tr, "x_te": x_te, "X_test": X_test}


@pytest.fixture(scope="session")
def client():
    """FastAPI TestClient with the lifespan (model load) active."""
    from fastapi.testclient import TestClient

    from api.main import app

    with TestClient(app) as test_client:
        yield test_client
