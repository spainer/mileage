def test_create_car(client):
    response = client.post(
        "/api/cars",
        json={"manufacturer": "VW", "model": "Golf", "license": "M-AB1234"},
    )
    assert response.status_code == 201
    data = response.json()
    assert isinstance(data["id"], int)
    assert data["manufacturer"] == "VW"
    assert data["model"] == "Golf"
    assert data["license"] == "M-AB1234"


def test_get_car_by_id(client):
    created = client.post(
        "/api/cars",
        json={"manufacturer": "VW", "model": "Golf", "license": "M-AB1234"},
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
        json={"manufacturer": "VW", "model": "Golf", "license": "B-CD1234"},
    ).json()
    second = client.post(
        "/api/cars",
        json={"manufacturer": "Toyota", "model": "Corolla", "license": "B-KW4567"},
    ).json()

    response = client.get("/api/cars")

    assert response.status_code == 200
    data = response.json()
    assert {car["id"] for car in data} == {first["id"], second["id"]}
    assert {car["license"] for car in data} == {"B-CD1234", "B-KW4567"}


def test_list_cars_empty(client):
    response = client.get("/api/cars")

    assert response.status_code == 200
    assert response.json() == []


def test_update_car(client):
    created = client.post(
        "/api/cars",
        json={"manufacturer": "VW", "model": "Golf", "license": "M-AB1234"},
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
        json={"manufacturer": "VW", "model": "Golf", "license": "M-AB1234"},
    ).json()

    response = client.patch(f"/api/cars/{created['id']}", json={"model": "Golf VII"})

    assert response.status_code == 200
    data = response.json()
    assert data["manufacturer"] == "VW"
    assert data["model"] == "Golf VII"
    assert data["license"] == "M-AB1234"


def test_update_missing_car_returns_404(client):
    response = client.patch("/api/cars/999", json={"model": "Ghost"})

    assert response.status_code == 404


def test_delete_car(client):
    created = client.post(
        "/api/cars",
        json={"manufacturer": "VW", "model": "Golf", "license": "M-AB1234"},
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
        json={"manufacturer": "VW", "model": "Golf", "license": "m-ab1234"},
    )

    assert response.status_code == 201
    assert response.json()["license"] == "M-AB1234"


def test_create_car_rejects_license_with_invalid_characters(client):
    response = client.post(
        "/api/cars",
        json={"manufacturer": "VW", "model": "Golf", "license": "GOLF!"},
    )

    assert response.status_code == 400


def test_create_car_rejects_license_longer_than_10_characters(client):
    response = client.post(
        "/api/cars",
        json={"manufacturer": "VW", "model": "Golf", "license": "GOT-AB1234E"},
    )

    assert response.status_code == 400


def test_create_car_rejects_duplicate_license(client):
    client.post(
        "/api/cars",
        json={"manufacturer": "VW", "model": "Golf", "license": "M-AB1234"},
    )

    response = client.post(
        "/api/cars",
        json={"manufacturer": "Toyota", "model": "Corolla", "license": "M-AB1234"},
    )

    assert response.status_code == 409


def test_create_car_rejects_duplicate_license_ignoring_case(client):
    client.post(
        "/api/cars",
        json={"manufacturer": "VW", "model": "Golf", "license": "M-AB1234"},
    )

    response = client.post(
        "/api/cars",
        json={"manufacturer": "Toyota", "model": "Corolla", "license": "m-ab1234"},
    )

    assert response.status_code == 409


def test_update_car_normalizes_license(client):
    created = client.post(
        "/api/cars",
        json={"manufacturer": "VW", "model": "Golf", "license": "m-ab1234"},
    ).json()

    response = client.patch(f"/api/cars/{created['id']}", json={"license": "n-ew1234"})

    assert response.status_code == 200
    assert response.json()["license"] == "N-EW1234"


def test_update_car_rejects_duplicate_license(client):
    client.post(
        "/api/cars",
        json={"manufacturer": "VW", "model": "Golf", "license": "B-CD1234"},
    )
    second = client.post(
        "/api/cars",
        json={"manufacturer": "Toyota", "model": "Corolla", "license": "B-KW4567"},
    ).json()

    response = client.patch(f"/api/cars/{second['id']}", json={"license": "b-cd1234"})

    assert response.status_code == 409


def test_update_car_rejects_license_with_invalid_characters(client):
    created = client.post(
        "/api/cars",
        json={"manufacturer": "VW", "model": "Golf", "license": "M-AB1234"},
    ).json()

    response = client.patch(f"/api/cars/{created['id']}", json={"license": "GOLF!"})

    assert response.status_code == 400


def test_update_car_rejects_license_longer_than_10_characters(client):
    created = client.post(
        "/api/cars",
        json={"manufacturer": "VW", "model": "Golf", "license": "M-AB1234"},
    ).json()

    response = client.patch(f"/api/cars/{created['id']}", json={"license": "GOT-AB1234E"})

    assert response.status_code == 400


def test_create_car_accepts_10_character_license(client):
    response = client.post(
        "/api/cars",
        json={"manufacturer": "VW", "model": "Golf", "license": "GOT-AB1234"},
    )

    assert response.status_code == 201
    assert response.json()["license"] == "GOT-AB1234"


def test_create_car_rejects_empty_license(client):
    response = client.post(
        "/api/cars",
        json={"manufacturer": "VW", "model": "Golf", "license": ""},
    )

    assert response.status_code == 400


def test_create_car_accepts_license_with_space(client):
    response = client.post(
        "/api/cars",
        json={"manufacturer": "VW", "model": "Golf", "license": "m-ab 1234"},
    )

    assert response.status_code == 201
    assert response.json()["license"] == "M-AB1234"


def test_create_car_accepts_license_with_suffix_letter(client):
    response = client.post(
        "/api/cars",
        json={"manufacturer": "VW", "model": "Golf", "license": "BB-AB123E"},
    )

    assert response.status_code == 201
    assert response.json()["license"] == "BB-AB123E"


def test_create_car_rejects_license_without_dash(client):
    response = client.post(
        "/api/cars",
        json={"manufacturer": "VW", "model": "Golf", "license": "MAB1234"},
    )

    assert response.status_code == 400


def test_create_car_rejects_license_with_too_many_prefix_letters(client):
    response = client.post(
        "/api/cars",
        json={"manufacturer": "VW", "model": "Golf", "license": "AAAA-AB1234"},
    )

    assert response.status_code == 400


def test_create_car_rejects_license_with_too_many_characters_after_dash(client):
    response = client.post(
        "/api/cars",
        json={"manufacturer": "VW", "model": "Golf", "license": "M-AB1234E"},
    )

    assert response.status_code == 400


def test_create_car_rejects_license_without_digits(client):
    response = client.post(
        "/api/cars",
        json={"manufacturer": "VW", "model": "Golf", "license": "M-ABCD"},
    )

    assert response.status_code == 400


def test_create_car_rejects_license_without_letters_after_dash(client):
    response = client.post(
        "/api/cars",
        json={"manufacturer": "VW", "model": "Golf", "license": "M-1234"},
    )

    assert response.status_code == 400
