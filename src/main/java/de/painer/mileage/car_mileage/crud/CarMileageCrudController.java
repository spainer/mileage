package de.painer.mileage.car_mileage.crud;

import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/cars/{carId}/mileages")
@RequiredArgsConstructor
public class CarMileageCrudController {

    private final CarMileageCrudService carMileageCrudService;

    @PostMapping
    public CarMileageResultDTO createMileage(@PathVariable UUID carId, @RequestBody CarMileageUpdateDTO dto) {
        return CarMileageResultDTO.of(carMileageCrudService.createMileageData(carId, dto.date(), dto.value()));
    }

    @GetMapping
    public List<CarMileageResultDTO> getAll(@PathVariable UUID carId) {
        return carMileageCrudService.getAll(carId).stream().map(CarMileageResultDTO::of).toList();
    }

    @GetMapping("/{id}")
    public CarMileageResultDTO getById(@PathVariable UUID carId, @PathVariable UUID id) {
        return carMileageCrudService.getById(id, carId)
            .map(CarMileageResultDTO::of)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));  
    }

    @PutMapping("/{id}")
    public CarMileageResultDTO updateMileage(@PathVariable UUID carId, @PathVariable UUID id, @RequestBody CarMileageUpdateDTO dto) {
        return carMileageCrudService.updateMileageData(id, carId, dto.date(), dto.value())
            .map(CarMileageResultDTO::of)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
    }

    @DeleteMapping("/{id}")
    public void deleteMileage(@PathVariable UUID carId, @PathVariable UUID id) {
        if (!carMileageCrudService.deleteMileageData(id, carId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        }
    }
    
}
