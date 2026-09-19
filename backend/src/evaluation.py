from collections.abc import Sequence
from datetime import date
from typing import cast

from src import models
from src.schemas import Evaluation, TodayEvaluation


def _add_years(day: date, years: int) -> date:
    try:
        return day.replace(year=day.year + years)
    except ValueError:
        return day.replace(year=day.year + years, day=28)


def _full_years(start: date, end: date) -> int:
    years = 0
    while _add_years(start, years + 1) <= end:
        years += 1
    return years


def _in_force_report(
    reports: Sequence[models.InsuranceReport], target_date: date
) -> models.InsuranceReport | None:
    chosen: models.InsuranceReport | None = None
    for report in reports:
        report_date = cast(date, report.date)
        if report_date <= target_date and (
            chosen is None or report_date >= cast(date, chosen.date)
        ):
            chosen = report
    return chosen


def theoretical_limit(
    reports: Sequence[models.InsuranceReport], target_date: date
) -> int | None:
    report = _in_force_report(reports, target_date)
    if report is None:
        return None
    report_date = cast(date, report.date)
    odometer_reading = cast(int, report.odometer_reading)
    if report_date == target_date:
        return odometer_reading
    mileage_per_year = cast(int, report.mileage_per_year)
    days_since_report = (target_date - report_date).days
    years = _full_years(report_date, target_date)
    ceil_years = years if _add_years(report_date, years) >= target_date else years + 1
    days_in_ceil_years = (_add_years(report_date, ceil_years) - report_date).days
    extra = mileage_per_year * ceil_years * days_since_report / days_in_ceil_years
    return round(odometer_reading + extra)


def evaluate_record(
    record: models.MileageRecord, reports: Sequence[models.InsuranceReport]
) -> Evaluation | None:
    limit = theoretical_limit(reports, cast(date, record.date))
    if limit is None:
        return None
    delta = cast(int, record.odometer_reading) - limit
    return Evaluation(theoretical_limit=limit, delta=delta)


def evaluate_records(
    records: Sequence[models.MileageRecord], reports: Sequence[models.InsuranceReport]
) -> list[Evaluation | None]:
    return [evaluate_record(record, reports) for record in records]


def evaluate_today(
    records: Sequence[models.MileageRecord],
    reports: Sequence[models.InsuranceReport],
    today: date | None = None,
) -> TodayEvaluation | None:
    if today is None:
        today = date.today()
    limit = theoretical_limit(reports, today)
    if limit is None:
        return None
    if not records:
        return TodayEvaluation(theoretical_limit=limit, delta=None)
    latest = max(records, key=lambda record: cast(date, record.date))
    delta = cast(int, latest.odometer_reading) - limit
    return TodayEvaluation(theoretical_limit=limit, delta=delta)
