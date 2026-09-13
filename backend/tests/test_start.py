def test_client_fixture_migrates_fresh_database(client, db_url):
    from sqlalchemy import create_engine, inspect

    from src.database import sync_url

    tables = set(inspect(create_engine(sync_url(db_url))).get_table_names())
    assert {"cars", "mileage_records", "insurance_reports"} <= tables
