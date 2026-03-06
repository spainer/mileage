package de.painer.mileage.car.crud;

import jakarta.validation.constraints.NotNull;

public record CarUpdateDTO(@NotNull String license, String model) {
}
