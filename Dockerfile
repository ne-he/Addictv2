# Serves the FastAPI prediction API. The Streamlit demo is run separately.
FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# libgomp1 is the OpenMP runtime CatBoost needs at import time.
RUN apt-get update \
    && apt-get install -y --no-install-recommends libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Install the package + API extra first (cached unless deps/metadata change).
COPY pyproject.toml README.md ./
COPY src/ ./src/
RUN pip install ".[api]"

# App code + trained artifacts.
COPY api/ ./api/
COPY models/ ./models/

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD python -c "import os,urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://localhost:%s/health' % os.environ.get('PORT','8000')).status==200 else 1)"

# Shell form so ${PORT} expands. Cloud hosts (Render, Railway, Fly) inject their
# own $PORT; fall back to 8000 for local `docker run -p 8000:8000`.
CMD uvicorn api.main:app --host 0.0.0.0 --port ${PORT:-8000}
