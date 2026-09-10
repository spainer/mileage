from litestar import Litestar, get


@get("/health", sync_to_thread=False)
def health_check() -> dict[str, str]:
    return {"status": "ok"}


# Application instance
app = Litestar(route_handlers=[health_check], path="/api")
