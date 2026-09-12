from litestar import Litestar, get

from src.database import lifespan
from src.routes.cars import car_router


@get("/health", sync_to_thread=False)
def health_check() -> dict[str, str]:
    return {"status": "ok"}


# Application instance
app = Litestar(
    route_handlers=[health_check, car_router],
    path="/api",
    lifespan=[lifespan],
)
