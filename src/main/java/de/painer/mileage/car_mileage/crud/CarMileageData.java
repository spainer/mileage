package de.painer.mileage.car_mileage.crud;

import java.time.LocalDate;
import java.util.UUID;

import de.painer.mileage.car_mileage.CarMileage;
import lombok.NonNull;
import lombok.RequiredArgsConstructor;
import lombok.Value;

@Value
@RequiredArgsConstructor(access = lombok.AccessLevel.PRIVATE)
public class CarMileageData {

    private @NonNull UUID id;
    private @NonNull LocalDate date;
    private int value;

    public static CarMileageData of(CarMileage carMileage) {
        return new CarMileageData(carMileage.getId(), carMileage.getMileageDate(), carMileage.getValue());
    }
    
}
