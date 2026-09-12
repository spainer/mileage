from litestar.exceptions import HTTPException, NotFoundException
from litestar.status_codes import HTTP_409_CONFLICT
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from src import models
from src.schemas import Car, CarCreate, CarUpdate


class CarRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get(self, car_id: int) -> Car:
        car = await self._session.get(models.Car, car_id)
        if car is None:
            raise NotFoundException(f"Car {car_id} not found")
        return Car.from_orm(car)

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
        try:
            await self._session.commit()
        except IntegrityError:
            await self._session.rollback()
            raise HTTPException(
                status_code=HTTP_409_CONFLICT,
                detail="A car with this license already exists",
            )
        return Car.from_orm(car)

    async def update(self, car_id: int, data: CarUpdate) -> Car:
        car = await self._session.get(models.Car, car_id)
        if car is None:
            raise NotFoundException(f"Car {car_id} not found")
        for field, value in data.model_dump(exclude_unset=True).items():
            if value is not None:
                setattr(car, field, value)
        try:
            await self._session.commit()
        except IntegrityError:
            await self._session.rollback()
            raise HTTPException(
                status_code=HTTP_409_CONFLICT,
                detail="A car with this license already exists",
            )
        return Car.from_orm(car)

    async def delete(self, car_id: int) -> None:
        car = await self._session.get(models.Car, car_id)
        if car is None:
            raise NotFoundException(f"Car {car_id} not found")
        await self._session.delete(car)
        await self._session.commit()
