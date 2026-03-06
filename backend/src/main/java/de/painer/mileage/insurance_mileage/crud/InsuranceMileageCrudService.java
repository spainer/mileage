package de.painer.mileage.insurance_mileage.crud;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import de.painer.mileage.car.CarRepository;
import de.painer.mileage.insurance_mileage.InsuranceMileage;
import de.painer.mileage.insurance_mileage.InsuranceMileageRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Transactional
@Slf4j
public class InsuranceMileageCrudService {

    private final CarRepository carRepository;
    private final InsuranceMileageRepository insuranceMileageRepository;

    public InsuranceMileageData createInsuranceMileage(UUID carId, LocalDate date, int mileagePerYear, int currentMileage) {
        if (!carRepository.existsById(carId)) {
            log.error("Car with ID {} does not exist", carId);
            return null;
        }
        
        InsuranceMileage mileage = new InsuranceMileage();
        mileage.setId(UUID.randomUUID());
        mileage.setCarId(carId);
        mileage.setMileageDate(date);
        mileage.setMileagePerYear(mileagePerYear);
        mileage.setCurrentMileage(currentMileage);
        insuranceMileageRepository.save(mileage);
        return InsuranceMileageData.of(mileage);
    }

    public List<InsuranceMileageData> getAll(UUID carId) {
        return insuranceMileageRepository.findByCarId(carId).stream().map(InsuranceMileageData::of).toList();
    }

    public Optional<InsuranceMileageData> getById(UUID id, UUID carId) {
        return insuranceMileageRepository.findByIdAndCarId(id, carId).map(InsuranceMileageData::of);
    }

    public Optional<InsuranceMileageData> updateInsuranceMileage(UUID id, UUID carId, LocalDate date, int mileagePerYear, int currentMileage) {
        return insuranceMileageRepository.findByIdAndCarId(id, carId).map(mileage -> {
            mileage.setMileageDate(date);
            mileage.setMileagePerYear(mileagePerYear);
            mileage.setCurrentMileage(currentMileage);
            insuranceMileageRepository.save(mileage);
            return InsuranceMileageData.of(mileage);
        });
    }

    public boolean deleteInsuranceMileage(UUID id, UUID carId) {
        if (insuranceMileageRepository.existsByIdAndCarId(id, carId)) {
            insuranceMileageRepository.deleteByIdAndCarId(id, carId);
            return true;
        }
        return false;
    }
    
}
