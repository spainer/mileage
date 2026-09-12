import asyncio
import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy import event
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from src.settings import settings

logger = logging.getLogger(__name__)

BACKEND_ROOT = Path(__file__).resolve().parent.parent
SYNC_SUFFIX = "+aiosqlite"


def _enable_foreign_keys(dbapi_connection: object, _: object) -> None:
    dbapi_connection.execute("PRAGMA foreign_keys = ON")


def _build_engine(url: str) -> AsyncEngine:
    engine = create_async_engine(url)
    event.listen(engine.sync_engine, "connect", _enable_foreign_keys)
    return engine


_url: str = settings.database_url
_engine: AsyncEngine = _build_engine(_url)
_session = async_sessionmaker(_engine, expire_on_commit=False)


def configure(url: str) -> None:
    global _url, _engine, _session
    _engine.sync_engine.dispose()
    _url = url
    _engine = _build_engine(url)
    _session = async_sessionmaker(_engine, expire_on_commit=False)


def get_engine() -> AsyncEngine:
    return _engine


def get_session() -> "async_sessionmaker[AsyncSession]":
    return _session


def _sync_url(database_url: str | None = None) -> str:
    url = database_url or _url
    if SYNC_SUFFIX in url:
        return url.replace(SYNC_SUFFIX, "")
    return url


def _build_config(database_url: str) -> Config:
    config = Config(file_=None)
    config.set_main_option("script_location", str(BACKEND_ROOT / "alembic"))
    config.set_main_option("sqlalchemy.url", _sync_url(database_url))
    return config


def run_alembic_upgrade(database_url: str | None = None) -> None:
    config = _build_config(database_url or _url)
    try:
        command.upgrade(config, "head")
    except Exception as exc:
        logger.warning("schema migration did not complete: %s", exc)


async def migrate_on_startup() -> None:
    await asyncio.to_thread(run_alembic_upgrade)


@asynccontextmanager
async def lifespan(app: object) -> AsyncIterator[None]:
    await migrate_on_startup()
    yield
