from datetime import date

import src.evaluation as evaluation
from src import models
from src.schemas import Evaluation, TodayEvaluation


def test_theoretical_limit_without_reports_is_none():
    assert evaluation.theoretical_limit([], date(2025, 1, 1)) is None


def test_theoretical_limit_before_first_report_is_none():
    reports = [
        models.InsuranceReport(
            date=date(2026, 1, 15), odometer_reading=1000, mileage_per_year=12000
        )
    ]
    assert evaluation.theoretical_limit(reports, date(2025, 1, 1)) is None


def test_theoretical_limit_on_report_date_is_odometer_reading():
    reports = [
        models.InsuranceReport(
            date=date(2026, 1, 15), odometer_reading=1000, mileage_per_year=12000
        )
    ]
    assert evaluation.theoretical_limit(reports, date(2026, 1, 15)) == 1000


def test_theoretical_limit_at_exact_full_years_is_cap_times_years():
    reports = [
        models.InsuranceReport(
            date=date(2024, 1, 15), odometer_reading=1000, mileage_per_year=12000
        )
    ]
    assert evaluation.theoretical_limit(reports, date(2026, 1, 15)) == 25000


def test_theoretical_limit_half_year_non_leap_uses_day_count():
    reports = [
        models.InsuranceReport(
            date=date(2025, 1, 15), odometer_reading=1000, mileage_per_year=12000
        )
    ]
    assert evaluation.theoretical_limit(reports, date(2025, 7, 15)) == 6951


def test_theoretical_limit_crossing_leap_year_uses_actual_day_count():
    reports = [
        models.InsuranceReport(
            date=date(2024, 1, 15), odometer_reading=1000, mileage_per_year=12000
        )
    ]
    assert evaluation.theoretical_limit(reports, date(2025, 3, 1)) == 14494


def test_theoretical_limit_with_zero_mileage_per_year_stays_flat():
    reports = [
        models.InsuranceReport(
            date=date(2024, 1, 15), odometer_reading=5000, mileage_per_year=0
        )
    ]
    assert evaluation.theoretical_limit(reports, date(2025, 6, 1)) == 5000


def test_theoretical_limit_with_zero_mileage_per_year_on_report_date():
    reports = [
        models.InsuranceReport(
            date=date(2024, 2, 29), odometer_reading=5000, mileage_per_year=0
        )
    ]
    assert evaluation.theoretical_limit(reports, date(2024, 2, 29)) == 5000


def test_theoretical_limit_between_two_reports_uses_earlier_one():
    reports = [
        models.InsuranceReport(
            date=date(2024, 1, 15), odometer_reading=1000, mileage_per_year=12000
        ),
        models.InsuranceReport(
            date=date(2025, 6, 1), odometer_reading=20000, mileage_per_year=10000
        ),
    ]
    assert evaluation.theoretical_limit(reports, date(2024, 8, 1)) == 7525


def test_theoretical_limit_on_second_report_date_uses_second_report():
    reports = [
        models.InsuranceReport(
            date=date(2024, 1, 15), odometer_reading=1000, mileage_per_year=12000
        ),
        models.InsuranceReport(
            date=date(2025, 6, 1), odometer_reading=20000, mileage_per_year=10000
        ),
    ]
    assert evaluation.theoretical_limit(reports, date(2025, 6, 1)) == 20000


def test_theoretical_limit_after_second_report_uses_second_report():
    reports = [
        models.InsuranceReport(
            date=date(2024, 1, 15), odometer_reading=1000, mileage_per_year=12000
        ),
        models.InsuranceReport(
            date=date(2025, 6, 1), odometer_reading=20000, mileage_per_year=10000
        ),
    ]
    assert evaluation.theoretical_limit(reports, date(2025, 9, 1)) == 22521


def test_evaluate_record_before_first_report_is_none():
    record = models.MileageRecord(date=date(2023, 1, 1), odometer_reading=100)
    reports = [
        models.InsuranceReport(
            date=date(2024, 1, 15), odometer_reading=1000, mileage_per_year=12000
        )
    ]
    assert evaluation.evaluate_record(record, reports) is None


def test_evaluate_record_over_limit_has_positive_delta():
    record = models.MileageRecord(date=date(2025, 1, 15), odometer_reading=15000)
    reports = [
        models.InsuranceReport(
            date=date(2024, 1, 15), odometer_reading=1000, mileage_per_year=12000
        )
    ]
    assert evaluation.evaluate_record(record, reports) == Evaluation(
        theoretical_limit=13000, delta=2000
    )


def test_evaluate_record_under_limit_has_negative_delta():
    record = models.MileageRecord(date=date(2025, 1, 15), odometer_reading=11000)
    reports = [
        models.InsuranceReport(
            date=date(2024, 1, 15), odometer_reading=1000, mileage_per_year=12000
        )
    ]
    assert evaluation.evaluate_record(record, reports) == Evaluation(
        theoretical_limit=13000, delta=-2000
    )


def test_evaluate_record_on_limit_has_zero_delta():
    record = models.MileageRecord(date=date(2025, 1, 15), odometer_reading=13000)
    reports = [
        models.InsuranceReport(
            date=date(2024, 1, 15), odometer_reading=1000, mileage_per_year=12000
        )
    ]
    assert evaluation.evaluate_record(record, reports) == Evaluation(
        theoretical_limit=13000, delta=0
    )


def test_evaluate_records_returns_one_evaluation_per_record_in_order():
    records = [
        models.MileageRecord(date=date(2023, 1, 1), odometer_reading=100),
        models.MileageRecord(date=date(2025, 1, 15), odometer_reading=15000),
    ]
    reports = [
        models.InsuranceReport(
            date=date(2024, 1, 15), odometer_reading=1000, mileage_per_year=12000
        )
    ]
    assert evaluation.evaluate_records(records, reports) == [
        None,
        Evaluation(theoretical_limit=13000, delta=2000),
    ]


def test_evaluate_records_without_records_is_empty():
    reports = [
        models.InsuranceReport(
            date=date(2024, 1, 15), odometer_reading=1000, mileage_per_year=12000
        )
    ]
    assert evaluation.evaluate_records([], reports) == []


def test_evaluate_today_without_reports_is_none():
    record = models.MileageRecord(date=date(2025, 1, 15), odometer_reading=11000)
    assert evaluation.evaluate_today([record], [], today=date(2025, 1, 15)) is None


def test_evaluate_today_before_first_report_is_none():
    reports = [
        models.InsuranceReport(
            date=date(2026, 1, 15), odometer_reading=1000, mileage_per_year=12000
        )
    ]
    assert evaluation.evaluate_today([], reports, today=date(2025, 1, 1)) is None


def test_evaluate_today_without_records_has_null_delta():
    reports = [
        models.InsuranceReport(
            date=date(2024, 1, 15), odometer_reading=1000, mileage_per_year=12000
        )
    ]
    assert evaluation.evaluate_today([], reports, today=date(2025, 1, 15)) == (
        TodayEvaluation(theoretical_limit=13000, delta=None)
    )


def test_evaluate_today_uses_latest_record_for_delta():
    records = [
        models.MileageRecord(date=date(2024, 6, 1), odometer_reading=6000),
        models.MileageRecord(date=date(2025, 1, 15), odometer_reading=15000),
    ]
    reports = [
        models.InsuranceReport(
            date=date(2024, 1, 15), odometer_reading=1000, mileage_per_year=12000
        )
    ]
    assert evaluation.evaluate_today(records, reports, today=date(2025, 1, 15)) == (
        TodayEvaluation(theoretical_limit=13000, delta=2000)
    )


def test_evaluate_today_defaults_to_server_today(monkeypatch):
    pinned = date(2025, 1, 15)

    class PinnedDate(date):
        @classmethod
        def today(cls):
            return pinned

    monkeypatch.setattr(evaluation, "date", PinnedDate)
    reports = [
        models.InsuranceReport(
            date=pinned, odometer_reading=1000, mileage_per_year=12000
        )
    ]
    assert evaluation.evaluate_today([], reports) == TodayEvaluation(
        theoretical_limit=1000, delta=None
    )
