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
The license plate of a car: up to 10 characters, uppercase letters and digits. Uniquely identifies a car among other cars.
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

## Relationships

- A **Car** has many **Mileage Records** and many **Insurance Reports** (1:N each).
- A **Mileage Record** and an **Insurance Report** belong to exactly one **Car**.
- When a **Car** ceases to exist, its **Mileage Records** and **Insurance Reports** cease with it.
- An **Insurance Report**'s **Annual Mileage Cap** governs driving for the interval from its date until the next **Insurance Report** takes over.
