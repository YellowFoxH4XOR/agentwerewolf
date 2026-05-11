# syntax=docker/dockerfile:1.7
FROM python:3.12-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    UV_LINK_MODE=copy

# uv: fast Python package manager
COPY --from=ghcr.io/astral-sh/uv:0.5 /uv /usr/local/bin/uv

WORKDIR /app

# Install deps first for layer caching
COPY pyproject.toml uv.lock* ./
RUN uv sync --frozen --no-dev || uv sync --no-dev

# App code
COPY src ./src
COPY scripts ./scripts

# Runtime data dir (mount a volume here in prod)
RUN mkdir -p /data && chmod 777 /data
ENV AW_DATA_DIR=/data

EXPOSE 8000

# Healthcheck the deeper endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD python -c "import urllib.request,sys; r=urllib.request.urlopen('http://localhost:8000/health'); sys.exit(0 if r.status==200 else 1)"

CMD ["uv", "run", "uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]
