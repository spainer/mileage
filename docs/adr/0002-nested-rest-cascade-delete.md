# Nested REST resources with cascade delete

Mileage Records and Insurance Reports are exposed as nested sub-resources of their Car, and deleting a Car cascades to its children.

A Car owns its Mileage Records and Insurance Reports (1:N each), and the domain model treats the children as ceasing to exist with the Car. The REST surface mirrors that ownership: `/cars/{car_id}/mileage-records` and `/cars/{car_id}/insurance-reports`, with the same nesting applied to each child's sub-resources. This keeps each resource addressable only through its owning Car, matching the 1:N domain relationship at the API boundary.

**Considered options**

- **Flat top-level resources** (`/mileage-records?car_id=...`) — fewer URLs to remember, but detaches the API from the domain's ownership and invites referencing children without their Car.
- **Independent children** — store children without cascade; rejected because the domain says a Car's children belong to it and die with it.

**Consequences**

- Deleting a Car removes all its Mileage Records and Insurance Reports (`ON DELETE CASCADE`).
- A child request that names a non-existent Car returns 404 before touching child data.
- Full CRUD (GET/POST/PATCH/DELETE) is offered on every level.
