package de.painer.mileage.car.evaluate;

import java.time.LocalDate;

public record CarEvaluationResultData(
    LocalDate date,
    int mileage,
    int insuranceLimit,
    int balance
) {
    
}