package de.painer.mileage;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.boot.jdbc.test.autoconfigure.JdbcTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;


@JdbcTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Transactional(propagation = Propagation.NOT_SUPPORTED)
public class SqliteIntegrationTests {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    public void testDeleteCascade() {
        UUID carId = UUID.randomUUID();

        jdbcTemplate.update(String.format("INSERT INTO car (id, license) VALUES ('%s', 'ABC-123')", carId));
        jdbcTemplate.update(String.format("INSERT INTO car_mileage (id, car_id, mileage_date, value) VALUES ('%s', '%s', '2026-01-01', 10000)", UUID.randomUUID(), carId));
        jdbcTemplate.update(String.format("INSERT INTO car_mileage (id, car_id, mileage_date, value) VALUES ('%s', '%s', '2026-02-01', 11000)", UUID.randomUUID(), carId));
        jdbcTemplate.update(String.format("INSERT INTO insurance_mileage (id, car_id, mileage_date, mileage_per_year, current_mileage) VALUES ('%s', '%s', '2024-01-01', 10000, 500)", UUID.randomUUID(), carId));
        jdbcTemplate.update(String.format("INSERT INTO insurance_mileage (id, car_id, mileage_date, mileage_per_year, current_mileage) VALUES ('%s', '%s', '2025-01-01', 10000, 10000)", UUID.randomUUID(), carId));
        jdbcTemplate.update(String.format("INSERT INTO insurance_mileage (id, car_id, mileage_date, mileage_per_year, current_mileage) VALUES ('%s', '%s', '2026-01-01', 15000, 20000)", UUID.randomUUID(), carId));

        assertEquals(2, jdbcTemplate.queryForObject(String.format("SELECT COUNT(*) FROM car_mileage WHERE car_id = '%s'", carId), Integer.class));
        assertEquals(3, jdbcTemplate.queryForObject(String.format("SELECT COUNT(*) FROM insurance_mileage WHERE car_id = '%s'", carId), Integer.class));

        jdbcTemplate.update(String.format("DELETE FROM car WHERE id = '%s'", carId));

        assertEquals(0, jdbcTemplate.queryForObject(String.format("SELECT COUNT(*) FROM car_mileage WHERE car_id = '%s'", carId), Integer.class));
        assertEquals(0, jdbcTemplate.queryForObject(String.format("SELECT COUNT(*) FROM insurance_mileage WHERE car_id = '%s'", carId), Integer.class));
    }

}
