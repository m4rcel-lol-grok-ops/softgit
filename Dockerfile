# SoftGit production image
FROM golang:1.22-bookworm AS builder

WORKDIR /src
RUN apt-get update && apt-get install -y --no-install-recommends git ca-certificates && rm -rf /var/lib/apt/lists/*

COPY go.mod go.sum* ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags="-s -w" -o /softgit ./cmd/server

# Runtime
FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    ca-certificates \
    openssh-client \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Non-root user
RUN groupadd -r softgit && useradd -r -g softgit -d /app -s /sbin/nologin softgit

WORKDIR /app

COPY --from=builder /softgit /app/softgit
COPY migrations /app/migrations
COPY docs /app/docs

RUN mkdir -p /data/git /data/storage /data/ssh && \
    chown -R softgit:softgit /app /data

USER softgit

ENV MIGRATIONS_DIR=/app/migrations \
    GIT_ROOT=/data/git \
    STORAGE_LOCAL_PATH=/data/storage \
    SSH_HOST_KEY_PATH=/data/ssh/ssh_host_ed25519_key \
    HTTP_PORT=3000

EXPOSE 3000 2222

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
    CMD curl -fsS http://127.0.0.1:3000/health || exit 1

ENTRYPOINT ["/app/softgit"]
