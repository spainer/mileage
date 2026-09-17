def create_car(client, license: str = "M-AB1234") -> dict:
    return client.post(
        "/api/cars",
        json={"manufacturer": "VW", "model": "Golf", "license": license},
    ).json()


def create_report(
    client,
    car_id: int,
    day: str = "2026-01-15",
    odometer_reading: int = 1000,
    mileage_per_year: int = 15000,
):
    return client.post(
        f"/api/cars/{car_id}/insurance-reports",
        json={
            "date": day,
            "odometer_reading": odometer_reading,
            "mileage_per_year": mileage_per_year,
        },
    )


def test_create_insurance_report(client):
    car = create_car(client)

    response = create_report(client, car["id"])

    assert response.status_code == 201
    data = response.json()
    assert isinstance(data["id"], int)
    assert data["car_id"] == car["id"]
    assert data["date"] == "2026-01-15"
    assert data["odometer_reading"] == 1000
    assert data["mileage_per_year"] == 15000


def test_create_insurance_report_accepts_zero_odometer_reading(client):
    car = create_car(client)

    response = create_report(client, car["id"], odometer_reading=0)

    assert response.status_code == 201
    assert response.json()["odometer_reading"] == 0


def test_create_insurance_report_accepts_zero_mileage_per_year(client):
    car = create_car(client)

    response = create_report(client, car["id"], mileage_per_year=0)

    assert response.status_code == 201
    assert response.json()["mileage_per_year"] == 0


def test_create_insurance_report_rejects_negative_odometer_reading(client):
    car = create_car(client)

    response = create_report(client, car["id"], odometer_reading=-1)

    assert response.status_code == 400


def test_create_insurance_report_rejects_negative_mileage_per_year(client):
    car = create_car(client)

    response = create_report(client, car["id"], mileage_per_year=-1)

    assert response.status_code == 400


def test_create_insurance_report_rejects_non_integer_odometer_reading(client):
    car = create_car(client)

    response = client.post(
        f"/api/cars/{car['id']}/insurance-reports",
        json={"date": "2026-01-15", "odometer_reading": 1.5, "mileage_per_year": 15000},
    )

    assert response.status_code == 400


def test_create_insurance_report_rejects_non_integer_mileage_per_year(client):
    car = create_car(client)

    response = client.post(
        f"/api/cars/{car['id']}/insurance-reports",
        json={"date": "2026-01-15", "odometer_reading": 1000, "mileage_per_year": 1.5},
    )

    assert response.status_code == 400


def test_create_insurance_report_rejects_invalid_date(client):
    car = create_car(client)

    response = client.post(
        f"/api/cars/{car['id']}/insurance-reports",
        json={"date": "2026-02-30", "odometer_reading": 1000, "mileage_per_year": 15000},
    )

    assert response.status_code == 400


def test_create_insurance_report_for_missing_car_returns_404(client):
    response = client.post(
        "/api/cars/999/insurance-reports",
        json={"date": "2026-01-15", "odometer_reading": 1000, "mileage_per_year": 15000},
    )

    assert response.status_code == 404


def test_list_insurance_reports(client):
    car = create_car(client)
    first = create_report(
        client, car["id"], day="2026-01-15", odometer_reading=1000,
        mileage_per_year=15000,
    ).json()
    second = create_report(
        client, car["id"], day="2026-03-01", odometer_reading=1500,
        mileage_per_year=20000,
    ).json()
    other = create_car(client, license="B-KW4567")
    third = create_report(client, other["id"]).json()

    response = client.get(f"/api/cars/{car['id']}/insurance-reports")

    assert response.status_code == 200
    data = response.json()
    assert {report["id"] for report in data} == {first["id"], second["id"]}
    assert third["id"] not in {report["id"] for report in data}
    assert [report["date"] for report in data] == ["2026-01-15", "2026-03-01"]


def test_list_insurance_reports_empty(client):
    car = create_car(client)

    response = client.get(f"/api/cars/{car['id']}/insurance-reports")

    assert response.status_code == 200
    assert response.json() == []


def test_list_insurance_reports_for_missing_car_returns_404(client):
    response = client.get("/api/cars/999/insurance-reports")

    assert response.status_code == 404


def test_get_insurance_report_by_id(client):
    car = create_car(client)
    created = create_report(client, car["id"]).json()

    response = client.get(
        f"/api/cars/{car['id']}/insurance-reports/{created['id']}"
    )

    assert response.status_code == 200
    assert response.json() == created


def test_get_missing_insurance_report_returns_404(client):
    car = create_car(client)

    response = client.get(f"/api/cars/{car['id']}/insurance-reports/999")

    assert response.status_code == 404


def test_get_insurance_report_of_other_car_returns_404(client):
    car = create_car(client)
    report = create_report(client, car["id"]).json()
    other = create_car(client, license="B-KW4567")

    response = client.get(
        f"/api/cars/{other['id']}/insurance-reports/{report['id']}"
    )

    assert response.status_code == 404


def test_get_insurance_report_for_missing_car_returns_404(client):
    car = create_car(client)
    report = create_report(client, car["id"]).json()

    response = client.get(f"/api/cars/999/insurance-reports/{report['id']}")

    assert response.status_code == 404


def test_update_insurance_report(client):
    car = create_car(client)
    created = create_report(client, car["id"]).json()

    response = client.patch(
        f"/api/cars/{car['id']}/insurance-reports/{created['id']}",
        json={
            "date": "2026-02-01",
            "odometer_reading": 1200,
            "mileage_per_year": 18000,
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert data == {
        **created,
        "date": "2026-02-01",
        "odometer_reading": 1200,
        "mileage_per_year": 18000,
    }
    assert client.get(
        f"/api/cars/{car['id']}/insurance-reports/{created['id']}"
    ).json() == data


def test_update_insurance_report_partial(client):
    car = create_car(client)
    created = create_report(client, car["id"]).json()

    response = client.patch(
        f"/api/cars/{car['id']}/insurance-reports/{created['id']}",
        json={"mileage_per_year": 12000},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["date"] == "2026-01-15"
    assert data["odometer_reading"] == 1000
    assert data["mileage_per_year"] == 12000


def test_update_insurance_report_rejects_negative_odometer_reading(client):
    car = create_car(client)
    created = create_report(client, car["id"]).json()

    response = client.patch(
        f"/api/cars/{car['id']}/insurance-reports/{created['id']}",
        json={"odometer_reading": -5},
    )

    assert response.status_code == 400


def test_update_insurance_report_rejects_negative_mileage_per_year(client):
    car = create_car(client)
    created = create_report(client, car["id"]).json()

    response = client.patch(
        f"/api/cars/{car['id']}/insurance-reports/{created['id']}",
        json={"mileage_per_year": -5},
    )

    assert response.status_code == 400


def test_update_insurance_report_rejects_invalid_date(client):
    car = create_car(client)
    created = create_report(client, car["id"]).json()

    response = client.patch(
        f"/api/cars/{car['id']}/insurance-reports/{created['id']}",
        json={"date": "2026-02-30"},
    )

    assert response.status_code == 400


def test_update_missing_insurance_report_returns_404(client):
    car = create_car(client)

    response = client.patch(
        f"/api/cars/{car['id']}/insurance-reports/999",
        json={"mileage_per_year": 1},
    )

    assert response.status_code == 404


def test_update_insurance_report_of_other_car_returns_404(client):
    car = create_car(client)
    report = create_report(client, car["id"]).json()
    other = create_car(client, license="B-KW4567")

    response = client.patch(
        f"/api/cars/{other['id']}/insurance-reports/{report['id']}",
        json={"mileage_per_year": 1},
    )

    assert response.status_code == 404


def test_update_insurance_report_for_missing_car_returns_404(client):
    car = create_car(client)
    report = create_report(client, car["id"]).json()

    response = client.patch(
        f"/api/cars/999/insurance-reports/{report['id']}",
        json={"mileage_per_year": 1},
    )

    assert response.status_code == 404


def test_delete_insurance_report(client):
    car = create_car(client)
    created = create_report(client, car["id"]).json()

    response = client.delete(
        f"/api/cars/{car['id']}/insurance-reports/{created['id']}"
    )

    assert response.status_code == 204
    assert client.get(
        f"/api/cars/{car['id']}/insurance-reports/{created['id']}"
    ).status_code == 404
    assert client.get(f"/api/cars/{car['id']}/insurance-reports").json() == []


def test_delete_missing_insurance_report_returns_404(client):
    car = create_car(client)

    response = client.delete(f"/api/cars/{car['id']}/insurance-reports/999")

    assert response.status_code == 404


def test_delete_insurance_report_of_other_car_returns_404(client):
    car = create_car(client)
    report = create_report(client, car["id"]).json()
    other = create_car(client, license="B-KW4567")

    response = client.delete(
        f"/api/cars/{other['id']}/insurance-reports/{report['id']}"
    )

    assert response.status_code == 404


def test_deleting_car_removes_its_insurance_reports(client, db_url):
    from sqlalchemy import create_engine, text

    from src.database import sync_url

    car = create_car(client)
    assert create_report(client, car["id"]).status_code == 201

    client.delete(f"/api/cars/{car['id']}")

    assert client.get(f"/api/cars/{car['id']}").status_code == 404

    engine = create_engine(sync_url(db_url))
    with engine.connect() as connection:
        rows = connection.execute(
            text("SELECT COUNT(*) FROM insurance_reports WHERE car_id = :car_id"),
            {"car_id": car["id"]},
        ).scalar_one()
    engine.dispose()
    assert rows == 0


def test_create_insurance_report_rejects_below_prior(client):
    car = create_car(client)
    create_report(
        client, car["id"], day="2026-01-15", odometer_reading=1000,
        mileage_per_year=15000,
    )

    response = create_report(
        client, car["id"], day="2026-06-01", odometer_reading=999,
        mileage_per_year=15000,
    )

    assert response.status_code == 409
    assert "1,000" in response.json()["detail"]


def test_create_insurance_report_accepts_equal_to_prior(client):
    car = create_car(client)
    create_report(
        client, car["id"], day="2026-01-15", odometer_reading=1000,
        mileage_per_year=15000,
    )

    response = create_report(
        client, car["id"], day="2026-06-01", odometer_reading=1000,
        mileage_per_year=15000,
    )

    assert response.status_code == 201


def test_create_insurance_report_rejects_above_later(client):
    car = create_car(client)
    create_report(
        client, car["id"], day="2026-06-01", odometer_reading=2000,
        mileage_per_year=15000,
    )

    response = create_report(
        client, car["id"], day="2026-01-15", odometer_reading=2001,
        mileage_per_year=15000,
    )

    assert response.status_code == 409
    assert "2,000" in response.json()["detail"]


def test_create_insurance_report_accepts_equal_to_later(client):
    car = create_car(client)
    create_report(
        client, car["id"], day="2026-06-01", odometer_reading=2000,
        mileage_per_year=15000,
    )

    response = create_report(
        client, car["id"], day="2026-01-15", odometer_reading=2000,
        mileage_per_year=15000,
    )

    assert response.status_code == 201


def test_create_insurance_report_rejects_same_date_mismatch(client):
    car = create_car(client)
    create_report(
        client, car["id"], day="2026-01-15", odometer_reading=1500,
        mileage_per_year=15000,
    )

    response = create_report(
        client, car["id"], day="2026-01-15", odometer_reading=1501,
        mileage_per_year=15000,
    )

    assert response.status_code == 409
    assert "1,500" in response.json()["detail"]


def test_create_insurance_report_rejects_outside_bounds(client):
    car = create_car(client)
    create_report(
        client, car["id"], day="2025-06-01", odometer_reading=1000,
        mileage_per_year=15000,
    )
    create_report(
        client, car["id"], day="2026-06-01", odometer_reading=3000,
        mileage_per_year=15000,
    )

    too_low = create_report(
        client, car["id"], day="2026-01-15", odometer_reading=999,
        mileage_per_year=15000,
    )
    too_high = create_report(
        client, car["id"], day="2026-01-15", odometer_reading=3001,
        mileage_per_year=15000,
    )
    just_right = create_report(
        client, car["id"], day="2026-01-15", odometer_reading=2000,
        mileage_per_year=15000,
    )

    assert too_low.status_code == 409
    assert too_high.status_code == 409
    assert just_right.status_code == 201


def test_create_insurance_report_entries_of_other_cars_do_not_constrain(client):
    car = create_car(client)
    other = create_car(client, license="B-KW4567")
    create_report(
        client, other["id"], day="2026-06-01", odometer_reading=10000,
        mileage_per_year=15000,
    )

    response = create_report(
        client, car["id"], day="2026-01-15", odometer_reading=0,
        mileage_per_year=15000,
    )

    assert response.status_code == 201


def test_update_insurance_report_excludes_self_from_validation(client):
    car = create_car(client)
    report = create_report(
        client, car["id"], day="2026-01-15", odometer_reading=1000,
        mileage_per_year=15000,
    ).json()

    response = client.patch(
        f"/api/cars/{car['id']}/insurance-reports/{report['id']}",
        json={"odometer_reading": 1001},
    )

    assert response.status_code == 200
    assert response.json()["odometer_reading"] == 1001


def test_update_insurance_report_respects_other_entries(client):
    car = create_car(client)
    report = create_report(
        client, car["id"], day="2026-01-15", odometer_reading=1500,
        mileage_per_year=15000,
    ).json()
    create_report(
        client, car["id"], day="2026-06-01", odometer_reading=2000,
        mileage_per_year=15000,
    )

    response = client.patch(
        f"/api/cars/{car['id']}/insurance-reports/{report['id']}",
        json={"odometer_reading": 2001},
    )

    assert response.status_code == 409
    assert "2,000" in response.json()["detail"]


def test_update_insurance_report_can_move_into_range(client):
    car = create_car(client)
    report = create_report(
        client, car["id"], day="2026-01-15", odometer_reading=1500,
        mileage_per_year=15000,
    ).json()
    create_report(
        client, car["id"], day="2026-06-01", odometer_reading=2000,
        mileage_per_year=15000,
    )

    response = client.patch(
        f"/api/cars/{car['id']}/insurance-reports/{report['id']}",
        json={"odometer_reading": 1999},
    )

    assert response.status_code == 200
    assert response.json()["odometer_reading"] == 1999


def test_create_insurance_report_constrained_by_mileage_record(client):
    from tests.test_mileage_records import create_record

    car = create_car(client)
    create_record(client, car["id"], day="2025-06-01", odometer_reading=1000)

    response = create_report(
        client, car["id"], day="2026-01-15", odometer_reading=999,
        mileage_per_year=15000,
    )

    assert response.status_code == 409
    assert "1,000" in response.json()["detail"]
