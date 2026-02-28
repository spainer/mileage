package de.painer.mileage.car_mileage.crud;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import de.painer.mileage.car.CarRepository;
import de.painer.mileage.car_mileage.CarMileage;
import de.painer.mileage.car_mileage.CarMileageRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Transactional
@Slf4j
public class CarMileageCrudService {

    private final CarRepository carRepository;
    private final CarMileageRepository carMileageRepository;

    public CarMileageData createMileageData(UUID carId, LocalDate date, int value) {
        if (!carRepository.existsById(carId)) {
            log.error("Car with ID {} does not exist", carId);
            return null;
        }
        
        CarMileage mileage = new CarMileage();
        mileage.setId(UUID.randomUUID());
        mileage.setCarId(carId);
        mileage.setMileageDate(date);
        mileage.setValue(value);
        carMileageRepository.save(mileage);
        return CarMileageData.of(mileage);
    }

    public List<CarMileageData> getAll(UUID carId) {
        return carMileageRepository.findByCarId(carId).stream().map(CarMileageData::of).toList();
    }

    public Optional<CarMileageData> getById(UUID id, UUID carId) {
        return carMileageRepository.findByIdAndCarId(id, carId).map(CarMileageData::of);
    }

    public Optional<CarMileageData> updateMileageData(UUID id, UUID carId, LocalDate date, int value) {
        return carMileageRepository.findByIdAndCarId(id, carId).map(mileage -> {
            mileage.setMileageDate(date);
            mileage.setValue(value);
            carMileageRepository.save(mileage);
            return CarMileageData.of(mileage);
        });
    }

    public boolean deleteMileageData(UUID id, UUID carId) {
        if (carMileageRepository.existsByIdAndCarId(id, carId)) {
            carMileageRepository.deleteByIdAndCarId(id, carId);
            return true;
        }
        return false;
    }
    
}
