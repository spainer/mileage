def test_import_app():
    """Test that we can import the app successfully."""
    from src.app import app

    assert app is not None


def test_without_static_dir_api_still_works(client):
    response = client.get("/api/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_without_static_dir_root_returns_404(client):
    response = client.get("/")

    assert response.status_code == 404