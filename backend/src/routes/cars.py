from litestar import Router, delete, get, patch, post
from litestar.di import NamedDependency, Provide
from litestar.params import FromPath
from litestar.status_codes import HTTP_201_CREATED, HTTP_204_NO_CONTENT
from sqlalchemy.ext.asyncio import AsyncSession

from src.database import provide_session
from src.repositories import CarRepository
from src.schemas import Car, CarCreate, CarUpdate

Session = NamedDependency[AsyncSession]
CarId = FromPath[int]


@post("/", response_model=Car, status_code=HTTP_201_CREATED)
async def create_car(data: CarCreate, session: Session) -> Car:
    return await CarRepository(session).create(data)


@get("/", response_model=list[Car])
async def list_cars(session: Session) -> list[Car]:
    return await CarRepository(session).list()


@get("/{car_id:int}", response_model=Car)
async def get_car(car_id: CarId, session: Session) -> Car:
    return await CarRepository(session).get(car_id)


@patch("/{car_id:int}", response_model=Car)
async def update_car(car_id: CarId, data: CarUpdate, session: Session) -> Car:
    return await CarRepository(session).update(car_id, data)


@delete("/{car_id:int}", status_code=HTTP_204_NO_CONTENT)
async def delete_car(car_id: CarId, session: Session) -> None:
    await CarRepository(session).delete(car_id)


car_router = Router(
    path="/cars",
    dependencies={"session": Provide(provide_session)},
    route_handlers=[create_car, list_cars, get_car, update_car, delete_car],
)
