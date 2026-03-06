package de.painer.mileage.car_mileage.crud;

import java.time.LocalDate;

import jakarta.validation.constraints.NotNull;

public record CarMileageUpdateDTO(@NotNull LocalDate date, int value) {
}
