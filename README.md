# Phone Addiction Predictor v2

Production-ready rewrite of a smartphone-addiction-level regressor (CatBoost,
scale **1–10**) with a **single shared preprocessing core** reused by training,
a FastAPI service, and a Streamlit demo — plus SHAP explanations, a pinned
environment, tests, CI, and a Docker image.

![CI](https://github.com/ne-he/Addictv2/actions/workflows/ci.yml/badge.svg)

> ⚠️ **Honest caveat:** the test R² (~0.95) is unusually high for behavioural
> data, which strongly suggests the dataset is **synthetic**. Predictions are
> **statistical estimates, not a medical or psychological diagnosis.** Treat
> this as an engineering portfolio piece, not a validated clinical instrument.

---

## Why this rewrite exists

The semester-3 version was a single notebook plus a Streamlit app that
**duplicated** the preprocessing logic. That duplication is the classic source
of *training/serving skew*: fix a transform in one place, forget the other, and
production silently drifts from what was trained.

**v2's core idea:** one `Preprocessor` class is the single source of truth.
Training calls `fit_transform`; the API and UI call `transform`. They cannot
disagree because they run the same code.

```
            ┌────────────────────────────┐
            │  addiction_predictor (core) │
            │  config · schema · pipeline │
            │  model · interpret · train  │
            └──────────────┬─────────────┘
                           │  (imported by)
        ┌──────────────────┼────────────────────┐
        │                  │                     │
   train.py            api/main.py         app/streamlit_app.py
 (fit + save)        (FastAPI, JSON)        (Streamlit demo)
```

---

## Project structure

```
Addictv2/
├── src/addiction_predictor/   # the installable core package
│   ├── config.py              # paths, feature specs, hyperparameters (single config)
│   ├── schema.py              # pydantic input (generated from config) + output models
│   ├── pipeline.py            # Preprocessor: the shared transform (clean→impute→encode→engineer→log→scale)
│   ├── model.py               # load artifacts, predict (clipped), explain (native SHAP)
│   ├── interpret.py           # score → category, copy, personalised recommendations
│   └── train.py               # dataset cleaning, training, model_card.json
├── api/main.py                # FastAPI service (thin adapter)
├── app/streamlit_app.py       # Streamlit demo (thin adapter)
├── tests/                     # pytest suite (34 tests)
├── models/                    # trained artifacts (committed, runs out of the box)
│   ├── catboost_model.cbm
│   ├── preprocessor.pkl
│   └── model_card.json
├── data/Phone_Addiction.csv   # training data
├── notebooks/                 # original AOL experiment notebook
├── Dockerfile · pyproject.toml · requirements*.txt · .github/workflows/ci.yml
```

---

## Quickstart

```bash
# 1. Install (editable, with API + app + dev extras)
python -m venv .venv && source .venv/bin/activate    # Windows: .venv\Scripts\activate
pip install -e ".[api,app,dev]"

# 2. (Optional) retrain — artifacts are already committed
python -m addiction_predictor.train

# 3. Run the REST API
uvicorn api.main:app --reload          # docs at http://localhost:8000/docs

# 4. Run the Streamlit demo
streamlit run app/streamlit_app.py

# 5. Run the tests
pytest
```

### Docker (API)

```bash
docker build -t addiction-predictor .
docker run -p 8000:8000 addiction-predictor
# http://localhost:8000/health
```

---

## API

| Method | Path             | Description                                            |
| ------ | ---------------- | ------------------------------------------------------ |
| GET    | `/health`        | Liveness + loaded-model test metrics                   |
| GET    | `/model-card`    | Full model card (metrics, data hash, versions, caveats)|
| GET    | `/features`      | Feature specs for building/validating a frontend form  |
| POST   | `/predict`       | One profile → score, category, drivers, recommendations|
| POST   | `/predict/batch` | Many profiles (single SHAP pass, capped at 1000)       |

Example:

```bash
curl -X POST http://localhost:8000/predict -H "Content-Type: application/json" -d '{
  "Age": 18, "Daily_Usage_Hours": 12, "Sleep_Hours": 4, "Weekend_Usage_Hours": 13,
  "Phone_Checks_Per_Day": 300, "Apps_Used_Daily": 40, "Screen_Time_Before_Bed": 3,
  "Time_on_Social_Media": 6, "Time_on_Gaming": 4, "Time_on_Education": 1,
  "Anxiety_Level": 8, "Depression_Level": 7, "Self_Esteem": 3,
  "Interllectual_Performance": 60, "Social_Interactions": 2, "Exercise_Hours": 0,
  "Family_Communication": 2, "Gender": "Male", "Phone_Usage_Purpose": "Social Media"
}'
```

Returns `addiction_level`, `category` (`low`/`medium`/`high`), `category_label`,
`interpretation`, `recommendations`, and `drivers` (signed SHAP contributions,
largest first).

---

## How it works

- **Input:** 19 raw fields (17 numeric + 2 categorical), validated by a pydantic
  model generated from `config` — ranges live in exactly one place. A cross-field
  rule rejects activity hours that sum to more than 24h/day.
- **Preprocessing** (`Preprocessor`): clean → impute (median/mode) → one-hot
  encode → engineer 10 derived features (ratios, interactions, a flag) → `log1p`
  skewed columns → standard-scale. Produces **33 model features**.
- **Model:** `CatBoostRegressor` (best params from the notebook's Optuna search),
  predictions clipped to 1–10.
- **Explainability:** CatBoost's native `ShapValues` — no extra dependency. Each
  driver is mapped to a human label and a direction (raises/lowers the score).
- **Interpretation:** thresholds bucket the score; recommendations are derived
  from the features that pushed the score up.

### Performance (this dataset)

| Split | RMSE  | R²    | MAE   |
| ----- | ----- | ----- | ----- |
| Train | 0.158 | 0.990 | 0.097 |
| Test  | 0.370 | 0.947 | 0.188 |

Train ≪ test error is expected for boosting; the **test** row is the honest
estimate. The full record lives in `models/model_card.json`.

---

## Development

```bash
pytest            # 34 tests
ruff check .      # lint (config in pyproject.toml)
```

CI (GitHub Actions) installs the pinned environment, lints, runs the suite, and
does a training smoke test on every push and PR.

## License

MIT.
