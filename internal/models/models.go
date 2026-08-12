package models

import (
	"time"

	"github.com/google/uuid"
)

// Visibility for repositories
type Visibility string

const (
	VisibilityPublic   Visibility = "public"
	VisibilityPrivate  Visibility = "private"
	VisibilityInternal Visibility = "internal"
)

// Permission levels
type Permission string

const (
	PermissionRead    Permission = "read"
	PermissionTriage  Permission = "triage"
	PermissionWrite   Permission = "write"
	PermissionMaintain Permission = "maintain"
	PermissionAdmin   Permission = "admin"
)

// User represents a platform user
type User struct {
	ID            uuid.UUID  `json:"id"`
	Username      string     `json:"username"`
	Email         string     `json:"email"`
	DisplayName   string     `json:"display_name"`
	Bio           string     `json:"bio,omitempty"`
	AvatarURL     string     `json:"avatar_url,omitempty"`
	Website       string     `json:"website,omitempty"`
	Location      string     `json:"location,omitempty"`
	PasswordHash  string     `json:"-"`
	IsAdmin       bool       `json:"is_admin"`
	IsVerified    bool       `json:"is_verified"`
	IsActive      bool       `json:"is_active"`
	EmailVerified bool       `json:"email_verified"`
	CreatedAt     time.Time  `json:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at"`
	LastLoginAt   *time.Time `json:"last_login_at,omitempty"`
}

// Organization
type Organization struct {
	ID          uuid.UUID `json:"id"`
	Name        string    `json:"name"`
	DisplayName string    `json:"display_name"`
	Description string    `json:"description,omitempty"`
	AvatarURL   string    `json:"avatar_url,omitempty"`
	Website     string    `json:"website,omitempty"`
	Location    string    `json:"location,omitempty"`
	OwnerID     uuid.UUID `json:"owner_id"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// Team within an organization
type Team struct {
	ID             uuid.UUID  `json:"id"`
	OrganizationID uuid.UUID  `json:"organization_id"`
	Name           string     `json:"name"`
	Description    string     `json:"description,omitempty"`
	Permission     Permission  `json:"permission"`
	CreatedAt      time.Time  `json:"created_at"`
	UpdatedAt      time.Time  `json:"updated_at"`
}

// Repository
type Repository struct {
	ID            uuid.UUID   `json:"id"`
	OwnerID       uuid.UUID   `json:"owner_id"`       // user or org
	OwnerType     string      `json:"owner_type"`     // "user" | "organization"
	OwnerName     string      `json:"owner_name"`
	Name          string      `json:"name"`
	FullName      string      `json:"full_name"` // owner/name
	Description   string      `json:"description,omitempty"`
	Visibility    Visibility  `json:"visibility"`
	DefaultBranch string      `json:"default_branch"`
	IsFork        bool        `json:"is_fork"`
	ForkedFromID  *uuid.UUID  `json:"forked_from_id,omitempty"`
	StarsCount    int         `json:"stars_count"`
	WatchersCount int         `json:"watchers_count"`
	ForksCount    int         `json:"forks_count"`
	IssuesCount   int         `json:"open_issues_count"`
	Size          int64       `json:"size"` // approximate size in bytes
	Topics        []string    `json:"topics,omitempty"`
	Archived      bool        `json:"archived"`
	Disabled      bool        `json:"disabled"`
	CreatedAt     time.Time   `json:"created_at"`
	UpdatedAt     time.Time   `json:"updated_at"`
	PushedAt      *time.Time  `json:"pushed_at,omitempty"`
}

// Session
type Session struct {
	ID        uuid.UUID `json:"id"`
	UserID    uuid.UUID `json:"user_id"`
	TokenHash string    `json:"-"`
	UserAgent string    `json:"user_agent,omitempty"`
	IPAddress string    `json:"ip_address,omitempty"`
	ExpiresAt time.Time `json:"expires_at"`
	CreatedAt time.Time `json:"created_at"`
	RevokedAt *time.Time `json:"revoked_at,omitempty"`
}

// AccessToken (Personal Access Token)
type AccessToken struct {
	ID          uuid.UUID  `json:"id"`
	UserID      uuid.UUID  `json:"user_id"`
	Name        string     `json:"name"`
	TokenHash   string     `json:"-"`
	TokenPrefix string     `json:"token_prefix"` // first 8 chars for identification
	Scopes      []string   `json:"scopes"`
	ExpiresAt   *time.Time `json:"expires_at,omitempty"`
	LastUsedAt  *time.Time `json:"last_used_at,omitempty"`
	CreatedAt   time.Time  `json:"created_at"`
	RevokedAt   *time.Time `json:"revoked_at,omitempty"`
}

// SSHKey
type SSHKey struct {
	ID          uuid.UUID  `json:"id"`
	UserID      uuid.UUID  `json:"user_id"`
	Title       string     `json:"title"`
	Fingerprint string     `json:"fingerprint"`
	PublicKey   string     `json:"public_key"`
	CreatedAt   time.Time  `json:"created_at"`
	LastUsedAt  *time.Time `json:"last_used_at,omitempty"`
}

// DeployKey
type DeployKey struct {
	ID           uuid.UUID  `json:"id"`
	RepositoryID uuid.UUID  `json:"repository_id"`
	Title        string     `json:"title"`
	Fingerprint  string     `json:"fingerprint"`
	PublicKey    string     `json:"public_key"`
	ReadOnly     bool       `json:"read_only"`
	CreatedAt    time.Time  `json:"created_at"`
	LastUsedAt   *time.Time `json:"last_used_at,omitempty"`
}

// Issue
type Issue struct {
	ID           uuid.UUID   `json:"id"`
	RepositoryID uuid.UUID   `json:"repository_id"`
	Number       int         `json:"number"`
	Title        string      `json:"title"`
	Body         string      `json:"body,omitempty"`
	State        string      `json:"state"` // open | closed
	AuthorID     uuid.UUID   `json:"author_id"`
	Author       *User       `json:"author,omitempty"`
	Assignees    []uuid.UUID `json:"assignees,omitempty"`
	Labels       []Label     `json:"labels,omitempty"`
	MilestoneID  *uuid.UUID  `json:"milestone_id,omitempty"`
	Locked       bool        `json:"locked"`
	CommentsCount int        `json:"comments_count"`
	CreatedAt    time.Time   `json:"created_at"`
	UpdatedAt    time.Time   `json:"updated_at"`
	ClosedAt     *time.Time  `json:"closed_at,omitempty"`
	ClosedByID   *uuid.UUID  `json:"closed_by_id,omitempty"`
}

// Label
type Label struct {
	ID           uuid.UUID `json:"id"`
	RepositoryID uuid.UUID `json:"repository_id"`
	Name         string    `json:"name"`
	Color        string    `json:"color"`
	Description  string    `json:"description,omitempty"`
	CreatedAt    time.Time `json:"created_at"`
}

// Milestone
type Milestone struct {
	ID           uuid.UUID  `json:"id"`
	RepositoryID uuid.UUID  `json:"repository_id"`
	Title        string     `json:"title"`
	Description  string     `json:"description,omitempty"`
	State        string     `json:"state"` // open | closed
	DueOn        *time.Time `json:"due_on,omitempty"`
	CreatedAt    time.Time  `json:"created_at"`
	UpdatedAt    time.Time  `json:"updated_at"`
	ClosedAt     *time.Time `json:"closed_at,omitempty"`
}

// PullRequest
type PullRequest struct {
	ID              uuid.UUID  `json:"id"`
	RepositoryID    uuid.UUID  `json:"repository_id"`
	Number          int        `json:"number"`
	Title           string     `json:"title"`
	Body            string     `json:"body,omitempty"`
	State           string     `json:"state"` // open | closed | merged
	AuthorID        uuid.UUID  `json:"author_id"`
	Author          *User      `json:"author,omitempty"`
	HeadRef         string     `json:"head_ref"`
	BaseRef         string     `json:"base_ref"`
	HeadSHA         string     `json:"head_sha"`
	BaseSHA         string     `json:"base_sha"`
	IsDraft         bool       `json:"draft"`
	Merged          bool       `json:"merged"`
	Mergeable       *bool      `json:"mergeable,omitempty"`
	MergeCommitSHA  *string    `json:"merge_commit_sha,omitempty"`
	MergedAt        *time.Time `json:"merged_at,omitempty"`
	MergedByID      *uuid.UUID `json:"merged_by_id,omitempty"`
	ClosedAt        *time.Time `json:"closed_at,omitempty"`
	CommentsCount   int        `json:"comments_count"`
	ReviewCommentsCount int    `json:"review_comments_count"`
	CommitsCount    int        `json:"commits_count"`
	Additions       int        `json:"additions"`
	Deletions       int        `json:"deletions"`
	ChangedFiles    int        `json:"changed_files"`
	CreatedAt       time.Time  `json:"created_at"`
	UpdatedAt       time.Time  `json:"updated_at"`
}

// Comment (shared for issues and PRs)
type Comment struct {
	ID           uuid.UUID  `json:"id"`
	RepositoryID uuid.UUID  `json:"repository_id"`
	IssueID      *uuid.UUID `json:"issue_id,omitempty"`
	PullRequestID *uuid.UUID `json:"pull_request_id,omitempty"`
	AuthorID     uuid.UUID  `json:"author_id"`
	Author       *User      `json:"author,omitempty"`
	Body         string     `json:"body"`
	CreatedAt    time.Time  `json:"created_at"`
	UpdatedAt    time.Time  `json:"updated_at"`
}

// Release
type Release struct {
	ID           uuid.UUID      `json:"id"`
	RepositoryID uuid.UUID      `json:"repository_id"`
	TagName      string         `json:"tag_name"`
	Name         string         `json:"name"`
	Body         string         `json:"body,omitempty"`
	Draft        bool           `json:"draft"`
	Prerelease   bool           `json:"prerelease"`
	AuthorID     uuid.UUID      `json:"author_id"`
	Author       *User          `json:"author,omitempty"`
	TargetCommitish string      `json:"target_commitish"`
	Assets       []ReleaseAsset `json:"assets,omitempty"`
	CreatedAt    time.Time      `json:"created_at"`
	PublishedAt  *time.Time     `json:"published_at,omitempty"`
}

// ReleaseAsset
type ReleaseAsset struct {
	ID           uuid.UUID `json:"id"`
	ReleaseID    uuid.UUID `json:"release_id"`
	Name         string    `json:"name"`
	ContentType  string    `json:"content_type"`
	Size         int64     `json:"size"`
	DownloadCount int      `json:"download_count"`
	StoragePath  string    `json:"-"`
	CreatedAt    time.Time `json:"created_at"`
}

// Webhook
type Webhook struct {
	ID             uuid.UUID `json:"id"`
	RepositoryID   *uuid.UUID `json:"repository_id,omitempty"`
	OrganizationID *uuid.UUID `json:"organization_id,omitempty"`
	URL            string    `json:"url"`
	ContentType    string    `json:"content_type"`
	Secret         string    `json:"-"`
	Events         []string  `json:"events"`
	Active         bool      `json:"active"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}

// Notification
type Notification struct {
	ID        uuid.UUID  `json:"id"`
	UserID    uuid.UUID  `json:"user_id"`
	Type      string     `json:"type"`
	Title     string     `json:"title"`
	Body      string     `json:"body,omitempty"`
	Link      string     `json:"link,omitempty"`
	Read      bool       `json:"read"`
	CreatedAt time.Time  `json:"created_at"`
	ReadAt    *time.Time `json:"read_at,omitempty"`
}

// AuditLog
type AuditLog struct {
	ID         uuid.UUID              `json:"id"`
	ActorID    *uuid.UUID             `json:"actor_id,omitempty"`
	Action     string                 `json:"action"`
	ResourceType string               `json:"resource_type"`
	ResourceID *uuid.UUID             `json:"resource_id,omitempty"`
	IPAddress  string                 `json:"ip_address,omitempty"`
	UserAgent  string                 `json:"user_agent,omitempty"`
	Metadata   map[string]interface{} `json:"metadata,omitempty"`
	CreatedAt  time.Time              `json:"created_at"`
}

// Star / Watch
type Star struct {
	UserID       uuid.UUID `json:"user_id"`
	RepositoryID uuid.UUID `json:"repository_id"`
	CreatedAt    time.Time `json:"created_at"`
}

type Watch struct {
	UserID       uuid.UUID `json:"user_id"`
	RepositoryID uuid.UUID `json:"repository_id"`
	CreatedAt    time.Time `json:"created_at"`
}
