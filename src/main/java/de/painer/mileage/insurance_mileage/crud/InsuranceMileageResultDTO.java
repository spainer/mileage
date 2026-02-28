package de.painer.mileage.insurance_mileage.crud;

import java.time.LocalDate;
import java.util.UUID;

import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import lombok.Value;

@Value
@RequiredArgsConstructor(access = lombok.AccessLevel.PRIVATE)
public class InsuranceMileageResultDTO {

    private @NotNull UUID id;
    private @NotNull LocalDate date;
    private int mileagePerYear;
    private int currentMileage;

    public static InsuranceMileageResultDTO of(InsuranceMileageData data) {
        return new InsuranceMileageResultDTO(
            data.getId(),
            data.getDate(),
            data.getMileagePerYear(),
            data.getCurrentMileage()
        );
    }
    
}
