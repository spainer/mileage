import os
from typing import Annotated

from pydantic import BaseModel, Field


def _default_database_url() -> str:
    return os.environ.get("DATABASE_URL", "sqlite+aiosqlite:///./test.db")


class DatabaseSettings(BaseModel):
    database_url: Annotated[str, Field(default_factory=_default_database_url)]


settings = DatabaseSettings()
