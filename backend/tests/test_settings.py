import os

from src.settings import AppSettings, settings


def test_default_database_url_is_aiosqlite() -> None:
    assert settings.database_url.startswith("sqlite+aiosqlite://")


def test_default_static_dir_is_frontend_build_output() -> None:
    assert os.path.normpath(settings.static_dir).endswith(os.path.join("frontend", "dist"))


def test_static_dir_overridable_via_environment(monkeypatch, tmp_path) -> None:
    monkeypatch.setenv("STATIC_DIR", str(tmp_path / "custom"))

    assert AppSettings().static_dir == str(tmp_path / "custom")
