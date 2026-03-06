package de.painer.mileage.insurance_mileage.crud;

import java.time.LocalDate;
import java.util.UUID;

import de.painer.mileage.insurance_mileage.InsuranceMileage;
import lombok.NonNull;
import lombok.RequiredArgsConstructor;
import lombok.Value;

@Value
@RequiredArgsConstructor(access = lombok.AccessLevel.PRIVATE)
public class InsuranceMileageData {

    private @NonNull UUID id;
    private @NonNull LocalDate date;
    private int mileagePerYear;
    private int currentMileage;

    public static InsuranceMileageData of(InsuranceMileage insuranceMileage) {
        return new InsuranceMileageData(
            insuranceMileage.getId(),
            insuranceMileage.getMileageDate(),
            insuranceMileage.getMileagePerYear(),
            insuranceMileage.getCurrentMileage()
        );
    }
    
}
