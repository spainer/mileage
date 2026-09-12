from src.settings import settings


def test_default_database_url_is_aiosqlite() -> None:
    assert settings.database_url.startswith("sqlite+aiosqlite://")
