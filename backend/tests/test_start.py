def test_client_fixture_migrates_fresh_database(client, tmp_path):
    from sqlalchemy import create_engine, inspect

    sync_url = "sqlite:///" + str(tmp_path / "client.db")
    tables = set(inspect(create_engine(sync_url)).get_table_names())
    assert {"cars", "mileage_records", "insurance_reports"} <= tables
