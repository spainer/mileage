from litestar.exceptions import HTTPException, NotFoundException
from litestar.status_codes import HTTP_409_CONFLICT
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from src import models
from src.schemas import (
    Car,
    CarCreate,
    CarUpdate,
    MileageRecord,
    MileageRecordCreate,
    MileageRecordUpdate,
)


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
        await self._session.commit()
        return MileageRecord.from_orm(record)

    async def delete(self, car_id: int, record_id: int) -> None:
        record = await self._get_record_or_404(car_id, record_id)
        await self._session.delete(record)
        await self._session.commit()
