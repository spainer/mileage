def create_car(client, license: str = "GOLF1") -> dict:
    return client.post(
        "/api/cars",
        json={"manufacturer": "VW", "model": "Golf", "license": license},
    ).json()


def create_record(
    client, car_id: int, day: str = "2026-01-15", odometer_reading: int = 1000
):
    return client.post(
        f"/api/cars/{car_id}/mileage-records",
        json={"date": day, "odometer_reading": odometer_reading},
    )


def test_create_mileage_record(client):
    car = create_car(client)

    response = create_record(client, car["id"])

    assert response.status_code == 201
    data = response.json()
    assert isinstance(data["id"], int)
    assert data["car_id"] == car["id"]
    assert data["date"] == "2026-01-15"
    assert data["odometer_reading"] == 1000


def test_create_mileage_record_accepts_zero_odometer_reading(client):
    car = create_car(client)

    response = create_record(client, car["id"], odometer_reading=0)

    assert response.status_code == 201
    assert response.json()["odometer_reading"] == 0


def test_create_mileage_record_rejects_negative_odometer_reading(client):
    car = create_car(client)

    response = create_record(client, car["id"], odometer_reading=-1)

    assert response.status_code == 400


def test_create_mileage_record_rejects_non_integer_odometer_reading(client):
    car = create_car(client)

    response = client.post(
        f"/api/cars/{car['id']}/mileage-records",
        json={"date": "2026-01-15", "odometer_reading": 1.5},
    )

    assert response.status_code == 400


def test_create_mileage_record_rejects_invalid_date(client):
    car = create_car(client)

    response = client.post(
        f"/api/cars/{car['id']}/mileage-records",
        json={"date": "2026-02-30", "odometer_reading": 1000},
    )

    assert response.status_code == 400


def test_list_mileage_records(client):
    car = create_car(client)
    first = create_record(
        client, car["id"], day="2026-01-15", odometer_reading=1000
    ).json()
    second = create_record(
        client, car["id"], day="2026-03-01", odometer_reading=1500
    ).json()
    other = create_car(client, license="BBB2")
    third = create_record(
        client, other["id"], day="2026-02-01", odometer_reading=500
    ).json()

    response = client.get(f"/api/cars/{car['id']}/mileage-records")

    assert response.status_code == 200
    data = response.json()
    assert {record["id"] for record in data} == {first["id"], second["id"]}
    assert third["id"] not in {record["id"] for record in data}
    assert [record["date"] for record in data] == ["2026-01-15", "2026-03-01"]


def test_list_mileage_records_empty(client):
    car = create_car(client)

    response = client.get(f"/api/cars/{car['id']}/mileage-records")

    assert response.status_code == 200
    assert response.json() == []


def test_list_mileage_records_for_missing_car_returns_404(client):
    response = client.get("/api/cars/999/mileage-records")

    assert response.status_code == 404


def test_get_mileage_record_by_id(client):
    car = create_car(client)
    created = create_record(client, car["id"]).json()

    response = client.get(f"/api/cars/{car['id']}/mileage-records/{created['id']}")

    assert response.status_code == 200
    assert response.json() == created


def test_get_missing_mileage_record_returns_404(client):
    car = create_car(client)

    response = client.get(f"/api/cars/{car['id']}/mileage-records/999")

    assert response.status_code == 404


def test_get_mileage_record_of_other_car_returns_404(client):
    car = create_car(client)
    record = create_record(client, car["id"]).json()
    other = create_car(client, license="BBB2")

    response = client.get(f"/api/cars/{other['id']}/mileage-records/{record['id']}")

    assert response.status_code == 404


def test_get_mileage_record_for_missing_car_returns_404(client):
    car = create_car(client)
    record = create_record(client, car["id"]).json()

    response = client.get(f"/api/cars/999/mileage-records/{record['id']}")

    assert response.status_code == 404


def test_update_mileage_record(client):
    car = create_car(client)
    created = create_record(client, car["id"]).json()

    response = client.patch(
        f"/api/cars/{car['id']}/mileage-records/{created['id']}",
        json={"date": "2026-02-01", "odometer_reading": 1200},
    )

    assert response.status_code == 200
    data = response.json()
    assert data == {**created, "date": "2026-02-01", "odometer_reading": 1200}
    assert client.get(
        f"/api/cars/{car['id']}/mileage-records/{created['id']}"
    ).json() == data


def test_update_mileage_record_partial(client):
    car = create_car(client)
    created = create_record(client, car["id"]).json()

    response = client.patch(
        f"/api/cars/{car['id']}/mileage-records/{created['id']}",
        json={"odometer_reading": 1100},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["date"] == "2026-01-15"
    assert data["odometer_reading"] == 1100


def test_update_mileage_record_rejects_negative_odometer_reading(client):
    car = create_car(client)
    created = create_record(client, car["id"]).json()

    response = client.patch(
        f"/api/cars/{car['id']}/mileage-records/{created['id']}",
        json={"odometer_reading": -5},
    )

    assert response.status_code == 400


def test_update_mileage_record_rejects_invalid_date(client):
    car = create_car(client)
    created = create_record(client, car["id"]).json()

    response = client.patch(
        f"/api/cars/{car['id']}/mileage-records/{created['id']}",
        json={"date": "2026-02-30"},
    )

    assert response.status_code == 400


def test_update_missing_mileage_record_returns_404(client):
    car = create_car(client)

    response = client.patch(
        f"/api/cars/{car['id']}/mileage-records/999",
        json={"odometer_reading": 1},
    )

    assert response.status_code == 404


def test_update_mileage_record_of_other_car_returns_404(client):
    car = create_car(client)
    record = create_record(client, car["id"]).json()
    other = create_car(client, license="BBB2")

    response = client.patch(
        f"/api/cars/{other['id']}/mileage-records/{record['id']}",
        json={"odometer_reading": 1},
    )

    assert response.status_code == 404


def test_delete_mileage_record(client):
    car = create_car(client)
    created = create_record(client, car["id"]).json()

    response = client.delete(f"/api/cars/{car['id']}/mileage-records/{created['id']}")

    assert response.status_code == 204
    assert client.get(
        f"/api/cars/{car['id']}/mileage-records/{created['id']}"
    ).status_code == 404
    assert client.get(f"/api/cars/{car['id']}/mileage-records").json() == []


def test_delete_missing_mileage_record_returns_404(client):
    car = create_car(client)

    response = client.delete(f"/api/cars/{car['id']}/mileage-records/999")

    assert response.status_code == 404


def test_delete_mileage_record_of_other_car_returns_404(client):
    car = create_car(client)
    record = create_record(client, car["id"]).json()
    other = create_car(client, license="BBB2")

    response = client.delete(
        f"/api/cars/{other['id']}/mileage-records/{record['id']}"
    )

    assert response.status_code == 404


def test_create_mileage_record_for_missing_car_returns_404(client):
    response = client.post(
        "/api/cars/999/mileage-records",
        json={"date": "2026-01-15", "odometer_reading": 1000},
    )

    assert response.status_code == 404


def test_deleting_car_removes_its_mileage_records(client, db_url):
    from sqlalchemy import create_engine, text

    from src.database import sync_url

    car = create_car(client)
    assert create_record(client, car["id"]).status_code == 201

    client.delete(f"/api/cars/{car['id']}")

    assert client.get(f"/api/cars/{car['id']}").status_code == 404

    engine = create_engine(sync_url(db_url))
    with engine.connect() as connection:
        rows = connection.execute(
            text("SELECT COUNT(*) FROM mileage_records WHERE car_id = :car_id"),
            {"car_id": car["id"]},
        ).scalar_one()
    engine.dispose()
    assert rows == 0
