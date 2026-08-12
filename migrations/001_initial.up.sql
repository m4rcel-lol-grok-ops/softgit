-- SoftGit initial schema
-- Production-oriented normalized PostgreSQL schema

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username        VARCHAR(39) NOT NULL UNIQUE,
    email           VARCHAR(255) NOT NULL UNIQUE,
    display_name    VARCHAR(255) NOT NULL DEFAULT '',
    bio             TEXT NOT NULL DEFAULT '',
    avatar_url      TEXT NOT NULL DEFAULT '',
    website         TEXT NOT NULL DEFAULT '',
    location        TEXT NOT NULL DEFAULT '',
    password_hash   TEXT NOT NULL,
    is_admin        BOOLEAN NOT NULL DEFAULT FALSE,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    email_verified  BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_login_at   TIMESTAMPTZ
);

CREATE INDEX idx_users_username_lower ON users (LOWER(username));
CREATE INDEX idx_users_email_lower ON users (LOWER(email));

-- Sessions
CREATE TABLE sessions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash  TEXT NOT NULL UNIQUE,
    user_agent  TEXT NOT NULL DEFAULT '',
    ip_address  INET,
    expires_at  TIMESTAMPTZ NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_at  TIMESTAMPTZ
);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_expires ON sessions(expires_at) WHERE revoked_at IS NULL;

-- Access tokens (PATs)
CREATE TABLE access_tokens (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name          VARCHAR(100) NOT NULL,
    token_hash    TEXT NOT NULL UNIQUE,
    token_prefix  VARCHAR(12) NOT NULL,
    scopes        TEXT[] NOT NULL DEFAULT '{}',
    expires_at    TIMESTAMPTZ,
    last_used_at  TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_at    TIMESTAMPTZ
);

CREATE INDEX idx_access_tokens_user ON access_tokens(user_id);

-- SSH keys
CREATE TABLE ssh_keys (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title         VARCHAR(100) NOT NULL,
    fingerprint   VARCHAR(64) NOT NULL UNIQUE,
    public_key    TEXT NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_used_at  TIMESTAMPTZ
);

CREATE INDEX idx_ssh_keys_user ON ssh_keys(user_id);
CREATE INDEX idx_ssh_keys_fingerprint ON ssh_keys(fingerprint);

-- Organizations
CREATE TABLE organizations (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name          VARCHAR(39) NOT NULL UNIQUE,
    display_name  VARCHAR(255) NOT NULL DEFAULT '',
    description   TEXT NOT NULL DEFAULT '',
    avatar_url    TEXT NOT NULL DEFAULT '',
    website       TEXT NOT NULL DEFAULT '',
    location      TEXT NOT NULL DEFAULT '',
    owner_id      UUID NOT NULL REFERENCES users(id),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_orgs_name_lower ON organizations (LOWER(name));

-- Organization members
CREATE TABLE organization_members (
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role            VARCHAR(20) NOT NULL DEFAULT 'member', -- owner, admin, member
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (organization_id, user_id)
);

-- Teams
CREATE TABLE teams (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id  UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name             VARCHAR(100) NOT NULL,
    description      TEXT NOT NULL DEFAULT '',
    permission       VARCHAR(20) NOT NULL DEFAULT 'read',
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (organization_id, name)
);

CREATE TABLE team_members (
    team_id    UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (team_id, user_id)
);

-- Repositories
CREATE TABLE repositories (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id        UUID NOT NULL,
    owner_type      VARCHAR(20) NOT NULL CHECK (owner_type IN ('user', 'organization')),
    owner_name      VARCHAR(39) NOT NULL,
    name            VARCHAR(100) NOT NULL,
    full_name       VARCHAR(140) NOT NULL UNIQUE,
    description     TEXT NOT NULL DEFAULT '',
    visibility      VARCHAR(20) NOT NULL DEFAULT 'private' CHECK (visibility IN ('public', 'private', 'internal')),
    default_branch  VARCHAR(255) NOT NULL DEFAULT 'main',
    is_fork         BOOLEAN NOT NULL DEFAULT FALSE,
    forked_from_id  UUID REFERENCES repositories(id) ON DELETE SET NULL,
    stars_count     INT NOT NULL DEFAULT 0,
    watchers_count  INT NOT NULL DEFAULT 0,
    forks_count     INT NOT NULL DEFAULT 0,
    open_issues_count INT NOT NULL DEFAULT 0,
    size            BIGINT NOT NULL DEFAULT 0,
    topics          TEXT[] NOT NULL DEFAULT '{}',
    archived        BOOLEAN NOT NULL DEFAULT FALSE,
    disabled        BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    pushed_at       TIMESTAMPTZ,
    UNIQUE (owner_name, name)
);

CREATE INDEX idx_repos_owner ON repositories(owner_id, owner_type);
CREATE INDEX idx_repos_visibility ON repositories(visibility);
CREATE INDEX idx_repos_full_name_lower ON repositories (LOWER(full_name));
CREATE INDEX idx_repos_topics ON repositories USING GIN (topics);

-- Collaborators
CREATE TABLE repository_collaborators (
    repository_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    permission    VARCHAR(20) NOT NULL DEFAULT 'write',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (repository_id, user_id)
);

-- Deploy keys
CREATE TABLE deploy_keys (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    repository_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    title         VARCHAR(100) NOT NULL,
    fingerprint   VARCHAR(64) NOT NULL,
    public_key    TEXT NOT NULL,
    read_only     BOOLEAN NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_used_at  TIMESTAMPTZ,
    UNIQUE (repository_id, fingerprint)
);

-- Issues
CREATE TABLE issues (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    repository_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    number        INT NOT NULL,
    title         VARCHAR(500) NOT NULL,
    body          TEXT NOT NULL DEFAULT '',
    state         VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (state IN ('open', 'closed')),
    author_id     UUID NOT NULL REFERENCES users(id),
    milestone_id  UUID,
    locked        BOOLEAN NOT NULL DEFAULT FALSE,
    comments_count INT NOT NULL DEFAULT 0,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    closed_at     TIMESTAMPTZ,
    closed_by_id  UUID REFERENCES users(id),
    UNIQUE (repository_id, number)
);

CREATE INDEX idx_issues_repo_state ON issues(repository_id, state);
CREATE INDEX idx_issues_author ON issues(author_id);

CREATE TABLE issue_assignees (
    issue_id UUID NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
    user_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    PRIMARY KEY (issue_id, user_id)
);

-- Labels
CREATE TABLE labels (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    repository_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    name          VARCHAR(50) NOT NULL,
    color         VARCHAR(7) NOT NULL DEFAULT '#ededed',
    description   TEXT NOT NULL DEFAULT '',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (repository_id, name)
);

CREATE TABLE issue_labels (
    issue_id UUID NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
    label_id UUID NOT NULL REFERENCES labels(id) ON DELETE CASCADE,
    PRIMARY KEY (issue_id, label_id)
);

-- Milestones
CREATE TABLE milestones (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    repository_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    title         VARCHAR(200) NOT NULL,
    description   TEXT NOT NULL DEFAULT '',
    state         VARCHAR(20) NOT NULL DEFAULT 'open',
    due_on        TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    closed_at     TIMESTAMPTZ
);

ALTER TABLE issues ADD CONSTRAINT fk_issues_milestone
    FOREIGN KEY (milestone_id) REFERENCES milestones(id) ON DELETE SET NULL;

-- Pull requests
CREATE TABLE pull_requests (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    repository_id         UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    number                INT NOT NULL,
    title                 VARCHAR(500) NOT NULL,
    body                  TEXT NOT NULL DEFAULT '',
    state                 VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (state IN ('open', 'closed', 'merged')),
    author_id             UUID NOT NULL REFERENCES users(id),
    head_ref              VARCHAR(255) NOT NULL,
    base_ref              VARCHAR(255) NOT NULL,
    head_sha              VARCHAR(40) NOT NULL DEFAULT '',
    base_sha              VARCHAR(40) NOT NULL DEFAULT '',
    is_draft              BOOLEAN NOT NULL DEFAULT FALSE,
    merged                BOOLEAN NOT NULL DEFAULT FALSE,
    mergeable             BOOLEAN,
    merge_commit_sha      VARCHAR(40),
    merged_at             TIMESTAMPTZ,
    merged_by_id          UUID REFERENCES users(id),
    closed_at             TIMESTAMPTZ,
    comments_count        INT NOT NULL DEFAULT 0,
    review_comments_count INT NOT NULL DEFAULT 0,
    commits_count         INT NOT NULL DEFAULT 0,
    additions             INT NOT NULL DEFAULT 0,
    deletions             INT NOT NULL DEFAULT 0,
    changed_files         INT NOT NULL DEFAULT 0,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (repository_id, number)
);

CREATE INDEX idx_prs_repo_state ON pull_requests(repository_id, state);

-- Comments (issues + PRs)
CREATE TABLE comments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    repository_id   UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    issue_id        UUID REFERENCES issues(id) ON DELETE CASCADE,
    pull_request_id UUID REFERENCES pull_requests(id) ON DELETE CASCADE,
    author_id       UUID NOT NULL REFERENCES users(id),
    body            TEXT NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (issue_id IS NOT NULL OR pull_request_id IS NOT NULL)
);

CREATE INDEX idx_comments_issue ON comments(issue_id);
CREATE INDEX idx_comments_pr ON comments(pull_request_id);

-- Releases
CREATE TABLE releases (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    repository_id     UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    tag_name          VARCHAR(255) NOT NULL,
    name              VARCHAR(255) NOT NULL DEFAULT '',
    body              TEXT NOT NULL DEFAULT '',
    draft             BOOLEAN NOT NULL DEFAULT FALSE,
    prerelease        BOOLEAN NOT NULL DEFAULT FALSE,
    author_id         UUID NOT NULL REFERENCES users(id),
    target_commitish  VARCHAR(255) NOT NULL DEFAULT 'main',
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    published_at      TIMESTAMPTZ,
    UNIQUE (repository_id, tag_name)
);

CREATE TABLE release_assets (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    release_id      UUID NOT NULL REFERENCES releases(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    content_type    VARCHAR(100) NOT NULL DEFAULT 'application/octet-stream',
    size            BIGINT NOT NULL DEFAULT 0,
    download_count  INT NOT NULL DEFAULT 0,
    storage_path    TEXT NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Stars & Watches
CREATE TABLE stars (
    user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    repository_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, repository_id)
);

CREATE TABLE watches (
    user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    repository_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, repository_id)
);

-- Webhooks
CREATE TABLE webhooks (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    repository_id    UUID REFERENCES repositories(id) ON DELETE CASCADE,
    organization_id  UUID REFERENCES organizations(id) ON DELETE CASCADE,
    url              TEXT NOT NULL,
    content_type     VARCHAR(50) NOT NULL DEFAULT 'application/json',
    secret           TEXT NOT NULL DEFAULT '',
    events           TEXT[] NOT NULL DEFAULT '{}',
    active           BOOLEAN NOT NULL DEFAULT TRUE,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (repository_id IS NOT NULL OR organization_id IS NOT NULL)
);

CREATE TABLE webhook_deliveries (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    webhook_id    UUID NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
    event         VARCHAR(50) NOT NULL,
    payload       JSONB NOT NULL,
    response_code INT,
    response_body TEXT,
    duration_ms   INT,
    success       BOOLEAN NOT NULL DEFAULT FALSE,
    attempt       INT NOT NULL DEFAULT 1,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_webhook_deliveries_webhook ON webhook_deliveries(webhook_id);

-- Notifications
CREATE TABLE notifications (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type       VARCHAR(50) NOT NULL,
    title      TEXT NOT NULL,
    body       TEXT NOT NULL DEFAULT '',
    link       TEXT NOT NULL DEFAULT '',
    read       BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    read_at    TIMESTAMPTZ
);

CREATE INDEX idx_notifications_user_unread ON notifications(user_id, read) WHERE read = FALSE;

-- Audit logs
CREATE TABLE audit_logs (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id      UUID REFERENCES users(id) ON DELETE SET NULL,
    action        VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id   UUID,
    ip_address    INET,
    user_agent    TEXT,
    metadata      JSONB NOT NULL DEFAULT '{}',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_actor ON audit_logs(actor_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);

-- Background jobs (simple durable queue)
CREATE TABLE jobs (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type        VARCHAR(100) NOT NULL,
    payload     JSONB NOT NULL DEFAULT '{}',
    status      VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, running, completed, failed
    attempts    INT NOT NULL DEFAULT 0,
    max_attempts INT NOT NULL DEFAULT 5,
    run_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    locked_at   TIMESTAMPTZ,
    locked_by   TEXT,
    error       TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX idx_jobs_pending ON jobs(status, run_at) WHERE status = 'pending';

-- Instance settings
CREATE TABLE settings (
    key         VARCHAR(100) PRIMARY KEY,
    value       JSONB NOT NULL,
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Sequence for issue/PR numbers per repository is handled in application via max+1 with locking
