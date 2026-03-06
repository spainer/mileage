package de.painer.mileage.car.evaluate;

import java.util.Comparator;
import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;

import de.painer.mileage.car.CarRepository;
import de.painer.mileage.car_mileage.CarMileage;
import de.painer.mileage.car_mileage.CarMileageRepository;
import de.painer.mileage.insurance_mileage.InsuranceMileage;
import de.painer.mileage.insurance_mileage.InsuranceMileageRepository;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class CarEvaluateService {

    private final CarRepository carRepository;
    private final CarMileageRepository carMileageRepository;
    private final InsuranceMileageRepository insuranceMileageRepository;

    public List<CarEvaluationResultData> evaluate(UUID carId) {
        if (!carRepository.existsById(carId)) return null;

        List<InsuranceMileage> insuranceMileage = insuranceMileageRepository.findByCarId(carId);
        InsuranceInterpolator interpolator = new InsuranceInterpolator(
            insuranceMileage.stream()
            .map(m -> new InsuranceInterpolator.Report(m.getMileageDate(), m.getMileagePerYear(), m.getCurrentMileage()))
            .toList()
        );

        List<CarMileage> mileages = carMileageRepository.findByCarId(carId);
        return mileages.stream().sorted(Comparator.comparing(m -> m.getMileageDate())).map(m -> {
            int limit = interpolator.getValue(m.getMileageDate());
            return new CarEvaluationResultData(m.getMileageDate(), m.getValue(), limit, limit - m.getValue());
        }).toList();
    }

}
