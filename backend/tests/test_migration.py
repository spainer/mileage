import datetime
import logging

import pytest
from sqlalchemy import create_engine, event, inspect
from sqlalchemy.orm import sessionmaker


def test_initial_migration_creates_three_tables(db_url: str) -> None:
    from src.database import run_alembic_upgrade, configure

    configure(db_url)
    run_alembic_upgrade(db_url)

    tables = set(inspect(create_engine(db_url.replace("+aiosqlite", ""))).get_table_names())
    assert {"cars", "mileage_records", "insurance_reports"} <= tables


def test_deleting_car_cascades_to_children(db_url: str) -> None:
    from src import models
    from src.database import run_alembic_upgrade, configure

    configure(db_url)
    run_alembic_upgrade(db_url)

    engine = create_engine(db_url.replace("+aiosqlite", ""))

    @event.listens_for(engine, "connect")
    def _enable_fk(dbapi_connection: object, _: object) -> None:
        conn = dbapi_connection
        conn.execute("PRAGMA foreign_keys = ON")

    session = sessionmaker(bind=engine, expire_on_commit=True)()

    car = models.Car(manufacturer="VW", model="Golf", license="ABCD")
    session.add(car)
    session.commit()

    day = datetime.date(2026, 1, 1)
    session.add(models.MileageRecord(car_id=car.id, date=day, value=100))
    session.add(
        models.InsuranceReport(
            car_id=car.id, date=day, value=100, mileage_per_year=15000
            )
            )
    session.commit()

    session.delete(car)
    session.commit()

    assert len(session.query(models.MileageRecord).all()) == 0
    assert len(session.query(models.InsuranceReport).all()) == 0


def test_second_startup_is_noop(db_url: str) -> None:
    from src.database import run_alembic_upgrade, configure

    configure(db_url)
    run_alembic_upgrade(db_url)

    before = set(inspect(create_engine(db_url.replace("+aiosqlite", ""))).get_table_names())

    run_alembic_upgrade(db_url)

    after = set(inspect(create_engine(db_url.replace("+aiosqlite", ""))).get_table_names())
    assert before == after


def test_partial_migration_is_logged_not_fatal(
    caplog: "pytest.LogCaptureFixture", db_url: str
) -> None:
    from src.database import run_alembic_upgrade

    sync_url = db_url.replace("+aiosqlite", "")
    engine = create_engine(sync_url)
    with engine.begin() as conn:
        conn.exec_driver_sql("CREATE TABLE cars (id INTEGER PRIMARY KEY)")

    with caplog.at_level(logging.WARNING, logger="src.database"):
        run_alembic_upgrade(sync_url)

    assert any("schema migration did not complete" in r.getMessage() for r in caplog.records)
