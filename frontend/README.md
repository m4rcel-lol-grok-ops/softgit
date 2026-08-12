# SoftGit Frontend

GitHub-inspired React frontend for the [SoftGit](https://github.com/m4rcel-lol-grok-ops/softgit) self-hosted Git hosting backend.

## Stack

- React 19 + TypeScript
- Vite 6
- TanStack Query
- React Router 7
- Tailwind CSS 4
- Axios

## Development

```bash
cp .env.example .env
# VITE_API_URL=http://localhost:3000/api/v1
# VITE_API_PROXY=http://localhost:3000

npm install
npm run dev
```

Open http://localhost:5173. API requests to `/api` are proxied to the backend.

## Production build

```bash
VITE_API_URL=https://git.example.com/api/v1 npm run build
```

Static files are written to `dist/`.

## Docker

```bash
docker build -t softgit-frontend \
  --build-arg VITE_API_URL=/api/v1 \
  .
docker run -p 8080:80 softgit-frontend
```

## Caddy (frontend + backend)

```caddyfile
git.example.com {
  encode zstd gzip

  handle /api/* {
    reverse_proxy backend:3000
  }

  handle /*.git* {
    reverse_proxy backend:3000
  }

  handle {
    root * /srv/frontend
    try_files {path} /index.html
    file_server
  }
}
```

## Features

- Auth: register, login, logout, session persistence
- Dashboard & explore
- Create repository
- Repository code browser (tree, files, commits, clone URL)
- Issues / PRs / settings tabs (wired to API where available)
- User profiles
- Search
- User settings (profile)
- Light / dark theme
- Responsive layout

All data comes from the SoftGit REST API. No fake production data.
