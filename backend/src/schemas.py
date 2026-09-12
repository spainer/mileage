import re
from typing import Annotated

from pydantic import BeforeValidator, BaseModel

from src import models

LICENSE_PATTERN = re.compile(r"[A-Z0-9]{1,10}")


def normalize_license(value: str) -> str:
    normalized = value.upper()
    if not LICENSE_PATTERN.fullmatch(normalized):
        raise ValueError("license must be 1-10 characters of A-Z or 0-9")
    return normalized


def _normalize_license_or_none(value: str | None) -> str | None:
    if value is None:
        return None
    return normalize_license(value)


License = Annotated[str, BeforeValidator(normalize_license)]


class CarCreate(BaseModel):
    manufacturer: str
    model: str
    license: License


class CarUpdate(BaseModel):
    manufacturer: str | None = None
    model: str | None = None
    license: Annotated[str | None, BeforeValidator(_normalize_license_or_none)] = None


class Car(BaseModel):
    id: int
    manufacturer: str
    model: str
    license: str

    @classmethod
    def from_orm(cls, car: models.Car) -> Car:
        return cls(
            id=car.id,
            manufacturer=car.manufacturer,
            model=car.model,
            license=car.license,
        )
