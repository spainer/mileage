package de.painer.mileage.car.evaluate;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.time.LocalDate;
import java.util.List;

import org.junit.jupiter.api.Test;

public class InsuranceInterpolatorTests {

    @Test
    public void reportThrowsOnInvalidArguments() {
        assertThrows(NullPointerException.class, () -> new InsuranceInterpolator.Report(null, 10000, 50000));
        assertThrows(IllegalArgumentException.class, () -> new InsuranceInterpolator.Report(LocalDate.of(2026, 1, 1), -1, 50000));
        assertThrows(IllegalArgumentException.class, () -> new InsuranceInterpolator.Report(LocalDate.of(2026, 1, 1), 0, 50000));
        assertThrows(IllegalArgumentException.class, () -> new InsuranceInterpolator.Report(LocalDate.of(2026, 1, 1), 10000, -1));
        assertThrows(IllegalArgumentException.class, () -> new InsuranceInterpolator.Report(LocalDate.of(2026, 1, 1), 10000, 0));
    }

    @Test
    public void throwsOnIllegalConstructorArguments() {
        assertThrows(NullPointerException.class, () -> new InsuranceInterpolator(null));
        assertThrows(IllegalArgumentException.class, () -> new InsuranceInterpolator(List.of()));
    }

    @Test
    public void throwsOnDateBeforeFirstReport() {
        var interpolator = new InsuranceInterpolator(List.of(
            new InsuranceInterpolator.Report(LocalDate.of(2026, 1, 1), 10000, 50000)
        ));
        assertThrows(IllegalArgumentException.class, () -> interpolator.getValue(LocalDate.of(2025, 12, 31)));
    }

    @Test
    public void singleReportYearwiseSteps() {
        var interpolator = new InsuranceInterpolator(List.of(
            new InsuranceInterpolator.Report(LocalDate.of(2022, 1, 1), 5000,  2000)
        ));
        assertThrows(IllegalArgumentException.class, () -> interpolator.getValue(LocalDate.of(2021, 1, 1)));
        assertEquals(2000, interpolator.getValue(LocalDate.of(2022, 1, 1)));
        assertEquals(7000, interpolator.getValue(LocalDate.of(2023, 1, 1)));
        assertEquals(12000, interpolator.getValue(LocalDate.of(2024, 1, 1)));
        assertEquals(17000, interpolator.getValue(LocalDate.of(2025, 1, 1)));
        assertEquals(22000, interpolator.getValue(LocalDate.of(2026, 1, 1)));
    }

    @Test
    public void multipleReportsYearwiseSteps() {
        var interpolator = new InsuranceInterpolator(List.of(
            new InsuranceInterpolator.Report(LocalDate.of(2024, 1, 1), 12000, 9000),
            new InsuranceInterpolator.Report(LocalDate.of(2022, 1, 1), 5000, 2000)
        ));
        assertThrows(IllegalArgumentException.class, () -> interpolator.getValue(LocalDate.of(2021, 1, 1)));
        assertEquals(2000, interpolator.getValue(LocalDate.of(2022, 1, 1)));
        assertEquals(7000, interpolator.getValue(LocalDate.of(2023, 1, 1)));
        assertEquals(9000, interpolator.getValue(LocalDate.of(2024, 1, 1)));
        assertEquals(21000, interpolator.getValue(LocalDate.of(2025, 1, 1)));
        assertEquals(33000, interpolator.getValue(LocalDate.of(2026, 1, 1)));
    }

    @Test
    public void singleReportMonthlySteps() {
        var interpolator = new InsuranceInterpolator(List.of(
            new InsuranceInterpolator.Report(LocalDate.of(2022, 1, 1), 6000,  2000)
        ));
        assertThrows(IllegalArgumentException.class, () -> interpolator.getValue(LocalDate.of(2021, 1, 1)));
        assertEquals(2000, interpolator.getValue(LocalDate.of(2022, 1, 1)));
        assertEquals(2509, interpolator.getValue(LocalDate.of(2022, 2, 1)));
        assertEquals(2969, interpolator.getValue(LocalDate.of(2022, 3, 1)));
        assertEquals(3479, interpolator.getValue(LocalDate.of(2022, 4, 1)));
        assertEquals(3972, interpolator.getValue(LocalDate.of(2022, 5, 1)));
        assertEquals(4482, interpolator.getValue(LocalDate.of(2022, 6, 1)));
        assertEquals(4975, interpolator.getValue(LocalDate.of(2022, 7, 1)));
        assertEquals(5484, interpolator.getValue(LocalDate.of(2022, 8, 1)));
        assertEquals(5994, interpolator.getValue(LocalDate.of(2022, 9, 1)));
        assertEquals(6487, interpolator.getValue(LocalDate.of(2022, 10, 1)));
        assertEquals(6997, interpolator.getValue(LocalDate.of(2022, 11, 1)));
        assertEquals(7490, interpolator.getValue(LocalDate.of(2022, 12, 1)));
        assertEquals(8000, interpolator.getValue(LocalDate.of(2023, 1, 1)));
    }

    @Test
    public void multipleReportsMonthlySteps() {
        var interpolator = new InsuranceInterpolator(List.of(
            new InsuranceInterpolator.Report(LocalDate.of(2022, 1, 1), 5000, 2000),
            new InsuranceInterpolator.Report(LocalDate.of(2023, 1, 1), 12000, 9000)
        ));
        assertThrows(IllegalArgumentException.class, () -> interpolator.getValue(LocalDate.of(2021, 1, 1)));
        assertEquals(2000, interpolator.getValue(LocalDate.of(2022, 1, 1)));
        assertEquals(2424, interpolator.getValue(LocalDate.of(2022, 2, 1)));
        assertEquals(2808, interpolator.getValue(LocalDate.of(2022, 3, 1)));
        assertEquals(3232, interpolator.getValue(LocalDate.of(2022, 4, 1)));
        assertEquals(3643, interpolator.getValue(LocalDate.of(2022, 5, 1)));
        assertEquals(4068, interpolator.getValue(LocalDate.of(2022, 6, 1)));
        assertEquals(4479, interpolator.getValue(LocalDate.of(2022, 7, 1)));
        assertEquals(4904, interpolator.getValue(LocalDate.of(2022, 8, 1)));
        assertEquals(5328, interpolator.getValue(LocalDate.of(2022, 9, 1)));
        assertEquals(5739, interpolator.getValue(LocalDate.of(2022, 10, 1)));
        assertEquals(6164, interpolator.getValue(LocalDate.of(2022, 11, 1)));
        assertEquals(6575, interpolator.getValue(LocalDate.of(2022, 12, 1)));
        assertEquals(9000, interpolator.getValue(LocalDate.of(2023, 1, 1)));
        assertEquals(10019, interpolator.getValue(LocalDate.of(2023, 2, 1)));
        assertEquals(10939, interpolator.getValue(LocalDate.of(2023, 3, 1)));
        assertEquals(11958, interpolator.getValue(LocalDate.of(2023, 4, 1)));
        assertEquals(12945, interpolator.getValue(LocalDate.of(2023, 5, 1)));
        assertEquals(13964, interpolator.getValue(LocalDate.of(2023, 6, 1)));
        assertEquals(14950, interpolator.getValue(LocalDate.of(2023, 7, 1)));
        assertEquals(15969, interpolator.getValue(LocalDate.of(2023, 8, 1)));
        assertEquals(16989, interpolator.getValue(LocalDate.of(2023, 9, 1)));
        assertEquals(17975, interpolator.getValue(LocalDate.of(2023, 10, 1)));
        assertEquals(18994, interpolator.getValue(LocalDate.of(2023, 11, 1)));
        assertEquals(19980, interpolator.getValue(LocalDate.of(2023, 12, 1)));
        assertEquals(21000, interpolator.getValue(LocalDate.of(2024, 1, 1)));
    }

    @Test
    public void respectsLeadYear() {
        var interpolator = new InsuranceInterpolator(List.of(
            new InsuranceInterpolator.Report(LocalDate.of(2024, 1, 1), 6000,  2000)
        ));
        assertThrows(IllegalArgumentException.class, () -> interpolator.getValue(LocalDate.of(2023, 1, 1)));
        assertEquals(2000, interpolator.getValue(LocalDate.of(2024, 1, 1)));
        assertEquals(2508, interpolator.getValue(LocalDate.of(2024, 2, 1)));
        assertEquals(2983, interpolator.getValue(LocalDate.of(2024, 3, 1)));
        assertEquals(3491, interpolator.getValue(LocalDate.of(2024, 4, 1)));
        assertEquals(3983, interpolator.getValue(LocalDate.of(2024, 5, 1)));
        assertEquals(4491, interpolator.getValue(LocalDate.of(2024, 6, 1)));
        assertEquals(4983, interpolator.getValue(LocalDate.of(2024, 7, 1)));
        assertEquals(5491, interpolator.getValue(LocalDate.of(2024, 8, 1)));
        assertEquals(6000, interpolator.getValue(LocalDate.of(2024, 9, 1)));
        assertEquals(6491, interpolator.getValue(LocalDate.of(2024, 10, 1)));
        assertEquals(7000, interpolator.getValue(LocalDate.of(2024, 11, 1)));
        assertEquals(7491, interpolator.getValue(LocalDate.of(2024, 12, 1)));
        assertEquals(8000, interpolator.getValue(LocalDate.of(2025, 1, 1)));
    }
}
