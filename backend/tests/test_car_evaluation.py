from datetime import date, timedelta


def create_car(client, license: str = "M-AB1234") -> dict:
    return client.post(
        "/api/cars",
        json={"manufacturer": "VW", "model": "Golf", "license": license},
    ).json()


def create_record(
    client, car_id: int, day: str, odometer_reading: int = 1000
):
    return client.post(
        f"/api/cars/{car_id}/mileage-records",
        json={"date": day, "odometer_reading": odometer_reading},
    )


def create_report(
    client,
    car_id: int,
    day: str,
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


def test_get_today_evaluation_for_car_with_report_and_records(client):
    today = date.today()
    car = create_car(client)
    create_report(
        client,
        car["id"],
        (today - timedelta(days=1)).isoformat(),
        odometer_reading=1000,
        mileage_per_year=0,
    )
    create_record(client, car["id"], today.isoformat(), odometer_reading=1500)

    response = client.get(f"/api/cars/{car['id']}/evaluation")

    assert response.status_code == 200
    assert response.json() == {"theoretical_limit": 1000, "delta": 500}


def test_get_today_evaluation_without_insurance_reports_is_null(client):
    today = date.today().isoformat()
    car = create_car(client)
    create_record(client, car["id"], today, odometer_reading=1500)

    response = client.get(f"/api/cars/{car['id']}/evaluation")

    assert response.status_code == 200
    assert response.json() is None


def test_get_today_evaluation_without_mileage_records_has_null_delta(client):
    today = date.today().isoformat()
    car = create_car(client)
    create_report(client, car["id"], today, odometer_reading=1000, mileage_per_year=15000)

    response = client.get(f"/api/cars/{car['id']}/evaluation")

    assert response.status_code == 200
    assert response.json() == {"theoretical_limit": 1000, "delta": None}


def test_get_today_evaluation_for_missing_car_returns_404(client):
    response = client.get("/api/cars/999/evaluation")

    assert response.status_code == 404


def test_today_evaluation_schema_is_exposed_on_openapi(client):
    response = client.get("/api/schema/openapi.json")

    assert response.status_code == 200
    assert "TodayEvaluation" in response.json()["components"]["schemas"]
