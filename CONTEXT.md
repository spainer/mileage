# Mileage

Tracks cars and, per car, the odometer readings over time and the insurance reports that cap how far each car may be driven going forward.

## Language

**Car**:
A vehicle identified by its manufacturer, model, and license plate. The owner of all mileage records and insurance reports.
_Avoid_: vehicle, auto, machine

**Manufacturer**:
The make of a car (e.g. Volkswagen, Toyota).
_Avoid_: make, brand

**Model**:
The specific model of a car (e.g. Golf, Corolla), distinguished by manufacturer.

**License**:
The license plate of a car, in German format: 1-3 uppercase letters, a dash, 1-2 uppercase letters, 1-4 digits, and optionally one uppercase letter after the digits (up to 6 characters after the dash). Uniquely identifies a car among other cars.
_Avoid_: plate, registration

**Mileage Record**:
A single odometer reading of a car at a point in time: a date and the value (kilometres on the odometer). A car has many, in sequence.
_Avoid_: entry, log, measurement

**Odometer Reading**:
The number of kilometres a car has accumulated, as recorded in a Mileage Record or captured at the moment of an Insurance Report.
_Avoid_: value, distance, km

**Insurance Report**:
A snapshot taken for a car on a date: the Odometer Reading at that date, together with the Annual Mileage Cap that becomes active from that date on. A car has many.
_Avoid_: claim, policy, statement

**Annual Mileage Cap**:
The maximum number of extra kilometres a car may be driven per year, starting from the date of the Insurance Report that set it. A newer report supersedes older ones; at any point in time the cap in force is the one from the most recent Insurance Report dated on or before that time.
_Avoid_: limit, allowance, quota

**Theoretical Limit**:
The maximum Odometer Reading permitted at a given date, derived from the in-force Insurance Report by pro-rating its Annual Mileage Cap from the report's date to the target date. Leap-year-safe: the day count of the elapsed years is the actual calendar day count, so a year containing a leap day contributes 366 days. No Theoretical Limit exists when no Insurance Report is in force at the target date, or when the target date precedes the first Insurance Report.
_Avoid_: allowance, ceiling, cap (alone)

**Evaluation**:
The comparison of a Mileage Record's Odometer Reading against the Theoretical Limit at that record's date, producing a signed gap in kilometres. Positive = the car is over the allowed limit; negative = under. No Evaluation exists for a Mileage Record dated before the first Insurance Report, or when no Insurance Report is in force at the record's date.
_Avoid_: status, score, verdict

## Relationships

- A **Car** has many **Mileage Records** and many **Insurance Reports** (1:N each).
- A **Mileage Record** and an **Insurance Report** belong to exactly one **Car**.
- When a **Car** ceases to exist, its **Mileage Records** and **Insurance Reports** cease with it.
- An **Insurance Report**'s **Annual Mileage Cap** governs driving for the interval from its date until the next **Insurance Report** takes over.
- A **Theoretical Limit** at a date is derived from the **Annual Mileage Cap** of the **Insurance Report** in force at that date (no persisted record; computed on demand from the report's date, odometer reading, and cap).
- An **Evaluation** exists for a **Mileage Record** when an **Insurance Report** is in force at the record's date; it is the record's **Odometer Reading** minus the **Theoretical Limit** at that date.
- The **Odometer Reading** of a **Car**'s entries never decreases over time: an entry's reading is at least as high as every entry dated before it, no higher than every entry dated after it, and exactly equal to every entry sharing its date. The **Car**'s **Mileage Records** and **Insurance Reports** are considered together for this rule.
