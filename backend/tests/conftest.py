from pathlib import Path

import pytest
from litestar.testing import TestClient


@pytest.fixture
def db_url(tmp_path) -> str:
    return "sqlite+aiosqlite:///" + str(tmp_path / "test.db")


@pytest.fixture
def static_dir() -> Path | None:
    return None


@pytest.fixture
def client(db_url, static_dir):
    import src.database as database
    from src.app import create_app

    database.configure(db_url)

    with TestClient(create_app(static_dir)) as c:
        yield c

    database.get_engine().sync_engine.dispose()
