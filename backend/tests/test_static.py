from pathlib import Path

import pytest

SHELL = '<!doctype html><html><head><title>Mileage</title></head><body><div id="app"></div></body></html>'
ASSET = "console.log('mileage');"


@pytest.fixture
def static_dir(tmp_path) -> Path:
    dist = tmp_path / "dist"
    (dist / "assets").mkdir(parents=True)
    (dist / "index.html").write_text(SHELL)
    (dist / "assets" / "app.js").write_text(ASSET)
    return dist


def test_root_returns_app_shell(client):
    response = client.get("/")

    assert response.status_code == 200
    assert response.text == SHELL
    assert response.headers["content-type"].startswith("text/html")


def test_extensionless_client_side_route_returns_app_shell(client):
    response = client.get("/garage")

    assert response.status_code == 200
    assert response.text == SHELL
    assert response.headers["content-type"].startswith("text/html")


def test_existing_asset_is_served_with_content_and_content_type(client):
    response = client.get("/assets/app.js")

    assert response.status_code == 200
    assert response.text == ASSET
    assert response.headers["content-type"].startswith("text/javascript")


def test_missing_asset_like_path_returns_404(client):
    response = client.get("/assets/missing.js")

    assert response.status_code == 404


def test_missing_top_level_asset_returns_404(client):
    response = client.get("/favicon.ico")

    assert response.status_code == 404


def test_api_routes_work_with_static_dir_present(client):
    response = client.get("/api/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_api_404_is_not_masked_by_app_shell(client):
    response = client.get("/api/does-not-exist")

    assert response.status_code == 404
    assert response.text != SHELL
