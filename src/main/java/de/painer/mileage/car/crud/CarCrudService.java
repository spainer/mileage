package de.painer.mileage.car.crud;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import de.painer.mileage.car.Car;
import de.painer.mileage.car.CarRepository;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
@Transactional
public class CarCrudService {

    private final CarRepository carRepository;

    public CarData createCar(String license, String model) {
        Car car = new Car();
        car.setId(UUID.randomUUID());
        car.setLicense(license);
        car.setModel(model);
        carRepository.save(car);
        return CarData.of(car);
    }

    public List<CarData> getAll() {
        return carRepository.findAll().stream().map(CarData::of).toList();
    }

    public Optional<CarData> getById(UUID id) {
        return carRepository.findById(id).map(CarData::of);
    }

    public Optional<CarData> updateCar(UUID id, String license, String model) {
        return carRepository.findById(id).map(car -> {
            car.setLicense(license);
            car.setModel(model);
            carRepository.save(car);
            return CarData.of(car);
        });
    }

    public boolean deleteCar(UUID id) {
        if (carRepository.existsById(id)) {
            carRepository.deleteById(id);
            return true;
        }
        return false;
    }

}
