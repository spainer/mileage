package de.painer.mileage.car.evaluate;

import java.time.LocalDate;

public record CarEvaluationResultDTO(
    LocalDate date,
    int mileage,
    int insuranceLimit,
    int balance
) {

    public static CarEvaluationResultDTO of(CarEvaluationResultData data) {
        return new CarEvaluationResultDTO(data.date(), data.mileage(), data.insuranceLimit(), data.balance());
    }
    
}