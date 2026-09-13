import pytest
from litestar.testing import TestClient

from src.app import app


@pytest.fixture
def db_url(tmp_path) -> str:
    return "sqlite+aiosqlite:///" + str(tmp_path / "test.db")


@pytest.fixture
def client(db_url):
    import src.database as database

    database.configure(db_url)

    with TestClient(app) as c:
        yield c

    database.get_engine().sync_engine.dispose()
