package de.painer.mileage.car.crud;

import java.util.UUID;

import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import lombok.Value;

@Value
@RequiredArgsConstructor(access = lombok.AccessLevel.PRIVATE)
public class CarResultDTO {

    private @NotNull UUID id;
    private @NotNull String license;
    private String model;

    public static CarResultDTO of(CarData data) {
        return new CarResultDTO(data.getId(), data.getLicense(), data.getModel());
    }

}
