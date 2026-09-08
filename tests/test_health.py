import pytest
from litestar.testing import TestClient


def test_health_check() -> None:
    from src.app import app
    with TestClient(app) as client:
        response = client.get("/api/health")
        assert response.status_code == 200
        assert response.json() == {"status": "ok"}