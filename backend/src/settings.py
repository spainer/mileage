import os
from pathlib import Path
from typing import Annotated

from pydantic import BaseModel, Field

REPO_ROOT = Path(__file__).resolve().parent.parent.parent


def _default_database_url() -> str:
    return os.environ.get("DATABASE_URL", "sqlite+aiosqlite:///./test.db")


def _default_static_dir() -> str:
    return os.environ.get("STATIC_DIR", str(REPO_ROOT / "frontend" / "dist"))


class AppSettings(BaseModel):
    database_url: Annotated[str, Field(default_factory=_default_database_url)]
    static_dir: Annotated[str, Field(default_factory=_default_static_dir)]


settings = AppSettings()
