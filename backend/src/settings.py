from pydantic import BaseModel


class DatabaseSettings(BaseModel):
    database_url: str = "sqlite:///./test.db"


settings = DatabaseSettings()