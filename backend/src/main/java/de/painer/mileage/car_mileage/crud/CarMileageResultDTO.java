package de.painer.mileage.car_mileage.crud;

import java.time.LocalDate;
import java.util.UUID;

import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import lombok.Value;

@Value
@RequiredArgsConstructor(access = lombok.AccessLevel.PRIVATE)
public class CarMileageResultDTO {

    private @NotNull UUID id;
    private @NotNull LocalDate date;
    private int value;

    public static CarMileageResultDTO of(CarMileageData data) {
        return new CarMileageResultDTO(data.getId(), data.getDate(), data.getValue());
    }
    
}
