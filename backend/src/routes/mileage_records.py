from litestar import Router, delete, get, patch, post
from litestar.di import Provide
from litestar.params import FromPath
from litestar.status_codes import HTTP_201_CREATED, HTTP_204_NO_CONTENT

from src.database import provide_session
from src.repositories import MileageRecordRepository
from src.routes.dependencies import CarId, Session
from src.schemas import MileageRecord, MileageRecordCreate, MileageRecordUpdate

MileageRecordId = FromPath[int]


@post("/", response_model=MileageRecord, status_code=HTTP_201_CREATED)
async def create_mileage_record(
    car_id: CarId, data: MileageRecordCreate, session: Session
) -> MileageRecord:
    return await MileageRecordRepository(session).create(car_id, data)


@get("/", response_model=list[MileageRecord])
async def list_mileage_records(car_id: CarId, session: Session) -> list[MileageRecord]:
    return await MileageRecordRepository(session).list(car_id)


@get("/{mileage_record_id:int}", response_model=MileageRecord)
async def get_mileage_record(
    car_id: CarId, mileage_record_id: MileageRecordId, session: Session
) -> MileageRecord:
    return await MileageRecordRepository(session).get(car_id, mileage_record_id)


@patch("/{mileage_record_id:int}", response_model=MileageRecord)
async def update_mileage_record(
    car_id: CarId,
    mileage_record_id: MileageRecordId,
    data: MileageRecordUpdate,
    session: Session,
) -> MileageRecord:
    return await MileageRecordRepository(session).update(
        car_id, mileage_record_id, data
    )


@delete("/{mileage_record_id:int}", status_code=HTTP_204_NO_CONTENT)
async def delete_mileage_record(
    car_id: CarId, mileage_record_id: MileageRecordId, session: Session
) -> None:
    await MileageRecordRepository(session).delete(car_id, mileage_record_id)


mileage_records_router = Router(
    path="/cars/{car_id:int}/mileage-records",
    dependencies={"session": Provide(provide_session)},
    route_handlers=[
        create_mileage_record,
        list_mileage_records,
        get_mileage_record,
        update_mileage_record,
        delete_mileage_record,
    ],
)
