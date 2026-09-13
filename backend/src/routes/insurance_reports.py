from litestar import Router, delete, get, patch, post
from litestar.di import Provide
from litestar.params import FromPath
from litestar.status_codes import HTTP_201_CREATED, HTTP_204_NO_CONTENT

from src.database import provide_session
from src.repositories import InsuranceReportRepository
from src.routes.dependencies import CarId, Session
from src.schemas import InsuranceReport, InsuranceReportCreate, InsuranceReportUpdate

InsuranceReportId = FromPath[int]


@post("/", response_model=InsuranceReport, status_code=HTTP_201_CREATED)
async def create_insurance_report(
    car_id: CarId, data: InsuranceReportCreate, session: Session
) -> InsuranceReport:
    return await InsuranceReportRepository(session).create(car_id, data)


@get("/", response_model=list[InsuranceReport])
async def list_insurance_reports(
    car_id: CarId, session: Session
) -> list[InsuranceReport]:
    return await InsuranceReportRepository(session).list(car_id)


@get("/{insurance_report_id:int}", response_model=InsuranceReport)
async def get_insurance_report(
    car_id: CarId, insurance_report_id: InsuranceReportId, session: Session
) -> InsuranceReport:
    return await InsuranceReportRepository(session).get(car_id, insurance_report_id)


@patch("/{insurance_report_id:int}", response_model=InsuranceReport)
async def update_insurance_report(
    car_id: CarId,
    insurance_report_id: InsuranceReportId,
    data: InsuranceReportUpdate,
    session: Session,
) -> InsuranceReport:
    return await InsuranceReportRepository(session).update(
        car_id, insurance_report_id, data
    )


@delete("/{insurance_report_id:int}", status_code=HTTP_204_NO_CONTENT)
async def delete_insurance_report(
    car_id: CarId, insurance_report_id: InsuranceReportId, session: Session
) -> None:
    await InsuranceReportRepository(session).delete(car_id, insurance_report_id)


insurance_reports_router = Router(
    path="/cars/{car_id:int}/insurance-reports",
    dependencies={"session": Provide(provide_session)},
    route_handlers=[
        create_insurance_report,
        list_insurance_reports,
        get_insurance_report,
        update_insurance_report,
        delete_insurance_report,
    ],
)
