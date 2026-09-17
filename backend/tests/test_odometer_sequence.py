from datetime import date

import pytest

from src.odometer_sequence import (
    Bounds,
    Entry,
    bounds_hint,
    compute_bounds,
    validate as validate_entry,
)


def e(*, id_: int, day: str, reading: int) -> Entry:
    return Entry(id=id_, date=date.fromisoformat(day), odometer_reading=reading)


class TestComputeBounds:
    def test_no_entries_returns_trivial_bounds(self) -> None:
        bounds = compute_bounds([], date(2026, 1, 1))
        assert bounds == Bounds(lower=None, upper=None, same_date_value=None)

    def test_only_prior_entries_set_lower(self) -> None:
        bounds = compute_bounds(
            [e(id_=1, day="2025-12-31", reading=1000)],
            date(2026, 1, 1),
        )
        assert bounds.lower == 1000
        assert bounds.upper is None
        assert bounds.same_date_value is None

    def test_only_later_entries_set_upper(self) -> None:
        bounds = compute_bounds(
            [e(id_=1, day="2026-06-01", reading=2000)],
            date(2026, 1, 1),
        )
        assert bounds.lower is None
        assert bounds.upper == 2000
        assert bounds.same_date_value is None

    def test_prior_and_later_set_both_bounds(self) -> None:
        bounds = compute_bounds(
            [
                e(id_=1, day="2025-06-01", reading=1000),
                e(id_=2, day="2025-12-01", reading=2000),
                e(id_=3, day="2026-06-01", reading=3000),
                e(id_=4, day="2027-01-01", reading=4000),
            ],
            date(2026, 1, 1),
        )
        assert bounds.lower == 2000  # max of prior readings
        assert bounds.upper == 3000  # min of later readings

    def test_same_date_value_is_picked(self) -> None:
        bounds = compute_bounds(
            [e(id_=1, day="2026-01-01", reading=1500)],
            date(2026, 1, 1),
        )
        assert bounds.same_date_value == 1500

    def test_exclude_id_skips_self_for_update(self) -> None:
        bounds = compute_bounds(
            [
                e(id_=99, day="2026-01-01", reading=1500),
                e(id_=1, day="2025-01-01", reading=500),
            ],
            date(2026, 1, 1),
            exclude_id=99,
        )
        assert bounds.same_date_value is None
        assert bounds.lower == 500

    def test_exclude_id_also_skips_other_entry_with_same_id(self) -> None:
        bounds = compute_bounds(
            [e(id_=42, day="2026-01-01", reading=1500)],
            date(2026, 1, 1),
            exclude_id=42,
        )
        assert bounds.same_date_value is None


class TestValidate:
    def test_no_constraints_returns_none(self) -> None:
        assert validate_entry([], date(2026, 1, 1), 1234) is None

    def test_equal_to_lower_accepted(self) -> None:
        assert (
            validate_entry(
                [e(id_=1, day="2025-06-01", reading=1000)],
                date(2026, 1, 1),
                1000,
            )
            is None
        )

    def test_equal_to_upper_accepted(self) -> None:
        assert (
            validate_entry(
                [e(id_=1, day="2026-06-01", reading=2000)],
                date(2026, 1, 1),
                2000,
            )
            is None
        )

    def test_below_lower_rejected(self) -> None:
        msg = validate_entry(
            [e(id_=1, day="2025-06-01", reading=1000)],
            date(2026, 1, 1),
            999,
        )
        assert msg is not None
        assert "1,000" in msg
        assert "at least" in msg.lower()

    def test_above_upper_rejected(self) -> None:
        msg = validate_entry(
            [e(id_=1, day="2026-06-01", reading=2000)],
            date(2026, 1, 1),
            2001,
        )
        assert msg is not None
        assert "2,000" in msg
        assert "at most" in msg.lower()

    def test_same_date_value_must_equal(self) -> None:
        msg = validate_entry(
            [e(id_=1, day="2026-01-01", reading=1500)],
            date(2026, 1, 1),
            1501,
        )
        assert msg is not None
        assert "1,500" in msg

    def test_same_date_value_match_accepted(self) -> None:
        assert (
            validate_entry(
                [e(id_=1, day="2026-01-01", reading=1500)],
                date(2026, 1, 1),
                1500,
            )
            is None
        )

    def test_between_lower_and_upper_accepted(self) -> None:
        assert (
            validate_entry(
                [
                    e(id_=1, day="2025-06-01", reading=1000),
                    e(id_=2, day="2026-06-01", reading=3000),
                ],
                date(2026, 1, 1),
                2000,
            )
            is None
        )

    def test_exclude_id_lets_self_comply_with_old_same_date(self) -> None:
        assert (
            validate_entry(
                [e(id_=42, day="2026-01-01", reading=1500)],
                date(2026, 1, 1),
                1501,
                exclude_id=42,
            )
            is None
        )

    def test_messages_include_units(self) -> None:
        msg = validate_entry(
            [e(id_=1, day="2025-06-01", reading=1000)],
            date(2026, 1, 1),
            999,
        )
        assert msg is not None
        assert "km" in msg


class TestBoundsHint:
    def _fmt(self, value: int) -> str:
        return f"({value})"

    def test_no_constraints_returns_none(self) -> None:
        bounds = Bounds(lower=None, upper=None, same_date_value=None)
        assert bounds_hint(bounds, self._fmt) is None

    def test_only_lower(self) -> None:
        bounds = Bounds(lower=1000, upper=None, same_date_value=None)
        assert bounds_hint(bounds, self._fmt) == "at least (1000) km"

    def test_only_upper(self) -> None:
        bounds = Bounds(lower=None, upper=2000, same_date_value=None)
        assert bounds_hint(bounds, self._fmt) == "at most (2000) km"

    def test_both_bounds(self) -> None:
        bounds = Bounds(lower=1000, upper=2000, same_date_value=None)
        assert bounds_hint(bounds, self._fmt) == "between (1000) and (2000) km"

    def test_same_date_overrides_bounds(self) -> None:
        bounds = Bounds(lower=1000, upper=2000, same_date_value=1500)
        assert bounds_hint(bounds, self._fmt) == "must be (1500) km"

    def test_equal_lower_and_upper_uses_between(self) -> None:
        bounds = Bounds(lower=1000, upper=1000, same_date_value=None)
        assert bounds_hint(bounds, self._fmt) == "between (1000) and (1000) km"


@pytest.mark.parametrize(
    "value, expected",
    [
        (0, "between (0) and (0) km"),
        (1, "between (0) and (1) km"),
    ],
)
def test_hint_zero_lower(value: int, expected: str) -> None:
    bounds = Bounds(lower=0, upper=value, same_date_value=None)
    fmt = lambda n: f"({n})"
    assert bounds_hint(bounds, fmt) == expected
