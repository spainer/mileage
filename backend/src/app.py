from litestar import Litestar, get


@get("/api/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}


# Application instance
app = Litestar(route_handlers=[health_check])