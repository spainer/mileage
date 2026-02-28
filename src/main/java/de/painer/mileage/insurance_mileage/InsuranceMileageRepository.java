package de.painer.mileage.insurance_mileage;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface InsuranceMileageRepository extends JpaRepository<InsuranceMileage, UUID> {

    List<InsuranceMileage> findByCarId(UUID carId);

    Optional<InsuranceMileage> findByIdAndCarId(UUID id, UUID carId);

    boolean existsByIdAndCarId(UUID id, UUID carId);

    void deleteByIdAndCarId(UUID id, UUID carId);
    
}
