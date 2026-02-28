package de.painer.mileage.insurance_mileage.crud;

import java.time.LocalDate;

import jakarta.validation.constraints.NotNull;

public record InsuranceMileageUpdateDTO(@NotNull LocalDate date, int mileagePerYear, int currentMileage) {
}
