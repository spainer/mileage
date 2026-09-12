import sys
from logging.config import fileConfig
from pathlib import Path
from sqlalchemy import engine_from_config, pool
from alembic import context

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

from src.settings import settings
from src import models


def _sync_url(url: str) -> str:
    return url.replace("+aiosqlite", "") if "+aiosqlite" in url else url

_configured_url = config.get_main_option("sqlalchemy.url")
if not _configured_url or "driver://" in _configured_url:
    config.set_main_option("sqlalchemy.url", _sync_url(settings.database_url))

target_metadata = models.Base.metadata


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    context.configure(
        url=config.get_main_option("sqlalchemy.url"),
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
