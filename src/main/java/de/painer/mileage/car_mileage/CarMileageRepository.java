package de.painer.mileage.car_mileage;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface CarMileageRepository extends JpaRepository<CarMileage, UUID> {

    List<CarMileage> findByCarId(UUID carId);

    Optional<CarMileage> findByIdAndCarId(UUID id, UUID carId);

    boolean existsByIdAndCarId(UUID id, UUID carId);

    void deleteByIdAndCarId(UUID id, UUID carId);
    
}
