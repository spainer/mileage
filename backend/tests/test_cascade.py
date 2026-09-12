import asyncio
import datetime


def test_deleting_car_cascades_at_runtime(db_url: str) -> None:
    from src.database import configure, get_engine, get_session, run_alembic_upgrade
    from src import models
    from sqlalchemy import select

    configure(db_url)
    run_alembic_upgrade(db_url)

    async def scenario() -> int:
        session = get_session()
        async with session() as s:
            car = models.Car(manufacturer="VW", model="Golf", license="ABCD")
            s.add(car)
            await s.commit()
            car_id = car.id

            day = datetime.date(2026, 1, 1)
            s.add(models.MileageRecord(car_id=car_id, date=day, value=100))
            s.add(models.InsuranceReport(car_id=car_id, date=day, value=100,
                                        mileage_per_year=15000))
            await s.commit()

            car = await s.get(models.Car, car_id)
            await s.delete(car)
            await s.commit()

            rows = (await s.execute(select(models.MileageRecord))).scalars().all()
            return len(rows)

    try:
        count = asyncio.run(scenario())
        assert count == 0
    finally:
        asyncio.run(get_engine().dispose())
