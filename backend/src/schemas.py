import re

from pydantic import BaseModel, field_validator

from src import models

LICENSE_PATTERN = re.compile(r"[A-Z0-9]{1,10}")


def normalize_license(value: str) -> str:
    normalized = value.upper()
    if not LICENSE_PATTERN.fullmatch(normalized):
        raise ValueError("license must be 1-10 characters of A-Z or 0-9")
    return normalized


class CarCreate(BaseModel):
    manufacturer: str
    model: str
    license: str

    @field_validator("license")
    @classmethod
    def _normalize_license(cls, value: str) -> str:
        return normalize_license(value)


class CarUpdate(BaseModel):
    manufacturer: str | None = None
    model: str | None = None
    license: str | None = None

    @field_validator("license")
    @classmethod
    def _normalize_license(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return normalize_license(value)


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
