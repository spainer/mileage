def test_import_app():
    """Test that we can import the app successfully."""
    from src.app import app
    
    assert app is not None