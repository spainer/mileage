# Mileage

Tracks cars and, per car, the odometer readings over time and the insurance reports that cap how far each car may be driven.

Mileage ships as a single container: a Litestar backend that serves the built frontend from the same origin, with a SQLite database. All persistent data lives under `/data` on one volume, so the whole deployment is one image, one command, and one volume ([ADR-0003](docs/adr/0003-single-container-deploy-ghcr-data-volume.md)).

## Prerequisites

- Docker Desktop (includes Docker Compose)
- The image lives in the **private** GHCR package `ghcr.io/spainer/mileage`. Log in once:

  ```
  docker login ghcr.io
  ```

  Username: your GitHub handle. Password: a personal access token with the `read:packages` scope.

## Releasing

1. Cut a tag. Any git tag triggers a release build, so the name must be a valid Docker tag: it starts with a letter, digit, or underscore, then up to 127 more characters from letters, digits, `_`, `.`, and `-` (e.g. `1.0.0` or `v1.0.0`):

   ```
   git tag <name>
   ```

2. Push the tag and wait for CI. The release workflow runs the test suites, builds the multi-arch image, and publishes `ghcr.io/spainer/mileage:<name>`, re-pointing `ghcr.io/spainer/mileage:latest` to it. A failed build leaves `latest` on the previous successful tag.

   ```
   git push origin <name>
   ```

3. Follow the run in the Actions tab until it is green.

After the **first** publish, verify the package was created with the right visibility: on your GitHub packages page (<https://github.com/users/spainer/packages>) the `spainer/mileage` container package should be listed as **private**.

## Deploying

From the repository root:

```
docker compose up -d
```

Then open <http://localhost:8000>. The first start against a fresh volume creates the database and applies all schema migrations automatically; upgrades migrate the existing volume in place.

The container restarts itself on boot and after crashes, and only stops when you stop it (`docker compose down`).

## Upgrading to a new release

`latest` means "last successful tag build", so upgrading is:

```
docker compose pull
docker compose up -d
```

## Pinning a specific release

To run a known-good release instead of `latest`, change the `image:` line in `compose.yaml` to the release tag:

```yaml
image: ghcr.io/spainer/mileage:1.0.0
```

then `docker compose pull && docker compose up -d`.

## Backing up and restoring

Everything you own is one named volume (`mileage_data` in a standard checkout) holding the database at `/data/mileage.db`. Stop the app first, then move the volume's contents.

Backup:

```
docker compose down
docker run --rm -v mileage_data:/data -v "$PWD":/backup alpine tar -czf /backup/mileage-backup-$(date +%F).tar.gz -C /data .
```

Restore — replaces the current data with the backup:

```
docker compose down -v    # remove the stale volume
docker run --rm -v mileage_data:/data -v "$PWD":/backup alpine tar -xzf /backup/mileage-backup-<date>.tar.gz -C /data
docker compose up -d
```

A fresh, empty deployment is `docker compose down -v` (removes the volume).

> The volume is named `<project>_<name>`, and the project defaults to the directory name. If you checked the repository out into a directory other than `mileage/`, check `docker volume ls` for the actual name.

## Trying a local build without publishing

```
docker compose down
docker build -t ghcr.io/spainer/mileage:latest .
docker compose -p local up -d    # separate "local_data" volume; does not touch your data
```

Open <http://localhost:8000>, then clean up with `docker compose -p local down -v`.

## Development

`./dev.sh` starts the backend on <http://localhost:8000> and the Vite dev server on <http://localhost:5173>.
