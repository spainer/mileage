package de.painer.mileage.car.crud;

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
@RequestMapping("/cars")
@RequiredArgsConstructor
public class CarCrudController {

    private final CarCrudService carCrudService;

    @PostMapping
    public CarResultDTO createCar(@RequestBody CarUpdateDTO dto) {
        return CarResultDTO.of(carCrudService.createCar(dto.license(), dto.model()));
    }

    @GetMapping
    public List<CarResultDTO> getAll() {
        return carCrudService.getAll().stream().map(CarResultDTO::of).toList();
    }

    @GetMapping("/{id}")
    public CarResultDTO getById(@PathVariable UUID id) {
        return carCrudService.getById(id)
            .map(CarResultDTO::of)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
    }

    @PutMapping("/{id}")
    public CarResultDTO updateCar(@PathVariable UUID id, @RequestBody CarUpdateDTO dto) {
        return carCrudService.updateCar(id, dto.license(), dto.model())
            .map(CarResultDTO::of)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
    }

    @DeleteMapping("/{id}")
    public void deleteCar(@PathVariable UUID id) {
        if (!carCrudService.deleteCar(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        }
    }

}
