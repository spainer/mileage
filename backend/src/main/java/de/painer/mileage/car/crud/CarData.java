package de.painer.mileage.car.crud;

import java.util.UUID;

import de.painer.mileage.car.Car;
import lombok.Data;
import lombok.NonNull;
import lombok.RequiredArgsConstructor;

@Data
@RequiredArgsConstructor(access = lombok.AccessLevel.PRIVATE)
public class CarData {

    private final @NonNull UUID id;
    private final @NonNull String license;
    private final String model;

    public static CarData of(Car car) {
        return new CarData(car.getId(), car.getLicense(), car.getModel());
    }

}
