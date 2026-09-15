# Single-container deployment to GHCR with all persistence in /data

Mileage ships as a single container image published to the GitHub Container Registry, built by CI on git tags. The image contains the Litestar backend and the built frontend, which the backend serves from one origin; all persistent data lives under `/data`, backed by a single volume.

The deployment target is Docker Compose on a personal Mac (Apple Silicon), so the deployment story had to stay "one command, one volume". One image with in-process SPA serving (Litestar static-file mount with an `index.html` fallback) keeps that promise: the frontend client hardcodes the relative `/api`, so same-origin serving needs no CORS or base-URL config, and one process means one port (8000) and no second container or reverse proxy to run. The image is multi-arch (`linux/amd64`, `linux/arm64`) because builds run on GitHub's amd64 runners while the runtime is arm64; one manifest list lets Compose pull the right variant on either. Publishing to GHCR avoids a second registry account: the workflow logs in with the built-in `GITHUB_TOKEN` (`permissions: packages: write`), and the package is private, matching the private repo.

**Considered options**

- **Two images (backend, frontend)** — cleaner process separation, but doubles the containers, reintroduces cross-origin concerns (or needs a proxy), and breaks the "one volume, one `docker compose up`" intent.
- **nginx in front of the backend** — the conventional SPA serving, but a second process and an extra config surface for a benefit not felt at this scale.
- **Docker Hub** — needs a separate account and secret; GHCR is already where the repo, its CI, and its tokens live.

**Consequences**

- The backend serves the static assets and the SPA fallback; the static mount is the only addition to the otherwise pure Litestar app.
- "All persistence under `/data`" is a contract: today only the SQLite database (`DATABASE_URL` defaults to `sqlite+aiosqlite:////data/mileage.db`), but any future persistent artifact must live under `/data` so one volume keeps being sufficient for backup.
- The container runs as a non-root user; `/data` is pre-created in the image so the named volume is seeded with matching ownership on first mount.
- Every tag build pushes `:<tag>` and re-points `:latest`; a failed build leaves `:latest` on the previous tag. `:latest` means "last tagged build", not "latest stable".
- Any git tag triggers a release build, so tag names must be valid Docker tags; the workflow fails fast on invalid ones.
- Schema migration runs against the volume at startup (ADR-0001); a fresh deployment migrates from zero, an existing one upgrades in place.
