package de.painer.mileage.car.evaluate;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;

import static org.junit.jupiter.api.Assertions.assertIterableEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import de.painer.mileage.car.Car;
import de.painer.mileage.car.CarRepository;
import de.painer.mileage.car_mileage.CarMileage;
import de.painer.mileage.car_mileage.CarMileageRepository;
import de.painer.mileage.insurance_mileage.InsuranceMileage;
import de.painer.mileage.insurance_mileage.InsuranceMileageRepository;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;

@SpringBootTest
@AutoConfigureMockMvc
public class CarEvaluateControllerTests {

    @Autowired
    private CarRepository carRepostory;

    @Autowired
    private CarMileageRepository carMileageRepository;

    @Autowired
    private InsuranceMileageRepository insuranceMileageRepository;

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @BeforeEach
    public void setup() {
        carRepostory.deleteAll();
    }

    @Test
    public void error404OnInvalidCardId() throws Exception {
        mockMvc.perform(get("/cars/{id}/evaluate", UUID.randomUUID()))
            .andExpect(status().isNotFound());
    }

    @Test
    public void evaluateIsCalculatedCorrectly() throws Exception {
        UUID carId = createEvaluationData();

        String resultJson = mockMvc.perform(get("/cars/{id}/evaluate", carId))
            .andExpect(status().isOk())
            .andReturn().getResponse().getContentAsString();
        List<CarEvaluationResultDTO> result = objectMapper.readValue(resultJson, new TypeReference<>() {});

        List<CarEvaluationResultDTO> expected = List.of(
            new CarEvaluationResultDTO(LocalDate.of(2022, 7, 1), 5000, 7950, 2950),
            new CarEvaluationResultDTO(LocalDate.of(2023, 2, 1), 7000, 15019, 8019),
            new CarEvaluationResultDTO(LocalDate.of(2024, 5, 1), 15000, 12975, -2025)
        );

        assertIterableEquals(expected, result);
    }

    private UUID createEvaluationData() {
        UUID carId = UUID.randomUUID();
        Car car = new Car();
        car.setId(carId);
        car.setLicense("ABC-123");
        car.setModel("VW Golf");
        carRepostory.save(car);

        InsuranceMileage insurance = new InsuranceMileage();
        insurance.setId(UUID.randomUUID());
        insurance.setCarId(carId);
        insurance.setMileageDate(LocalDate.of(2024, 1, 1));
        insurance.setCurrentMileage(10000);
        insurance.setMileagePerYear(9000);
        insuranceMileageRepository.save(insurance);

        insurance = new InsuranceMileage();
        insurance.setId(UUID.randomUUID());
        insurance.setCarId(carId);
        insurance.setMileageDate(LocalDate.of(2022, 1, 1));
        insurance.setCurrentMileage(2000);
        insurance.setMileagePerYear(12000);
        insuranceMileageRepository.save(insurance);

        CarMileage mileage = new CarMileage();
        mileage.setId(UUID.randomUUID());
        mileage.setCarId(carId);
        mileage.setMileageDate(LocalDate.of(2022, 7, 1));
        mileage.setValue(5000);
        carMileageRepository.save(mileage);

        mileage = new CarMileage();
        mileage.setId(UUID.randomUUID());
        mileage.setCarId(carId);
        mileage.setMileageDate(LocalDate.of(2024, 5, 1));
        mileage.setValue(15000);
        carMileageRepository.save(mileage);

        mileage = new CarMileage();
        mileage.setId(UUID.randomUUID());
        mileage.setCarId(carId);
        mileage.setMileageDate(LocalDate.of(2023, 2, 1));
        mileage.setValue(7000);
        carMileageRepository.save(mileage);

        return carId;
    }

}
