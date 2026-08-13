# SoftGit

**Production-oriented self-hosted Git hosting backend**

SoftGit is a from-scratch Git hosting platform backend inspired by the capabilities of Gitea/GitLab, but with its own architecture, schema, API, and implementation. It is designed so an independent frontend can implement a complete GitHub-like experience on top of its REST API and Git transports.

> This repository contains the **backend**. The frontend is developed separately.

## Features (foundation)

- Real bare Git repositories on disk
- Git Smart HTTP (`git clone` / `fetch` / `push` over HTTP)
- SSH Git transport
- User accounts, registration, login, sessions
- Argon2id password hashing
- Personal access tokens (schema + API surface)
- SSH key storage (schema + API surface)
- Repositories: create, delete, rename, visibility, stars
- Branches, tags, commits, tree/blob browsing, archives
- Issues, pull requests, releases, webhooks (schema + API routes; core Git merge path present)
- Organizations, teams, collaborators (schema)
- Background job queue (durable in PostgreSQL)
- Rate limiting, structured logging, health/readiness endpoints
- Docker Compose + dual Caddy deployment modes
- OpenAPI-oriented REST API under `/api/v1`

## Architecture

```
Internet
   │
   ▼
Caddy  :27296   (public site + API reverse proxy)
   │
   ├── frontend (static SPA)
   └── backend  :3000 (internal)
         ├── PostgreSQL
         └── Redis
SSH Git :2222
```

## Quick start (Docker Compose)

```bash
git clone https://github.com/m4rcel-lol/softgit.git
cd softgit
cp .env.example .env
# Edit APP_SECRET, JWT_SECRET, DOMAIN, APP_URL at minimum

docker compose up -d --build
```

Open the site at **http://localhost:27296**

- API: `http://localhost:27296/api/v1`
- Health: `http://localhost:27296/health`
- Ready: `http://localhost:27296/ready`
- SSH Git: `ssh://git@localhost:2222`

First registered user becomes administrator.

## Production with Caddy in Docker

```bash
# Set DOMAIN=git.example.com in .env
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

Caddy obtains and renews certificates automatically when `DOMAIN` is a public hostname with correct DNS.

## Production with existing host Caddy

1. Start only the app stack (no Caddy container):

   ```bash
   docker compose up -d
   ```

2. Publish backend API on host port 3000 and frontend on 8080 (or use the included Caddy service).

3. For host Caddy on port **27296**, use `Caddyfile.host.example`:

   ```bash
   sudo cp Caddyfile.host.example /etc/caddy/Caddyfile
   sudo systemctl reload caddy
   ```

   Site: `http://<host>:27296`

4. Verify:

   ```bash
   curl -I https://git.example.com/health
   git ls-remote https://git.example.com/OWNER/REPO.git
   ```

## Environment

See `.env.example` for the full list. Critical variables:

| Variable       | Description                          |
|----------------|--------------------------------------|
| `APP_SECRET`   | ≥32 chars in production              |
| `JWT_SECRET`   | Signing secret                       |
| `DATABASE_URL` | PostgreSQL connection string         |
| `REDIS_URL`    | Redis connection string              |
| `GIT_ROOT`     | Bare repository storage              |
| `DOMAIN`       | Used by Caddy for TLS                |
| `APP_URL`      | Public base URL                      |

## Persistent data

Docker volumes (default):

- `softgit_postgres` – database
- `softgit_redis` – Redis AOF
- `softgit_git` – bare Git repositories
- `softgit_storage` – avatars, release assets, uploads
- `softgit_ssh` – SSH host keys

These survive `docker compose down` / `up`.

### Backup

```bash
# Database
docker compose exec postgres pg_dump -U softgit softgit > backup.sql

# Git repositories
docker run --rm -v softgit_git:/data -v $(pwd):/backup alpine \
  tar czf /backup/git-repos.tar.gz -C /data .

# Storage
docker run --rm -v softgit_storage:/data -v $(pwd):/backup alpine \
  tar czf /backup/storage.tar.gz -C /data .
```

### Restore

Restore volumes / import SQL before starting the backend, then `docker compose up -d`.

## Upgrades

1. Backup database + `softgit_git` + `softgit_storage`
2. `git pull` / rebuild image
3. `docker compose up -d --build`
4. Migrations run automatically on startup
5. Check `/health` and `/ready`

## Development

```bash
# Dependencies
go mod download

# Local Postgres + Redis (or use compose)
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d postgres redis

export DATABASE_URL=postgres://softgit:softgit@localhost:5432/softgit?sslmode=disable
export REDIS_URL=redis://localhost:6379/0
export GIT_ROOT=/tmp/softgit-git
export APP_SECRET=dev-secret-change-me-32chars-min
export JWT_SECRET=dev-jwt-secret-change-me-32chars

go run ./cmd/server
```

## API overview

Base path: `/api/v1`

| Area        | Examples                                      |
|-------------|-----------------------------------------------|
| Auth        | `POST /auth/register`, `POST /auth/login`     |
| User        | `GET /user`, `PATCH /user`                    |
| Repos       | `POST /user/repos`, `GET /repos/{o}/{r}`      |
| Git data    | `/repos/{o}/{r}/branches`, `/commits`, …      |
| Issues/PRs  | `/repos/{o}/{r}/issues`, `/pulls`             |
| Admin       | `/admin/users`, `/admin/audit_logs`           |

Git Smart HTTP:

```
GET  /{owner}/{repo}.git/info/refs?service=git-upload-pack
POST /{owner}/{repo}.git/git-upload-pack
POST /{owner}/{repo}.git/git-receive-pack
```

Errors follow:

```json
{
  "error": {
    "code": "repository_not_found",
    "message": "Repository does not exist."
  }
}
```

## Security notes

- Passwords: Argon2id
- Tokens: stored only as SHA-256 hashes
- Path traversal protection on repository names and Git paths
- No arbitrary shell execution of user input
- Rate limiting enabled
- Git hooks directory cleared on init
- Prefer running behind Caddy with HTTPS

## License

MIT – see [LICENSE](LICENSE).

## Status

This is a **production-oriented foundation**. Core Git storage, Smart HTTP, SSH skeleton, auth, repository lifecycle, and deployment story are implemented. Remaining work includes completing every issue/PR/webhook/search code path, full permission matrix, LFS, and comprehensive test suite expansion.
