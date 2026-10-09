from pathlib import Path, PurePath
from typing import Any, Callable

from litestar import Litestar, Request, Router, Response, get
from litestar.exceptions import NotFoundException, ValidationException
from litestar.exceptions.responses import create_exception_response
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

# The app shell and manifest must be revalidated on every use so that a launch
# always discovers the deployed frontend version. Fingerprinted assets are safe
# to cache for their whole versioned lifetime.
_REVALIDATE_CACHE_CONTROL = "no-cache, must-revalidate"
_VERSIONED_CACHE_CONTROL = "public, max-age=31536000, immutable"
_NO_STORE_CACHE_CONTROL = "no-store"

_FINGERPRINTED_ASSETS_PREFIX = "assets/"


def cache_control_for(path: str) -> str:
    path = path.lstrip("/")
    if path == "index.html":
        return _REVALIDATE_CACHE_CONTROL
    if path.startswith(_FINGERPRINTED_ASSETS_PREFIX):
        return _VERSIONED_CACHE_CONTROL
    return _REVALIDATE_CACHE_CONTROL


class ApiCacheControlMiddleware:
    """Keep API responses out of browser HTTP caches so app startup always reads current data."""

    def __init__(self, app: Any, path_prefix: str = "/api") -> None:
        self._app = app
        self._prefix = path_prefix

    def _is_api(self, path: str) -> bool:
        return path == self._prefix or path.startswith(self._prefix + "/")

    async def __call__(self, scope: dict, receive: Callable, send: Callable) -> None:
        if scope.get("type") != "http" or not self._is_api(scope.get("path", "")):
            await self._app(scope, receive, send)
            return

        async def send_with_cache_control(message: dict) -> None:
            if message.get("type") == "http.response.start":
                _set_header(message["headers"], "cache-control", _NO_STORE_CACHE_CONTROL)
            await send(message)

        await self._app(scope, receive, send_with_cache_control)


def _set_header(headers: list[tuple[bytes, bytes]], name: str, value: str) -> None:
    encoded_name = name.encode("latin-1")
    for index, (header_name, _) in enumerate(headers):
        if header_name.lower() == encoded_name:
            headers[index] = (header_name, value.encode("latin-1"))
            return
    headers.append((encoded_name, value.encode("latin-1")))


@get("/health", sync_to_thread=False)
def health_check() -> dict[str, str]:
    return {"status": "ok"}


def _pydantic_errors(exc: BaseException) -> list[dict[str, object]]:
    """Recover the machine-readable pydantic error dicts from the cause chain.

    Litestar wraps pydantic's ``ValidationError`` in a validation error whose
    ``errors`` attribute carries the pydantic error dicts (``type``, ``loc``,
    ``msg``, ``input``). The items of ``ValidationException.extra`` are built
    from the very same list in the same order, so the two are index-aligned.
    """
    cause = exc.__cause__ if exc.__cause__ is not None else exc.__context__
    while cause is not None:
        errors = getattr(cause, "errors", None)
        if (
            isinstance(errors, list)
            and errors
            and all(
                isinstance(item, dict) and "type" in item and "loc" in item
                for item in errors
            )
        ):
            return errors
        cause = cause.__cause__ if cause.__cause__ is not None else cause.__context__
    return []


def _validation_error_handler(request: Request, exc: ValidationException) -> Response:
    """Ship the pydantic error ``type`` next to every extra item.

    Together with the item's ``key`` (the field name) the ``type`` forms the
    stable machine-readable code for a failed validation (e.g. ``license`` +
    ``value_error``, ``date`` + ``missing``).
    """
    extra = exc.extra
    if isinstance(extra, list):
        for item, error in zip(extra, _pydantic_errors(exc)):
            if isinstance(item, dict):
                item.setdefault("type", error["type"])
    return create_exception_response(request, exc)


def create_spa_router(static_dir: Path) -> Router:
    static_files = StaticFiles(
        is_html_mode=False,
        directories=[static_dir],
        file_system=BaseLocalFileSystem(),
    )

    async def serve(path: str) -> ASGIFileResponse:
        response = await static_files.handle(path=path, is_head_response=False)
        response.headers["cache-control"] = cache_control_for(path)
        return response

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
        exception_handlers={ValidationException: _validation_error_handler},
        middleware=[(ApiCacheControlMiddleware, {"path_prefix": "/api"})],
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
