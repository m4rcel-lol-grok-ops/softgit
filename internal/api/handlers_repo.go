package api

import (
	"context"
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/m4rcel-lol/softgit/internal/git"
	"github.com/m4rcel-lol/softgit/internal/models"
)

func (s *Server) handleCreateUserRepo(w http.ResponseWriter, r *http.Request) {
	user := userFromContext(r.Context())
	var req struct {
		Name          string `json:"name"`
		Description   string `json:"description"`
		Visibility    string `json:"visibility"`
		DefaultBranch string `json:"default_branch"`
	}
	if err := jsonDecode(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_body", "invalid JSON")
		return
	}
	if err := git.ValidateName(req.Name); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_name", err.Error())
		return
	}
	if req.Visibility == "" {
		req.Visibility = "private"
	}
	if req.DefaultBranch == "" {
		req.DefaultBranch = "main"
	}
	vis := models.Visibility(req.Visibility)
	if vis != models.VisibilityPublic && vis != models.VisibilityPrivate && vis != models.VisibilityInternal {
		writeError(w, http.StatusBadRequest, "invalid_visibility", "invalid visibility")
		return
	}

	fullName := user.Username + "/" + req.Name
	var id uuid.UUID
	err := s.db.Pool.QueryRow(r.Context(), `
		INSERT INTO repositories (owner_id, owner_type, owner_name, name, full_name, description, visibility, default_branch)
		VALUES ($1, 'user', $2, $3, $4, $5, $6, $7)
		RETURNING id
	`, user.ID, user.Username, req.Name, fullName, req.Description, string(vis), req.DefaultBranch).Scan(&id)
	if err != nil {
		if strings.Contains(err.Error(), "unique") {
			writeError(w, http.StatusConflict, "already_exists", "repository already exists")
			return
		}
		writeError(w, http.StatusInternalServerError, "internal", "could not create repository")
		return
	}

	if err := s.git.Init(user.Username, req.Name, req.DefaultBranch); err != nil {
		_, _ = s.db.Pool.Exec(r.Context(), `DELETE FROM repositories WHERE id = $1`, id)
		writeError(w, http.StatusInternalServerError, "git_error", "could not initialize git repository: "+err.Error())
		return
	}

	repo := &models.Repository{
		ID: id, OwnerID: user.ID, OwnerType: "user", OwnerName: user.Username,
		Name: req.Name, FullName: fullName, Description: req.Description,
		Visibility: vis, DefaultBranch: req.DefaultBranch,
		CreatedAt: time.Now(), UpdatedAt: time.Now(),
	}
	writeJSON(w, http.StatusCreated, repo)
}

func (s *Server) handleGetRepo(w http.ResponseWriter, r *http.Request) {
	owner := chi.URLParam(r, "owner")
	name := chi.URLParam(r, "repo")
	repo, err := s.getRepo(r.Context(), owner, name)
	if err != nil || repo == nil {
		writeError(w, http.StatusNotFound, "repository_not_found", "repository not found")
		return
	}
	// TODO: authorization check for private repos
	writeJSON(w, http.StatusOK, repo)
}

func (s *Server) getRepo(ctx context.Context, owner, name string) (*models.Repository, error) {
	repo := &models.Repository{}
	var topics []string
	err := s.db.Pool.QueryRow(ctx, `
		SELECT id, owner_id, owner_type, owner_name, name, full_name, description, visibility,
		       default_branch, is_fork, forked_from_id, stars_count, watchers_count, forks_count,
		       open_issues_count, size, topics, archived, disabled, created_at, updated_at, pushed_at
		FROM repositories WHERE LOWER(owner_name) = LOWER($1) AND LOWER(name) = LOWER($2)
	`, owner, name).Scan(
		&repo.ID, &repo.OwnerID, &repo.OwnerType, &repo.OwnerName, &repo.Name, &repo.FullName,
		&repo.Description, &repo.Visibility, &repo.DefaultBranch, &repo.IsFork, &repo.ForkedFromID,
		&repo.StarsCount, &repo.WatchersCount, &repo.ForksCount, &repo.IssuesCount, &repo.Size,
		&topics, &repo.Archived, &repo.Disabled, &repo.CreatedAt, &repo.UpdatedAt, &repo.PushedAt,
	)
	if err != nil {
		return nil, err
	}
	repo.Topics = topics
	return repo, nil
}

func (s *Server) handleUpdateRepo(w http.ResponseWriter, r *http.Request) {
	user := userFromContext(r.Context())
	owner := chi.URLParam(r, "owner")
	name := chi.URLParam(r, "repo")
	repo, err := s.getRepo(r.Context(), owner, name)
	if err != nil || repo == nil {
		writeError(w, http.StatusNotFound, "repository_not_found", "repository not found")
		return
	}
	if repo.OwnerID != user.ID && !user.IsAdmin {
		writeError(w, http.StatusForbidden, "forbidden", "not authorized")
		return
	}
	var req struct {
		Description *string `json:"description"`
		Visibility  *string `json:"visibility"`
	}
	if err := jsonDecode(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_body", "invalid JSON")
		return
	}
	if req.Description != nil {
		repo.Description = *req.Description
	}
	if req.Visibility != nil {
		repo.Visibility = models.Visibility(*req.Visibility)
	}
	_, err = s.db.Pool.Exec(r.Context(), `
		UPDATE repositories SET description=$1, visibility=$2, updated_at=NOW() WHERE id=$3
	`, repo.Description, string(repo.Visibility), repo.ID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal", "update failed")
		return
	}
	writeJSON(w, http.StatusOK, repo)
}

func (s *Server) handleDeleteRepo(w http.ResponseWriter, r *http.Request) {
	user := userFromContext(r.Context())
	owner := chi.URLParam(r, "owner")
	name := chi.URLParam(r, "repo")
	repo, err := s.getRepo(r.Context(), owner, name)
	if err != nil || repo == nil {
		writeError(w, http.StatusNotFound, "repository_not_found", "repository not found")
		return
	}
	if repo.OwnerID != user.ID && !user.IsAdmin {
		writeError(w, http.StatusForbidden, "forbidden", "not authorized")
		return
	}
	if err := s.git.Delete(owner, name); err != nil {
		s.logger.Error("git delete", "error", err)
	}
	_, _ = s.db.Pool.Exec(r.Context(), `DELETE FROM repositories WHERE id = $1`, repo.ID)
	writeNoContent(w)
}

func (s *Server) handleRenameRepo(w http.ResponseWriter, r *http.Request) {
	user := userFromContext(r.Context())
	owner := chi.URLParam(r, "owner")
	name := chi.URLParam(r, "repo")
	repo, err := s.getRepo(r.Context(), owner, name)
	if err != nil || repo == nil {
		writeError(w, http.StatusNotFound, "repository_not_found", "repository not found")
		return
	}
	if repo.OwnerID != user.ID && !user.IsAdmin {
		writeError(w, http.StatusForbidden, "forbidden", "not authorized")
		return
	}
	var req struct {
		Name string `json:"name"`
	}
	if err := jsonDecode(r, &req); err != nil || req.Name == "" {
		writeError(w, http.StatusBadRequest, "invalid_body", "name required")
		return
	}
	if err := git.ValidateName(req.Name); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_name", err.Error())
		return
	}
	if err := s.git.Rename(owner, name, req.Name); err != nil {
		writeError(w, http.StatusInternalServerError, "git_error", err.Error())
		return
	}
	fullName := owner + "/" + req.Name
	_, err = s.db.Pool.Exec(r.Context(), `
		UPDATE repositories SET name=$1, full_name=$2, updated_at=NOW() WHERE id=$3
	`, req.Name, fullName, repo.ID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal", "db update failed")
		return
	}
	repo.Name = req.Name
	repo.FullName = fullName
	writeJSON(w, http.StatusOK, repo)
}

func (s *Server) handleTransferRepo(w http.ResponseWriter, r *http.Request) {
	writeError(w, http.StatusNotImplemented, "not_implemented", "transfer not yet fully implemented")
}

func (s *Server) handleListBranches(w http.ResponseWriter, r *http.Request) {
	owner := chi.URLParam(r, "owner")
	name := chi.URLParam(r, "repo")
	branches, err := s.git.ListBranches(owner, name)
	if err != nil {
		writeError(w, http.StatusNotFound, "not_found", "repository or branches not found")
		return
	}
	type branch struct {
		Name string `json:"name"`
	}
	out := make([]branch, 0, len(branches))
	for _, b := range branches {
		out = append(out, branch{Name: b})
	}
	writeJSON(w, http.StatusOK, out)
}

func (s *Server) handleListTags(w http.ResponseWriter, r *http.Request) {
	owner := chi.URLParam(r, "owner")
	name := chi.URLParam(r, "repo")
	tags, err := s.git.ListTags(owner, name)
	if err != nil {
		writeError(w, http.StatusNotFound, "not_found", "not found")
		return
	}
	writeJSON(w, http.StatusOK, tags)
}

func (s *Server) handleListCommits(w http.ResponseWriter, r *http.Request) {
	owner := chi.URLParam(r, "owner")
	name := chi.URLParam(r, "repo")
	ref := r.URL.Query().Get("sha")
	if ref == "" {
		ref = "HEAD"
	}
	commits, err := s.git.Log(owner, name, ref, 30)
	if err != nil {
		writeError(w, http.StatusNotFound, "not_found", "not found")
		return
	}
	// Enrich with SoftGit verified status when commit email matches a user
	for i := range commits {
		var username string
		var verified bool
		err := s.db.Pool.QueryRow(r.Context(), `
			SELECT username, is_verified FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1
		`, commits[i].Email).Scan(&username, &verified)
		if err == nil {
			commits[i].Username = username
			commits[i].Verified = verified
		}
	}
	writeJSON(w, http.StatusOK, commits)
}

func (s *Server) handleGetContents(w http.ResponseWriter, r *http.Request) {
	owner := chi.URLParam(r, "owner")
	name := chi.URLParam(r, "repo")
	path := chi.URLParam(r, "*")
	ref := r.URL.Query().Get("ref")
	if ref == "" {
		ref = "HEAD"
	}
	entries, err := s.git.LsTree(owner, name, ref, path)
	if err != nil {
		// try as file
		data, err2 := s.git.CatFile(owner, name, ref, path)
		if err2 != nil {
			writeError(w, http.StatusNotFound, "not_found", "path not found")
			return
		}
		writeJSON(w, http.StatusOK, map[string]interface{}{
			"type":     "file",
			"path":     path,
			"content":  string(data),
			"encoding": "utf-8",
		})
		return
	}
	writeJSON(w, http.StatusOK, map[string]interface{}{
		"type":    "dir",
		"path":    path,
		"entries": entries,
	})
}

func (s *Server) handleGetRaw(w http.ResponseWriter, r *http.Request) {
	owner := chi.URLParam(r, "owner")
	name := chi.URLParam(r, "repo")
	// path after /raw/
	path := chi.URLParam(r, "*")
	ref := "HEAD"
	data, err := s.git.CatFile(owner, name, ref, path)
	if err != nil {
		writeError(w, http.StatusNotFound, "not_found", "file not found")
		return
	}
	w.Header().Set("Content-Type", "application/octet-stream")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(data)
}

func (s *Server) handleArchive(w http.ResponseWriter, r *http.Request) {
	owner := chi.URLParam(r, "owner")
	name := chi.URLParam(r, "repo")
	ref := chi.URLParam(r, "ref")
	format := chi.URLParam(r, "format")
	data, err := s.git.Archive(owner, name, ref, format)
	if err != nil {
		writeError(w, http.StatusNotFound, "not_found", "archive failed")
		return
	}
	ct := "application/gzip"
	if format == "zip" {
		ct = "application/zip"
	}
	w.Header().Set("Content-Type", ct)
	w.Header().Set("Content-Disposition", "attachment; filename="+name+"-"+ref+"."+format)
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(data)
}

func (s *Server) handleStarRepo(w http.ResponseWriter, r *http.Request) {
	user := userFromContext(r.Context())
	owner := chi.URLParam(r, "owner")
	name := chi.URLParam(r, "repo")
	repo, err := s.getRepo(r.Context(), owner, name)
	if err != nil || repo == nil {
		writeError(w, http.StatusNotFound, "not_found", "repository not found")
		return
	}
	_, _ = s.db.Pool.Exec(r.Context(), `
		INSERT INTO stars (user_id, repository_id) VALUES ($1, $2) ON CONFLICT DO NOTHING
	`, user.ID, repo.ID)
	_, _ = s.db.Pool.Exec(r.Context(), `UPDATE repositories SET stars_count = stars_count + 1 WHERE id = $1`, repo.ID)
	writeNoContent(w)
}

func (s *Server) handleUnstarRepo(w http.ResponseWriter, r *http.Request) {
	user := userFromContext(r.Context())
	owner := chi.URLParam(r, "owner")
	name := chi.URLParam(r, "repo")
	repo, err := s.getRepo(r.Context(), owner, name)
	if err != nil || repo == nil {
		writeError(w, http.StatusNotFound, "not_found", "repository not found")
		return
	}
	tag, _ := s.db.Pool.Exec(r.Context(), `DELETE FROM stars WHERE user_id=$1 AND repository_id=$2`, user.ID, repo.ID)
	if tag.RowsAffected() > 0 {
		_, _ = s.db.Pool.Exec(r.Context(), `UPDATE repositories SET stars_count = GREATEST(stars_count - 1, 0) WHERE id = $1`, repo.ID)
	}
	writeNoContent(w)
}

// Stubs for remaining handlers referenced in router
func (s *Server) handleGetUser(w http.ResponseWriter, r *http.Request) {
	username := chi.URLParam(r, "username")
	user, err := s.getUserByUsername(r.Context(), username)
	if err != nil || user == nil {
		writeError(w, http.StatusNotFound, "not_found", "user not found")
		return
	}
	user.PasswordHash = ""
	writeJSON(w, http.StatusOK, user)
}

func (s *Server) handleSearch(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query().Get("q")
	writeJSON(w, http.StatusOK, map[string]interface{}{"query": q, "users": []interface{}{}, "repositories": []interface{}{}})
}

func (s *Server) handleListSSHKeys(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, []interface{}{})
}
func (s *Server) handleCreateSSHKey(w http.ResponseWriter, r *http.Request) {
	writeError(w, http.StatusNotImplemented, "not_implemented", "coming soon")
}
func (s *Server) handleDeleteSSHKey(w http.ResponseWriter, r *http.Request) {
	writeNoContent(w)
}
func (s *Server) handleListTokens(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, []interface{}{})
}
func (s *Server) handleCreateToken(w http.ResponseWriter, r *http.Request) {
	writeError(w, http.StatusNotImplemented, "not_implemented", "coming soon")
}
func (s *Server) handleDeleteToken(w http.ResponseWriter, r *http.Request) {
	writeNoContent(w)
}
func (s *Server) handleListIssues(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, []interface{}{})
}
func (s *Server) handleCreateIssue(w http.ResponseWriter, r *http.Request) {
	writeError(w, http.StatusNotImplemented, "not_implemented", "coming soon")
}
func (s *Server) handleGetIssue(w http.ResponseWriter, r *http.Request) {
	writeError(w, http.StatusNotFound, "not_found", "issue not found")
}
func (s *Server) handleUpdateIssue(w http.ResponseWriter, r *http.Request) {
	writeError(w, http.StatusNotImplemented, "not_implemented", "coming soon")
}
func (s *Server) handleCreateIssueComment(w http.ResponseWriter, r *http.Request) {
	writeError(w, http.StatusNotImplemented, "not_implemented", "coming soon")
}
func (s *Server) handleListPulls(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, []interface{}{})
}
func (s *Server) handleCreatePull(w http.ResponseWriter, r *http.Request) {
	writeError(w, http.StatusNotImplemented, "not_implemented", "coming soon")
}
func (s *Server) handleGetPull(w http.ResponseWriter, r *http.Request) {
	writeError(w, http.StatusNotFound, "not_found", "pull request not found")
}
func (s *Server) handleMergePull(w http.ResponseWriter, r *http.Request) {
	writeError(w, http.StatusNotImplemented, "not_implemented", "coming soon")
}
func (s *Server) handleListReleases(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, []interface{}{})
}
func (s *Server) handleCreateRelease(w http.ResponseWriter, r *http.Request) {
	writeError(w, http.StatusNotImplemented, "not_implemented", "coming soon")
}
func (s *Server) handleListHooks(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, []interface{}{})
}
func (s *Server) handleCreateHook(w http.ResponseWriter, r *http.Request) {
	writeError(w, http.StatusNotImplemented, "not_implemented", "coming soon")
}

// context import

