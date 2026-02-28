package de.painer.mileage.insurance_mileage.crud;

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
@RequestMapping("/cars/{carId}/insurance-mileages")
@RequiredArgsConstructor
public class InsuranceMileageCrudController {

    private final InsuranceMileageCrudService insuranceMileageCrudService;

    @PostMapping
    public InsuranceMileageResultDTO createInsuranceMileage(@PathVariable UUID carId, @RequestBody InsuranceMileageUpdateDTO dto) {
        return InsuranceMileageResultDTO.of(
            insuranceMileageCrudService.createInsuranceMileage(carId, dto.date(), dto.mileagePerYear(), dto.currentMileage())
        );
    }

    @GetMapping
    public List<InsuranceMileageResultDTO> getAll(@PathVariable UUID carId) {
        return insuranceMileageCrudService.getAll(carId).stream().map(InsuranceMileageResultDTO::of).toList();
    }

    @GetMapping("/{id}")
    public InsuranceMileageResultDTO getById(@PathVariable UUID carId, @PathVariable UUID id) {
        return insuranceMileageCrudService.getById(id, carId)
            .map(InsuranceMileageResultDTO::of)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
    }

    @PutMapping("/{id}")
    public InsuranceMileageResultDTO updateInsuranceMileage(@PathVariable UUID carId, @PathVariable UUID id, @RequestBody InsuranceMileageUpdateDTO dto) {
        return insuranceMileageCrudService.updateInsuranceMileage(id, carId, dto.date(), dto.mileagePerYear(), dto.currentMileage())
            .map(InsuranceMileageResultDTO::of)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
    }

    @DeleteMapping("/{id}")
    public void deleteInsuranceMileage(@PathVariable UUID carId, @PathVariable UUID id) {
        if (!insuranceMileageCrudService.deleteInsuranceMileage(id, carId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        }
    }
    
}
