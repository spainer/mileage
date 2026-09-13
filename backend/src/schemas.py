import re
from datetime import date
from typing import Annotated

from pydantic import BeforeValidator, BaseModel, Field

from src import models

LICENSE_PATTERN = re.compile(
    r"[A-Z]{1,3}-(?:[A-Z]\d{1,4}[A-Z]?|[A-Z]{2}\d{1,3}[A-Z]?|[A-Z]{2}\d{4})"
)


def normalize_license(value: str) -> str:
    normalized = value.upper().replace(" ", "")
    if not LICENSE_PATTERN.fullmatch(normalized):
        raise ValueError(
            "license must be a German license plate: 1-3 uppercase letters, a dash, "
            "1-2 uppercase letters, 1-4 digits, and optionally one uppercase letter "
            "after the digits (e.g. M-AB1234)"
        )
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


OdometerReading = Annotated[int, Field(ge=0)]
NullableDate = date | None


class MileageRecordCreate(BaseModel):
    date: date
    odometer_reading: OdometerReading


class MileageRecordUpdate(BaseModel):
    date: NullableDate = None
    odometer_reading: OdometerReading | None = None


class MileageRecord(BaseModel):
    id: int
    car_id: int
    date: date
    odometer_reading: OdometerReading

    @classmethod
    def from_orm(cls, record: models.MileageRecord) -> MileageRecord:
        return cls(
            id=record.id,
            car_id=record.car_id,
            date=record.date,
            odometer_reading=record.odometer_reading,
        )


AnnualMileageCap = Annotated[int, Field(ge=0)]


class InsuranceReportCreate(BaseModel):
    date: date
    odometer_reading: OdometerReading
    mileage_per_year: AnnualMileageCap


class InsuranceReportUpdate(BaseModel):
    date: NullableDate = None
    odometer_reading: OdometerReading | None = None
    mileage_per_year: AnnualMileageCap | None = None


class InsuranceReport(BaseModel):
    id: int
    car_id: int
    date: date
    odometer_reading: OdometerReading
    mileage_per_year: AnnualMileageCap

    @classmethod
    def from_orm(cls, report: models.InsuranceReport) -> InsuranceReport:
        return cls(
            id=report.id,
            car_id=report.car_id,
            date=report.date,
            odometer_reading=report.odometer_reading,
            mileage_per_year=report.mileage_per_year,
        )
