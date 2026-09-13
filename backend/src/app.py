from litestar import Litestar, get
from litestar.openapi import OpenAPIConfig
from litestar.openapi.plugins import SwaggerRenderPlugin

from src.database import lifespan
from src.routes.cars import car_router
from src.routes.insurance_reports import insurance_reports_router
from src.routes.mileage_records import mileage_records_router


@get("/health", sync_to_thread=False)
def health_check() -> dict[str, str]:
    return {"status": "ok"}


# Application instance
app = Litestar(
    route_handlers=[
        health_check,
        car_router,
        mileage_records_router,
        insurance_reports_router,
    ],
    path="/api",
    lifespan=[lifespan],
    openapi_config=OpenAPIConfig(
        title="Mileage API",
        version="1",
        render_plugins=[SwaggerRenderPlugin()],
    ),
)
