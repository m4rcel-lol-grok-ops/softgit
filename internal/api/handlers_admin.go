package api

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/m4rcel-lol/softgit/internal/models"
)

func (s *Server) handleAdminListUsers(w http.ResponseWriter, r *http.Request) {
	rows, err := s.db.Pool.Query(r.Context(), `
		SELECT id, username, email, display_name, bio, avatar_url, website, location,
		       is_admin, is_verified, is_active, email_verified, created_at, updated_at, last_login_at
		FROM users
		ORDER BY created_at DESC
		LIMIT 500
	`)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal", "query failed")
		return
	}
	defer rows.Close()
	users := make([]models.User, 0)
	for rows.Next() {
		var u models.User
		if err := rows.Scan(
			&u.ID, &u.Username, &u.Email, &u.DisplayName, &u.Bio, &u.AvatarURL, &u.Website, &u.Location,
			&u.IsAdmin, &u.IsVerified, &u.IsActive, &u.EmailVerified, &u.CreatedAt, &u.UpdatedAt, &u.LastLoginAt,
		); err != nil {
			continue
		}
		users = append(users, u)
	}
	writeJSON(w, http.StatusOK, users)
}

func (s *Server) handleAdminUpdateUser(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid_id", "invalid user id")
		return
	}
	var body struct {
		IsActive   *bool `json:"is_active"`
		IsAdmin    *bool `json:"is_admin"`
		IsVerified *bool `json:"is_verified"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_body", "invalid JSON")
		return
	}
	admin := userFromContext(r.Context())
	if body.IsAdmin != nil && id == admin.ID && !*body.IsAdmin {
		writeError(w, http.StatusBadRequest, "invalid", "cannot remove your own admin status")
		return
	}
	if body.IsActive != nil {
		_, err = s.db.Pool.Exec(r.Context(), `UPDATE users SET is_active = $1, updated_at = NOW() WHERE id = $2`, *body.IsActive, id)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "internal", "update failed")
			return
		}
	}
	if body.IsAdmin != nil {
		_, err = s.db.Pool.Exec(r.Context(), `UPDATE users SET is_admin = $1, updated_at = NOW() WHERE id = $2`, *body.IsAdmin, id)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "internal", "update failed")
			return
		}
	}
	if body.IsVerified != nil {
		_, err = s.db.Pool.Exec(r.Context(), `UPDATE users SET is_verified = $1, updated_at = NOW() WHERE id = $2`, *body.IsVerified, id)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "internal", "update failed")
			return
		}
	}
	var u models.User
	err = s.db.Pool.QueryRow(r.Context(), `
		SELECT id, username, email, display_name, bio, avatar_url, website, location,
		       is_admin, is_verified, is_active, email_verified, created_at, updated_at, last_login_at
		FROM users WHERE id = $1
	`, id).Scan(
		&u.ID, &u.Username, &u.Email, &u.DisplayName, &u.Bio, &u.AvatarURL, &u.Website, &u.Location,
		&u.IsAdmin, &u.IsVerified, &u.IsActive, &u.EmailVerified, &u.CreatedAt, &u.UpdatedAt, &u.LastLoginAt,
	)
	if err != nil {
		writeError(w, http.StatusNotFound, "not_found", "user not found")
		return
	}
	writeJSON(w, http.StatusOK, u)
}

func (s *Server) handleAdminListRepos(w http.ResponseWriter, r *http.Request) {
	rows, err := s.db.Pool.Query(r.Context(), `
		SELECT id, owner_id, owner_type, owner_name, name, full_name, description, visibility,
		       default_branch, is_fork, forked_from_id, stars_count, watchers_count, forks_count,
		       open_issues_count, size, topics, archived, disabled, created_at, updated_at, pushed_at
		FROM repositories
		ORDER BY created_at DESC
		LIMIT 500
	`)
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

func (s *Server) handleAdminAuditLogs(w http.ResponseWriter, r *http.Request) {
	rows, err := s.db.Pool.Query(r.Context(), `
		SELECT id, actor_id, action, resource_type, resource_id, metadata, ip_address, created_at
		FROM audit_logs
		ORDER BY created_at DESC
		LIMIT 200
	`)
	if err != nil {
		// Table may be empty / schema variance — return empty list
		writeJSON(w, http.StatusOK, []interface{}{})
		return
	}
	defer rows.Close()
	type logEntry struct {
		ID           string          `json:"id"`
		ActorID      *string         `json:"actor_id,omitempty"`
		Action       string          `json:"action"`
		EntityType   string          `json:"entity_type"`
		EntityID     *string         `json:"entity_id,omitempty"`
		Metadata     json.RawMessage `json:"metadata,omitempty"`
		IPAddress    *string         `json:"ip_address,omitempty"`
		CreatedAt    time.Time       `json:"created_at"`
	}
	logs := make([]logEntry, 0)
	for rows.Next() {
		var e logEntry
		var actorID, entityID *uuid.UUID
		var ip *string
		var meta []byte
		if err := rows.Scan(&e.ID, &actorID, &e.Action, &e.EntityType, &entityID, &meta, &ip, &e.CreatedAt); err != nil {
			continue
		}
		if actorID != nil {
			s := actorID.String()
			e.ActorID = &s
		}
		if entityID != nil {
			s := entityID.String()
			e.EntityID = &s
		}
		e.IPAddress = ip
		if len(meta) > 0 {
			e.Metadata = meta
		}
		logs = append(logs, e)
	}
	writeJSON(w, http.StatusOK, logs)
}

func (s *Server) handleAdminGetSettings(w http.ResponseWriter, r *http.Request) {
	settings := s.loadInstanceSettings(r)
	writeJSON(w, http.StatusOK, settings)
}

func (s *Server) handleAdminUpdateSettings(w http.ResponseWriter, r *http.Request) {
	var body map[string]interface{}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_body", "invalid JSON")
		return
	}
	// Merge with existing
	current := s.loadInstanceSettings(r)
	for k, v := range body {
		current[k] = v
	}
	raw, _ := json.Marshal(current)
	_, err := s.db.Pool.Exec(r.Context(), `
		INSERT INTO settings (key, value, updated_at)
		VALUES ('instance', $1::jsonb, NOW())
		ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
	`, string(raw))
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal", "could not save settings")
		return
	}
	writeJSON(w, http.StatusOK, current)
}

func (s *Server) handleAdminStats(w http.ResponseWriter, r *http.Request) {
	var users, repos, publicRepos, privateRepos int
	_ = s.db.Pool.QueryRow(r.Context(), `SELECT COUNT(*) FROM users`).Scan(&users)
	_ = s.db.Pool.QueryRow(r.Context(), `SELECT COUNT(*) FROM repositories`).Scan(&repos)
	_ = s.db.Pool.QueryRow(r.Context(), `SELECT COUNT(*) FROM repositories WHERE visibility = 'public'`).Scan(&publicRepos)
	_ = s.db.Pool.QueryRow(r.Context(), `SELECT COUNT(*) FROM repositories WHERE visibility = 'private'`).Scan(&privateRepos)
	writeJSON(w, http.StatusOK, map[string]interface{}{
		"users":           users,
		"repositories":    repos,
		"public_repos":    publicRepos,
		"private_repos":   privateRepos,
		"registration":    s.cfg.Auth.RegistrationEnabled,
		"server_time":     time.Now().UTC(),
	})
}

func (s *Server) loadInstanceSettings(r *http.Request) map[string]interface{} {
	defaults := map[string]interface{}{
		"site_name":             "SoftGit",
		"site_description":      "Self-hosted Git hosting",
		"registration_enabled":  s.cfg.Auth.RegistrationEnabled,
		"require_email_verify":  false,
		"default_repo_visibility": "private",
		"allow_public_repos":    true,
		"maintenance_mode":      false,
		"footer_text":           "",
	}
	var raw []byte
	err := s.db.Pool.QueryRow(r.Context(), `SELECT value FROM settings WHERE key = 'instance'`).Scan(&raw)
	if err != nil || len(raw) == 0 {
		return defaults
	}
	var stored map[string]interface{}
	if json.Unmarshal(raw, &stored) != nil {
		return defaults
	}
	for k, v := range stored {
		defaults[k] = v
	}
	return defaults
}

// Remove stub implementations from handlers_repo.go by redefining here — Go will fail if both exist.
// Stubs in handlers_repo.go must be deleted.
