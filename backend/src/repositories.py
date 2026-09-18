import datetime

from litestar.exceptions import HTTPException, NotFoundException
from litestar.status_codes import HTTP_409_CONFLICT
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from src import models
from src.odometer_sequence import fetch_entries_for_car, validate as validate_sequence
from src.schemas import (
    Car,
    CarCreate,
    CarUpdate,
    InsuranceReport,
    InsuranceReportCreate,
    InsuranceReportUpdate,
    MileageRecord,
    MileageRecordCreate,
    MileageRecordUpdate,
)


async def _enforce_sequence(
    session: AsyncSession,
    car_id: int,
    *,
    date_: datetime.date,
    odometer_reading: int,
    exclude: tuple[int, str] | None = None,
) -> None:
    entries = await fetch_entries_for_car(session, car_id, exclude=exclude)
    message = validate_sequence(entries, date_, odometer_reading)
    if message is not None:
        raise HTTPException(status_code=HTTP_409_CONFLICT, detail=message)


async def get_car_or_404(session: AsyncSession, car_id: int) -> models.Car:
    car = await session.get(models.Car, car_id)
    if car is None:
        raise NotFoundException(f"Car {car_id} not found")
    return car


def _apply_updates(instance, update: BaseModel) -> None:
    for field, value in update.model_dump(exclude_unset=True).items():
        if value is not None:
            setattr(instance, field, value)


class CarRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get(self, car_id: int) -> Car:
        return Car.from_orm(await get_car_or_404(self._session, car_id))

    async def _commit_or_conflict(self) -> None:
        try:
            await self._session.commit()
        except IntegrityError:
            await self._session.rollback()
            raise HTTPException(
                status_code=HTTP_409_CONFLICT,
                detail="A car with this license already exists",
            )

    async def list(self) -> list[Car]:
        result = await self._session.execute(
            select(models.Car).order_by(models.Car.id)
        )
        return [Car.from_orm(car) for car in result.scalars().all()]

    async def create(self, data: CarCreate) -> Car:
        car = models.Car(
            manufacturer=data.manufacturer,
            model=data.model,
            license=data.license,
        )
        self._session.add(car)
        await self._commit_or_conflict()
        return Car.from_orm(car)

    async def update(self, car_id: int, data: CarUpdate) -> Car:
        car = await get_car_or_404(self._session, car_id)
        _apply_updates(car, data)
        await self._commit_or_conflict()
        return Car.from_orm(car)

    async def delete(self, car_id: int) -> None:
        car = await get_car_or_404(self._session, car_id)
        await self._session.delete(car)
        await self._session.commit()


class MileageRecordRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def _get_record_or_404(
        self, car_id: int, record_id: int
    ) -> models.MileageRecord:
        await get_car_or_404(self._session, car_id)
        record = await self._session.get(models.MileageRecord, record_id)
        if record is None or record.car_id != car_id:
            raise NotFoundException(f"Mileage record {record_id} not found")
        return record

    async def get(self, car_id: int, record_id: int) -> MileageRecord:
        return MileageRecord.from_orm(await self._get_record_or_404(car_id, record_id))

    async def list(self, car_id: int) -> list[MileageRecord]:
        await get_car_or_404(self._session, car_id)
        result = await self._session.execute(
            select(models.MileageRecord)
            .where(models.MileageRecord.car_id == car_id)
            .order_by(models.MileageRecord.date, models.MileageRecord.id)
        )
        return [MileageRecord.from_orm(record) for record in result.scalars().all()]

    async def create(self, car_id: int, data: MileageRecordCreate) -> MileageRecord:
        await get_car_or_404(self._session, car_id)
        await _enforce_sequence(
            self._session,
            car_id,
            date_=data.date,
            odometer_reading=data.odometer_reading,
        )
        record = models.MileageRecord(
            car_id=car_id,
            date=data.date,
            odometer_reading=data.odometer_reading,
        )
        self._session.add(record)
        await self._session.commit()
        return MileageRecord.from_orm(record)

    async def update(
        self, car_id: int, record_id: int, data: MileageRecordUpdate
    ) -> MileageRecord:
        record = await self._get_record_or_404(car_id, record_id)
        _apply_updates(record, data)
        await _enforce_sequence(
            self._session,
            car_id,
            date_=record.date,
            odometer_reading=record.odometer_reading,
            exclude=(record.id, "record"),
        )
        await self._session.commit()
        return MileageRecord.from_orm(record)

    async def delete(self, car_id: int, record_id: int) -> None:
        record = await self._get_record_or_404(car_id, record_id)
        await self._session.delete(record)
        await self._session.commit()


class InsuranceReportRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def _get_report_or_404(
        self, car_id: int, report_id: int
    ) -> models.InsuranceReport:
        await get_car_or_404(self._session, car_id)
        report = await self._session.get(models.InsuranceReport, report_id)
        if report is None or report.car_id != car_id:
            raise NotFoundException(f"Insurance report {report_id} not found")
        return report

    async def get(self, car_id: int, report_id: int) -> InsuranceReport:
        return InsuranceReport.from_orm(await self._get_report_or_404(car_id, report_id))

    async def list(self, car_id: int) -> list[InsuranceReport]:
        await get_car_or_404(self._session, car_id)
        result = await self._session.execute(
            select(models.InsuranceReport)
            .where(models.InsuranceReport.car_id == car_id)
            .order_by(models.InsuranceReport.date, models.InsuranceReport.id)
        )
        return [
            InsuranceReport.from_orm(report) for report in result.scalars().all()
        ]

    async def create(self, car_id: int, data: InsuranceReportCreate) -> InsuranceReport:
        await get_car_or_404(self._session, car_id)
        await _enforce_sequence(
            self._session,
            car_id,
            date_=data.date,
            odometer_reading=data.odometer_reading,
        )
        report = models.InsuranceReport(
            car_id=car_id,
            date=data.date,
            odometer_reading=data.odometer_reading,
            mileage_per_year=data.mileage_per_year,
        )
        self._session.add(report)
        await self._session.commit()
        return InsuranceReport.from_orm(report)

    async def update(
        self, car_id: int, report_id: int, data: InsuranceReportUpdate
    ) -> InsuranceReport:
        report = await self._get_report_or_404(car_id, report_id)
        _apply_updates(report, data)
        await _enforce_sequence(
            self._session,
            car_id,
            date_=report.date,
            odometer_reading=report.odometer_reading,
            exclude=(report.id, "report"),
        )
        await self._session.commit()
        return InsuranceReport.from_orm(report)

    async def delete(self, car_id: int, report_id: int) -> None:
        report = await self._get_report_or_404(car_id, report_id)
        await self._session.delete(report)
        await self._session.commit()
