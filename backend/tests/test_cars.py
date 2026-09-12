def test_create_car(client):
    response = client.post(
        "/api/cars",
        json={"manufacturer": "VW", "model": "Golf", "license": "GOLF1"},
    )
    assert response.status_code == 201
    data = response.json()
    assert isinstance(data["id"], int)
    assert data["manufacturer"] == "VW"
    assert data["model"] == "Golf"
    assert data["license"] == "GOLF1"


def test_get_car_by_id(client):
    created = client.post(
        "/api/cars",
        json={"manufacturer": "VW", "model": "Golf", "license": "GOLF1"},
    ).json()

    response = client.get(f"/api/cars/{created['id']}")

    assert response.status_code == 200
    assert response.json() == created


def test_get_missing_car_returns_404(client):
    response = client.get("/api/cars/999")

    assert response.status_code == 404


def test_list_cars(client):
    first = client.post(
        "/api/cars",
        json={"manufacturer": "VW", "model": "Golf", "license": "AAA1"},
    ).json()
    second = client.post(
        "/api/cars",
        json={"manufacturer": "Toyota", "model": "Corolla", "license": "BBB2"},
    ).json()

    response = client.get("/api/cars")

    assert response.status_code == 200
    data = response.json()
    assert {car["id"] for car in data} == {first["id"], second["id"]}
    assert {car["license"] for car in data} == {"AAA1", "BBB2"}


def test_list_cars_empty(client):
    response = client.get("/api/cars")

    assert response.status_code == 200
    assert response.json() == []


def test_update_car(client):
    created = client.post(
        "/api/cars",
        json={"manufacturer": "VW", "model": "Golf", "license": "GOLF1"},
    ).json()

    response = client.patch(
        f"/api/cars/{created['id']}",
        json={"manufacturer": "Audi", "model": "A3"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data == {**created, "manufacturer": "Audi", "model": "A3"}
    assert client.get(f"/api/cars/{created['id']}").json() == data


def test_update_car_partial(client):
    created = client.post(
        "/api/cars",
        json={"manufacturer": "VW", "model": "Golf", "license": "GOLF1"},
    ).json()

    response = client.patch(f"/api/cars/{created['id']}", json={"model": "Golf VII"})

    assert response.status_code == 200
    data = response.json()
    assert data["manufacturer"] == "VW"
    assert data["model"] == "Golf VII"
    assert data["license"] == "GOLF1"


def test_update_missing_car_returns_404(client):
    response = client.patch("/api/cars/999", json={"model": "Ghost"})

    assert response.status_code == 404


def test_delete_car(client):
    created = client.post(
        "/api/cars",
        json={"manufacturer": "VW", "model": "Golf", "license": "GOLF1"},
    ).json()

    response = client.delete(f"/api/cars/{created['id']}")

    assert response.status_code == 204
    assert client.get(f"/api/cars/{created['id']}").status_code == 404
    assert client.get("/api/cars").json() == []


def test_delete_missing_car_returns_404(client):
    response = client.delete("/api/cars/999")

    assert response.status_code == 404


def test_create_car_normalizes_license_to_uppercase(client):
    response = client.post(
        "/api/cars",
        json={"manufacturer": "VW", "model": "Golf", "license": "golf1"},
    )

    assert response.status_code == 201
    assert response.json()["license"] == "GOLF1"


def test_create_car_rejects_license_with_invalid_characters(client):
    response = client.post(
        "/api/cars",
        json={"manufacturer": "VW", "model": "Golf", "license": "GOLF!"},
    )

    assert response.status_code == 400


def test_create_car_rejects_license_longer_than_10_characters(client):
    response = client.post(
        "/api/cars",
        json={"manufacturer": "VW", "model": "Golf", "license": "A" * 11},
    )

    assert response.status_code == 400


def test_create_car_rejects_duplicate_license(client):
    client.post(
        "/api/cars",
        json={"manufacturer": "VW", "model": "Golf", "license": "GOLF1"},
    )

    response = client.post(
        "/api/cars",
        json={"manufacturer": "Toyota", "model": "Corolla", "license": "GOLF1"},
    )

    assert response.status_code == 409


def test_create_car_rejects_duplicate_license_ignoring_case(client):
    client.post(
        "/api/cars",
        json={"manufacturer": "VW", "model": "Golf", "license": "GOLF1"},
    )

    response = client.post(
        "/api/cars",
        json={"manufacturer": "Toyota", "model": "Corolla", "license": "golf1"},
    )

    assert response.status_code == 409


def test_update_car_normalizes_license(client):
    created = client.post(
        "/api/cars",
        json={"manufacturer": "VW", "model": "Golf", "license": "golf1"},
    ).json()

    response = client.patch(f"/api/cars/{created['id']}", json={"license": "new2x"})

    assert response.status_code == 200
    assert response.json()["license"] == "NEW2X"


def test_update_car_rejects_duplicate_license(client):
    client.post(
        "/api/cars",
        json={"manufacturer": "VW", "model": "Golf", "license": "AAA1"},
    )
    second = client.post(
        "/api/cars",
        json={"manufacturer": "Toyota", "model": "Corolla", "license": "BBB2"},
    ).json()

    response = client.patch(f"/api/cars/{second['id']}", json={"license": "aaa1"})

    assert response.status_code == 409
