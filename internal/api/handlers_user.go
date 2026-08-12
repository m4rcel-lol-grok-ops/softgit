package api

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/m4rcel-lol/softgit/internal/models"
)

// handleListUserRepos lists public repositories for a user (and private ones if viewer is owner).
func (s *Server) handleListUserRepos(w http.ResponseWriter, r *http.Request) {
	username := chi.URLParam(r, "username")
	user, err := s.getUserByUsername(r.Context(), username)
	if err != nil || user == nil {
		writeError(w, http.StatusNotFound, "not_found", "user not found")
		return
	}

	viewer, _ := s.authenticate(r)
	includePrivate := viewer != nil && viewer.ID == user.ID

	q := `
		SELECT id, owner_id, owner_type, owner_name, name, full_name, description, visibility,
		       default_branch, is_fork, forked_from_id, stars_count, watchers_count, forks_count,
		       open_issues_count, size, topics, archived, disabled, created_at, updated_at, pushed_at
		FROM repositories
		WHERE owner_type = 'user' AND owner_id = $1
	`
	if !includePrivate {
		q += ` AND visibility = 'public'`
	}
	q += ` ORDER BY updated_at DESC LIMIT 100`

	rows, err := s.db.Pool.Query(r.Context(), q, user.ID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal", "query failed")
		return
	}
	defer rows.Close()

	repos := make([]models.Repository, 0)
	for rows.Next() {
		var repo models.Repository
		var topics []string
		if err := rows.Scan(
			&repo.ID, &repo.OwnerID, &repo.OwnerType, &repo.OwnerName, &repo.Name, &repo.FullName,
			&repo.Description, &repo.Visibility, &repo.DefaultBranch, &repo.IsFork, &repo.ForkedFromID,
			&repo.StarsCount, &repo.WatchersCount, &repo.ForksCount, &repo.IssuesCount, &repo.Size,
			&topics, &repo.Archived, &repo.Disabled, &repo.CreatedAt, &repo.UpdatedAt, &repo.PushedAt,
		); err != nil {
			continue
		}
		repo.Topics = topics
		repos = append(repos, repo)
	}
	writeJSON(w, http.StatusOK, repos)
}

// handleListMyRepos lists all repositories owned by the current user.
func (s *Server) handleListMyRepos(w http.ResponseWriter, r *http.Request) {
	user := userFromContext(r.Context())
	rows, err := s.db.Pool.Query(r.Context(), `
		SELECT id, owner_id, owner_type, owner_name, name, full_name, description, visibility,
		       default_branch, is_fork, forked_from_id, stars_count, watchers_count, forks_count,
		       open_issues_count, size, topics, archived, disabled, created_at, updated_at, pushed_at
		FROM repositories
		WHERE owner_type = 'user' AND owner_id = $1
		ORDER BY updated_at DESC
		LIMIT 100
	`, user.ID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal", "query failed")
		return
	}
	defer rows.Close()

	repos := make([]models.Repository, 0)
	for rows.Next() {
		var repo models.Repository
		var topics []string
		if err := rows.Scan(
			&repo.ID, &repo.OwnerID, &repo.OwnerType, &repo.OwnerName, &repo.Name, &repo.FullName,
			&repo.Description, &repo.Visibility, &repo.DefaultBranch, &repo.IsFork, &repo.ForkedFromID,
			&repo.StarsCount, &repo.WatchersCount, &repo.ForksCount, &repo.IssuesCount, &repo.Size,
			&topics, &repo.Archived, &repo.Disabled, &repo.CreatedAt, &repo.UpdatedAt, &repo.PushedAt,
		); err != nil {
			continue
		}
		repo.Topics = topics
		repos = append(repos, repo)
	}
	writeJSON(w, http.StatusOK, repos)
}

// handleProfileReadme returns the README.md content from the special profile repository.
// GitHub-style: a public repository named the same as the username (owner/owner).
func (s *Server) handleProfileReadme(w http.ResponseWriter, r *http.Request) {
	username := chi.URLParam(r, "username")
	// Profile repo is username/username
	exists, err := s.git.Exists(username, username)
	if err != nil || !exists {
		writeError(w, http.StatusNotFound, "not_found", "no profile README")
		return
	}
	// Prefer public visibility
	repo, err := s.getRepo(r.Context(), username, username)
	if err != nil || repo == nil {
		writeError(w, http.StatusNotFound, "not_found", "no profile README")
		return
	}
	if repo.Visibility != models.VisibilityPublic {
		viewer, _ := s.authenticate(r)
		if viewer == nil || viewer.Username != username {
			writeError(w, http.StatusNotFound, "not_found", "no profile README")
			return
		}
	}

	ref := repo.DefaultBranch
	if ref == "" {
		ref = "main"
	}
	// Try README.md then readme.md
	for _, name := range []string{"README.md", "readme.md", "README.MD"} {
		data, err := s.git.CatFile(username, username, ref, name)
		if err == nil && len(data) > 0 {
			writeJSON(w, http.StatusOK, map[string]interface{}{
				"name":     name,
				"path":     name,
				"content":  string(data),
				"encoding": "utf-8",
				"repo":     repo.FullName,
			})
			return
		}
	}
	writeError(w, http.StatusNotFound, "not_found", "profile repository has no README")
}

// handleUploadAvatar accepts multipart form field "avatar" (image).
func (s *Server) handleUploadAvatar(w http.ResponseWriter, r *http.Request) {
	user := userFromContext(r.Context())
	maxBytes := s.cfg.Upload.MaxAvatarSizeMB * 1024 * 1024
	if maxBytes <= 0 {
		maxBytes = 5 * 1024 * 1024
	}
	r.Body = http.MaxBytesReader(w, r.Body, maxBytes+1024)
	if err := r.ParseMultipartForm(maxBytes); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_upload", "file too large or invalid form")
		return
	}
	file, header, err := r.FormFile("avatar")
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid_upload", "avatar field required")
		return
	}
	defer file.Close()

	ct := header.Header.Get("Content-Type")
	ext := ".png"
	switch {
	case strings.Contains(ct, "jpeg"), strings.Contains(ct, "jpg"):
		ext = ".jpg"
	case strings.Contains(ct, "png"):
		ext = ".png"
	case strings.Contains(ct, "gif"):
		ext = ".gif"
	case strings.Contains(ct, "webp"):
		ext = ".webp"
	default:
		// sniff by extension
		lower := strings.ToLower(header.Filename)
		switch {
		case strings.HasSuffix(lower, ".jpg"), strings.HasSuffix(lower, ".jpeg"):
			ext = ".jpg"
		case strings.HasSuffix(lower, ".gif"):
			ext = ".gif"
		case strings.HasSuffix(lower, ".webp"):
			ext = ".webp"
		case strings.HasSuffix(lower, ".png"):
			ext = ".png"
		default:
			writeError(w, http.StatusBadRequest, "invalid_type", "avatar must be png, jpg, gif, or webp")
			return
		}
	}

	dir := filepath.Join(s.cfg.Storage.LocalPath, "avatars")
	if err := os.MkdirAll(dir, 0o750); err != nil {
		writeError(w, http.StatusInternalServerError, "internal", "storage error")
		return
	}
	// Use stable filename per user
	filename := user.ID.String() + ext
	path := filepath.Join(dir, filename)

	// Remove old avatars for this user
	matches, _ := filepath.Glob(filepath.Join(dir, user.ID.String()+".*"))
	for _, m := range matches {
		_ = os.Remove(m)
	}

	out, err := os.Create(path)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal", "could not save avatar")
		return
	}
	defer out.Close()
	if _, err := io.Copy(out, file); err != nil {
		writeError(w, http.StatusInternalServerError, "internal", "could not write avatar")
		return
	}

	// Public URL served by this API
	avatarURL := fmt.Sprintf("/api/v1/avatars/%s%s", user.ID.String(), ext)
	_, err = s.db.Pool.Exec(r.Context(), `
		UPDATE users SET avatar_url = $1, updated_at = NOW() WHERE id = $2
	`, avatarURL, user.ID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal", "could not update profile")
		return
	}
	user.AvatarURL = avatarURL
	writeJSON(w, http.StatusOK, user)
}


// handleDeleteAvatar removes the current user's avatar.
func (s *Server) handleDeleteAvatar(w http.ResponseWriter, r *http.Request) {
	user := userFromContext(r.Context())
	dir := filepath.Join(s.cfg.Storage.LocalPath, "avatars")
	matches, _ := filepath.Glob(filepath.Join(dir, user.ID.String()+".*"))
	for _, m := range matches {
		_ = os.Remove(m)
	}
	_, err := s.db.Pool.Exec(r.Context(), `UPDATE users SET avatar_url = '', updated_at = NOW() WHERE id = $1`, user.ID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal", "could not update profile")
		return
	}
	user.AvatarURL = ""
	writeJSON(w, http.StatusOK, user)
}

// handleServeAvatar serves stored avatar files.
func (s *Server) handleServeAvatar(w http.ResponseWriter, r *http.Request) {
	name := chi.URLParam(r, "filename")
	// Prevent path traversal
	name = filepath.Base(name)
	if name == "" || name == "." || strings.Contains(name, "..") {
		http.NotFound(w, r)
		return
	}
	path := filepath.Join(s.cfg.Storage.LocalPath, "avatars", name)
	// Ensure under avatars dir
	if !strings.HasPrefix(filepath.Clean(path), filepath.Clean(filepath.Join(s.cfg.Storage.LocalPath, "avatars"))) {
		http.NotFound(w, r)
		return
	}
	f, err := os.Open(path)
	if err != nil {
		http.NotFound(w, r)
		return
	}
	defer f.Close()
	// Content type by extension
	ext := strings.ToLower(filepath.Ext(name))
	switch ext {
	case ".jpg", ".jpeg":
		w.Header().Set("Content-Type", "image/jpeg")
	case ".gif":
		w.Header().Set("Content-Type", "image/gif")
	case ".webp":
		w.Header().Set("Content-Type", "image/webp")
	default:
		w.Header().Set("Content-Type", "image/png")
	}
	w.Header().Set("Cache-Control", "public, max-age=86400")
	http.ServeContent(w, r, name, time.Time{}, f)
}

// ensureRepoAccess returns the repo if the viewer may access it.
func (s *Server) ensureRepoAccess(ctx context.Context, r *http.Request, owner, name string) (*models.Repository, error) {
	repo, err := s.getRepo(ctx, owner, name)
	if err != nil || repo == nil {
		return nil, err
	}
	if repo.Visibility == models.VisibilityPublic {
		return repo, nil
	}
	viewer, _ := s.authenticate(r)
	if viewer == nil {
		return nil, fmt.Errorf("unauthorized")
	}
	if viewer.ID == repo.OwnerID || viewer.IsAdmin {
		return repo, nil
	}
	// collaborators
	var exists bool
	_ = s.db.Pool.QueryRow(ctx, `
		SELECT EXISTS(SELECT 1 FROM repository_collaborators WHERE repository_id = $1 AND user_id = $2)
	`, repo.ID, viewer.ID).Scan(&exists)
	if exists {
		return repo, nil
	}
	return nil, fmt.Errorf("forbidden")
}

// handleGetRepoPublic allows unauthenticated access to public repositories.
func (s *Server) handleGetRepoPublic(w http.ResponseWriter, r *http.Request) {
	owner := chi.URLParam(r, "owner")
	name := chi.URLParam(r, "repo")
	repo, err := s.ensureRepoAccess(r.Context(), r, owner, name)
	if err != nil || repo == nil {
		writeError(w, http.StatusNotFound, "repository_not_found", "repository not found")
		return
	}
	writeJSON(w, http.StatusOK, repo)
}

