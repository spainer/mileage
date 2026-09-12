import pytest
from litestar.testing import TestClient

from src.app import app


@pytest.fixture
def db_url(tmp_path) -> str:
    return "sqlite+aiosqlite:///" + str(tmp_path / "test.db")


@pytest.fixture
def client(tmp_path):
    import src.database as database

    url = "sqlite+aiosqlite:///" + str(tmp_path / "client.db")
    database.configure(url)

    with TestClient(app) as c:
        yield c

    database.get_engine().sync_engine.dispose()
