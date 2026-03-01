package de.painer.mileage.car.evaluate;

import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/cars/{id}/evaluate")
@RequiredArgsConstructor
public class CarEvaluateController {

    private final CarEvaluateService carEvaluateService;

    @GetMapping
    public List<CarEvaluationResultDTO> evaluate(@PathVariable UUID id) {
        List<CarEvaluationResultData> result = carEvaluateService.evaluate(id);
        if (result == null) throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        return result.stream().map(CarEvaluationResultDTO::of).toList();
    }
    
}
