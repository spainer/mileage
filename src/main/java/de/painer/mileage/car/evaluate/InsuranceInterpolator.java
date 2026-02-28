package de.painer.mileage.car.evaluate;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;
import java.util.List;

import lombok.NonNull;
import lombok.extern.slf4j.Slf4j;

@Slf4j
class InsuranceInterpolator {

    private final List<Report> reports;

    InsuranceInterpolator(@NonNull List<Report> reports) {
        if (reports.isEmpty()) throw new IllegalArgumentException("reports must not be empty");
        this.reports = reports.stream().sorted(Comparator.comparing(r -> r.date())).toList();
    }

    public long getValue(LocalDate date) {
        if (date.isBefore(reports.getFirst().date())) {
            throw new IllegalArgumentException("date is before first report");
        }

        var report = findRelevantReport(date);

        if (report.date().isEqual(date)) {
            return report.currentMileage();
        }

        int yearsSinceReport = calculateRoundedUpYears(report.date(), date);
        long daysSinceReport = report.date().until(date, ChronoUnit.DAYS);
        long daysFullYears = report.date().until(report.date().plusYears(yearsSinceReport), ChronoUnit.DAYS);

        return report.currentMileage() + report.mileagePerYear() * yearsSinceReport * daysSinceReport / daysFullYears;
    }

    private Report findRelevantReport(LocalDate date) {
        for (int i = 0; i < reports.size() - 1; i++) {
            var firstDate = reports.get(i).date();
            var secondDate = reports.get(i + 1).date();
            if ((firstDate.isEqual(date) || firstDate.isBefore(date)) && secondDate.isAfter(date)) {
                return reports.get(i);
            }
        }
        return reports.getLast();
    }

    private int calculateRoundedUpYears(LocalDate from, LocalDate to) {
        int years = from.until(to).getYears();
        if (from.plusYears(years).isBefore(to)) {
            years++;
        }
        return years;
    }

    record Report(@NonNull LocalDate date, int mileagePerYear, int currentMileage) {
        Report {
            if (mileagePerYear <= 0) throw new IllegalArgumentException("mileagePerYear must be positive");
            if (currentMileage <= 0) throw new IllegalArgumentException("currentMileage must be positive");
        }
    }
    
}
