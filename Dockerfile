FROM node:24-slim AS frontend
WORKDIR /app
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ .
RUN npm run build

FROM python:3.14-slim AS deps
RUN pip install --no-cache-dir "uv==0.4.*"
WORKDIR /app
COPY backend/pyproject.toml backend/uv.lock ./
RUN --mount=type=cache,target=/root/.cache/uv uv venv .venv && \
    uv sync --frozen --no-dev

FROM python:3.14-slim
ARG GIT_SHA=unknown
LABEL org.opencontainers.revision=$GIT_SHA
RUN groupadd --system --gid 1000 mileage && \
    useradd --system --uid 1000 --gid mileage --home-dir /app --shell /usr/sbin/nologin mileage
COPY --from=deps --chown=mileage:mileage /app/.venv /app/.venv
WORKDIR /app
COPY --chown=mileage:mileage backend/pyproject.toml backend/uv.lock ./
COPY --chown=mileage:mileage backend/src/ ./src/
COPY --chown=mileage:mileage backend/alembic/ ./alembic/
COPY --from=frontend --chown=mileage:mileage /app/dist /frontend/dist
RUN mkdir -p /data && chown --no-dereference mileage:mileage /data
ENV PATH="/app/.venv/bin:$PATH" \
    PYTHONPATH="/app" \
    DATABASE_URL="sqlite+aiosqlite:////data/mileage.db"
USER mileage
EXPOSE 8000
CMD ["uvicorn", "src.app:app", "--host", "0.0.0.0", "--port", "8000"]
