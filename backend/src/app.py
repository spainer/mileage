from pathlib import Path, PurePath

from litestar import Litestar, Router, get
from litestar.exceptions import NotFoundException
from litestar.file_system import BaseLocalFileSystem
from litestar.openapi import OpenAPIConfig
from litestar.openapi.plugins import SwaggerRenderPlugin
from litestar.params import FromPath
from litestar.response.file import ASGIFileResponse
from litestar.static_files import StaticFiles

from src.database import lifespan
from src.routes.cars import car_router
from src.routes.insurance_reports import insurance_reports_router
from src.routes.mileage_records import mileage_records_router
from src.settings import settings


@get("/health", sync_to_thread=False)
def health_check() -> dict[str, str]:
    return {"status": "ok"}


def create_spa_router(static_dir: Path) -> Router:
    static_files = StaticFiles(
        is_html_mode=False,
        directories=[static_dir],
        file_system=BaseLocalFileSystem(),
    )

    async def serve(path: str) -> ASGIFileResponse:
        return await static_files.handle(path=path, is_head_response=False)

    @get("/", name="app-shell")
    async def app_shell() -> ASGIFileResponse:
        return await serve("index.html")

    @get("/{path:path}", name="static-or-shell")
    async def static_or_shell(path: FromPath[PurePath]) -> ASGIFileResponse:
        try:
            return await serve(path.as_posix())
        except NotFoundException:
            if path.suffix:
                raise
            return await serve("index.html")

    return Router(path="/", route_handlers=[app_shell, static_or_shell], include_in_schema=False)


def create_app(static_dir: Path | None) -> Litestar:
    route_handlers: list[Router] = [
        Router(
            path="/api",
            route_handlers=[
                health_check,
                car_router,
                mileage_records_router,
                insurance_reports_router,
            ],
        )
    ]
    if static_dir is not None and static_dir.is_dir():
        route_handlers.append(create_spa_router(static_dir))
    return Litestar(
        route_handlers=route_handlers,
        lifespan=[lifespan],
        openapi_config=OpenAPIConfig(
            title="Mileage API",
            version="1",
            path="/api/schema",
            render_plugins=[SwaggerRenderPlugin()],
        ),
    )


# Application instance
app = create_app(Path(settings.static_dir))
