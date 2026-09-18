"""Pure sequence-rule logic for the Odometer Reading of a Car's entries.

An entry is either a Mileage Record or an Insurance Report; the two are
considered together. The rule is non-strict: an entry's reading must be at
least as high as every entry dated before it, no higher than every entry
dated after it, and exactly equal to every entry sharing its date.
"""

from collections.abc import Callable, Iterable
from dataclasses import dataclass
from datetime import date
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from sqlalchemy.ext.asyncio import AsyncSession

    from .models import InsuranceReport, MileageRecord


@dataclass(frozen=True)
class Entry:
    id: int
    date: date
    odometer_reading: int


@dataclass(frozen=True)
class Bounds:
    lower: int | None
    upper: int | None
    same_date_value: int | None

    @property
    def is_trivial(self) -> bool:
        return (
            self.lower is None
            and self.upper is None
            and self.same_date_value is None
        )


def compute_bounds(
    entries: Iterable[Entry],
    proposed_date: date,
    exclude_id: int | None = None,
) -> Bounds:
    """Compute the lower/upper/same-date bounds implied by other entries.

    The entry whose id matches ``exclude_id`` is dropped (used when validating
    an update of an existing entry so the entry does not constrain itself).
    """
    prior: list[int] = []
    later: list[int] = []
    same_date_values: list[int] = []
    for entry in entries:
        if entry.id == exclude_id:
            continue
        if entry.date < proposed_date:
            prior.append(entry.odometer_reading)
        elif entry.date > proposed_date:
            later.append(entry.odometer_reading)
        else:
            same_date_values.append(entry.odometer_reading)
    return Bounds(
        lower=max(prior) if prior else None,
        upper=min(later) if later else None,
        same_date_value=same_date_values[0] if same_date_values else None,
    )


def validate(
    entries: Iterable[Entry],
    proposed_date: date,
    proposed_value: int,
    exclude_id: int | None = None,
) -> str | None:
    """Return a human-readable message if ``proposed_value`` violates the rule.

    Returns ``None`` when the value is valid. The same-date entry always wins:
    if there is an entry dated ``proposed_date`` then ``proposed_value`` must
    equal it, otherwise the lower and upper bounds are compared.
    """
    bounds = compute_bounds(entries, proposed_date, exclude_id)
    if bounds.same_date_value is not None:
        if proposed_value != bounds.same_date_value:
            return f"Odometer reading must be {bounds.same_date_value:,} km."
        return None
    if bounds.lower is not None and proposed_value < bounds.lower:
        return f"Odometer reading must be at least {bounds.lower:,} km."
    if bounds.upper is not None and proposed_value > bounds.upper:
        return f"Odometer reading must be at most {bounds.upper:,} km."
    return None


def bounds_hint(
    bounds: Bounds,
    format_number: Callable[[int], str],
) -> str | None:
    """Return a short hint describing the allowed range, or ``None``.

    The same-date case always wins: if there is a same-date value, the hint
    says so and lower/upper bounds are ignored (they cannot simultaneously be
    satisfied). When lower equals upper, the "between" wording is still
    preferred over "at least"/"at most" to keep the message stable.
    """
    if bounds.same_date_value is not None:
        return f"must be {format_number(bounds.same_date_value)} km"
    if bounds.lower is not None and bounds.upper is not None:
        return f"between {format_number(bounds.lower)} and {format_number(bounds.upper)} km"
    if bounds.lower is not None:
        return f"at least {format_number(bounds.lower)} km"
    if bounds.upper is not None:
        return f"at most {format_number(bounds.upper)} km"
    return None


async def fetch_entries_for_car(
    session: "AsyncSession",
    car_id: int,
    *,
    exclude: tuple[int, str] | None = None,
) -> list[Entry]:
    """Load the combined Mileage Record + Insurance Report entries of a car.

    ``exclude`` is a ``(id, kind)`` pair used when validating the update of an
    existing entry: that entry is dropped from the returned list so the
    sequence rule does not consider itself.
    """
    from sqlalchemy import select

    from .models import InsuranceReport, MileageRecord

    entries: list[Entry] = []
    records = await session.execute(
        select(MileageRecord).where(MileageRecord.car_id == car_id)
    )
    for record in records.scalars():
        if exclude and exclude[0] == record.id and exclude[1] == "record":
            continue
        entries.append(
            Entry(
                id=record.id,
                date=record.date,
                odometer_reading=record.odometer_reading,
            )
        )
    reports = await session.execute(
        select(InsuranceReport).where(InsuranceReport.car_id == car_id)
    )
    for report in reports.scalars():
        if exclude and exclude[0] == report.id and exclude[1] == "report":
            continue
        entries.append(
            Entry(
                id=report.id,
                date=report.date,
                odometer_reading=report.odometer_reading,
            )
        )
    return entries
