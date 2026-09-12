# Async data layer with aiosqlite and migrate-on-startup

The backend uses an asynchronous SQLAlchemy data layer driven by `aiosqlite`, and migrations run automatically when the application boots.

The repo declared `sqlalchemy[asyncio]` and `greenlet` but shipped no async driver; we chose to complete that intent rather than fall back to a sync engine. The application runs `alembic upgrade head` during Litestar startup, synchronously inside `asyncio.to_thread`, idempotently — Alembic's `alembic_version` table makes "run only if not yet applied" automatic, and a sync runner in a thread is simpler and more robust for a local SQLite database than a fully-async Alembic runner.

**Considered options**

- **Sync SQLAlchemy in `sync_to_thread` handlers** — simplest for local SQLite, but diverges from the async intent already in the dependencies.
- **Fully-async Alembic `AsyncRunner`** — more idiomatic for the async engine, but more wiring for a benefit not felt in single-file SQLite.

**Consequences**

- `aiosqlite` is a required dependency; the default `database_url` is `sqlite+aiosqlite:///...`.
- Boot does schema migration as a side effect; a partially-applied migration is logged, not a fatal startup crash.
