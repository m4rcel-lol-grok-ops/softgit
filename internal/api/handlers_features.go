package api

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"golang.org/x/crypto/ssh"
)

// --- Explore / Search ---

func (s *Server) handleSearch(w http.ResponseWriter, r *http.Request) {
	q := strings.TrimSpace(r.URL.Query().Get("q"))
	if q == "" {
		writeJSON(w, http.StatusOK, map[string]interface{}{
			"query": q, "users": []interface{}{}, "repositories": []interface{}{},
		})
		return
	}
	like := "%" + strings.ToLower(q) + "%"

	userRows, err := s.db.Pool.Query(r.Context(), `
		SELECT id, username, email, display_name, bio, avatar_url, website, location,
		       is_admin, is_verified, is_active, email_verified, created_at, updated_at, last_login_at
		FROM users
		WHERE is_active AND (LOWER(username) LIKE $1 OR LOWER(display_name) LIKE $1)
		ORDER BY username LIMIT 20
	`, like)
	users := []interface{}{}
	if err == nil {
		defer userRows.Close()
		for userRows.Next() {
			var u struct {
				ID            uuid.UUID  `json:"id"`
				Username      string     `json:"username"`
				Email         string     `json:"email"`
				DisplayName   string     `json:"display_name"`
				Bio           string     `json:"bio"`
				AvatarURL     string     `json:"avatar_url"`
				Website       string     `json:"website"`
				Location      string     `json:"location"`
				IsAdmin       bool       `json:"is_admin"`
				IsVerified    bool       `json:"is_verified"`
				IsActive      bool       `json:"is_active"`
				EmailVerified bool       `json:"email_verified"`
				CreatedAt     time.Time  `json:"created_at"`
				UpdatedAt     time.Time  `json:"updated_at"`
				LastLoginAt   *time.Time `json:"last_login_at"`
			}
			if userRows.Scan(&u.ID, &u.Username, &u.Email, &u.DisplayName, &u.Bio, &u.AvatarURL, &u.Website, &u.Location,
				&u.IsAdmin, &u.IsVerified, &u.IsActive, &u.EmailVerified, &u.CreatedAt, &u.UpdatedAt, &u.LastLoginAt) == nil {
				users = append(users, u)
			}
		}
	}

	repoRows, err := s.db.Pool.Query(r.Context(), `
		SELECT id, owner_id, owner_type, owner_name, name, full_name, description, visibility,
		       default_branch, is_fork, forked_from_id, stars_count, watchers_count, forks_count,
		       open_issues_count, size, topics, archived, disabled, created_at, updated_at, pushed_at
		FROM repositories
		WHERE visibility = 'public'
		  AND (LOWER(name) LIKE $1 OR LOWER(full_name) LIKE $1 OR LOWER(description) LIKE $1)
		ORDER BY stars_count DESC, updated_at DESC
		LIMIT 20
	`, like)
	repos := []interface{}{}
	if err == nil {
		defer repoRows.Close()
		for repoRows.Next() {
			var repo map[string]interface{}
			var id, ownerID uuid.UUID
			var ownerType, ownerName, name, fullName, desc, vis, defBranch string
			var isFork, archived, disabled bool
			var forkedFrom *uuid.UUID
			var stars, watchers, forks, issues, size int
			var topics []string
			var created, updated time.Time
			var pushed *time.Time
			if repoRows.Scan(&id, &ownerID, &ownerType, &ownerName, &name, &fullName, &desc, &vis,
				&defBranch, &isFork, &forkedFrom, &stars, &watchers, &forks, &issues, &size,
				&topics, &archived, &disabled, &created, &updated, &pushed) == nil {
				repo = map[string]interface{}{
					"id": id, "owner_id": ownerID, "owner_type": ownerType, "owner_name": ownerName,
					"name": name, "full_name": fullName, "description": desc, "visibility": vis,
					"default_branch": defBranch, "is_fork": isFork, "stars_count": stars,
					"watchers_count": watchers, "forks_count": forks, "open_issues_count": issues,
					"archived": archived, "created_at": created, "updated_at": updated,
				}
				repos = append(repos, repo)
			}
		}
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"query": q, "users": users, "repositories": repos,
	})
}

func (s *Server) handleExploreRepos(w http.ResponseWriter, r *http.Request) {
	rows, err := s.db.Pool.Query(r.Context(), `
		SELECT id, owner_id, owner_type, owner_name, name, full_name, description, visibility,
		       default_branch, is_fork, forked_from_id, stars_count, watchers_count, forks_count,
		       open_issues_count, size, topics, archived, disabled, created_at, updated_at, pushed_at
		FROM repositories
		WHERE visibility = 'public' AND NOT archived AND NOT disabled
		ORDER BY stars_count DESC, updated_at DESC
		LIMIT 50
	`)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal", "query failed")
		return
	}
	defer rows.Close()
	list := make([]map[string]interface{}, 0)
	for rows.Next() {
		var id, ownerID uuid.UUID
		var ownerType, ownerName, name, fullName, desc, vis, defBranch string
		var isFork, archived, disabled bool
		var forkedFrom *uuid.UUID
		var stars, watchers, forks, issues, size int
		var topics []string
		var created, updated time.Time
		var pushed *time.Time
		if rows.Scan(&id, &ownerID, &ownerType, &ownerName, &name, &fullName, &desc, &vis,
			&defBranch, &isFork, &forkedFrom, &stars, &watchers, &forks, &issues, &size,
			&topics, &archived, &disabled, &created, &updated, &pushed) != nil {
			continue
		}
		list = append(list, map[string]interface{}{
			"id": id, "owner_name": ownerName, "name": name, "full_name": fullName,
			"description": desc, "visibility": vis, "default_branch": defBranch,
			"stars_count": stars, "forks_count": forks, "open_issues_count": issues,
			"updated_at": updated, "created_at": created,
		})
	}
	writeJSON(w, http.StatusOK, list)
}

// --- SSH keys ---

func (s *Server) handleListSSHKeys(w http.ResponseWriter, r *http.Request) {
	user := userFromContext(r.Context())
	rows, err := s.db.Pool.Query(r.Context(), `
		SELECT id, title, fingerprint, public_key, created_at, last_used_at
		FROM ssh_keys WHERE user_id = $1 ORDER BY created_at DESC
	`, user.ID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal", "query failed")
		return
	}
	defer rows.Close()
	keys := make([]map[string]interface{}, 0)
	for rows.Next() {
		var id uuid.UUID
		var title, fp, pub string
		var created time.Time
		var lastUsed *time.Time
		if rows.Scan(&id, &title, &fp, &pub, &created, &lastUsed) != nil {
			continue
		}
		keys = append(keys, map[string]interface{}{
			"id": id, "title": title, "fingerprint": fp, "public_key": pub,
			"created_at": created, "last_used_at": lastUsed,
		})
	}
	writeJSON(w, http.StatusOK, keys)
}

func (s *Server) handleCreateSSHKey(w http.ResponseWriter, r *http.Request) {
	user := userFromContext(r.Context())
	var body struct {
		Title     string `json:"title"`
		PublicKey string `json:"public_key"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_body", "invalid JSON")
		return
	}
	body.Title = strings.TrimSpace(body.Title)
	body.PublicKey = strings.TrimSpace(body.PublicKey)
	if body.Title == "" || body.PublicKey == "" {
		writeError(w, http.StatusBadRequest, "invalid", "title and public_key required")
		return
	}
	parsed, _, _, _, err := ssh.ParseAuthorizedKey([]byte(body.PublicKey))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid_key", "invalid SSH public key")
		return
	}
	fp := ssh.FingerprintSHA256(parsed)
	var id uuid.UUID
	err = s.db.Pool.QueryRow(r.Context(), `
		INSERT INTO ssh_keys (user_id, title, fingerprint, public_key)
		VALUES ($1, $2, $3, $4)
		RETURNING id
	`, user.ID, body.Title, fp, body.PublicKey).Scan(&id)
	if err != nil {
		if strings.Contains(err.Error(), "duplicate") || strings.Contains(err.Error(), "unique") {
			writeError(w, http.StatusConflict, "conflict", "SSH key already registered")
			return
		}
		writeError(w, http.StatusInternalServerError, "internal", "could not save key")
		return
	}
	writeJSON(w, http.StatusCreated, map[string]interface{}{
		"id": id, "title": body.Title, "fingerprint": fp, "public_key": body.PublicKey,
		"created_at": time.Now().UTC(),
	})
}

func (s *Server) handleDeleteSSHKey(w http.ResponseWriter, r *http.Request) {
	user := userFromContext(r.Context())
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid_id", "invalid id")
		return
	}
	tag, err := s.db.Pool.Exec(r.Context(), `DELETE FROM ssh_keys WHERE id = $1 AND user_id = $2`, id, user.ID)
	if err != nil || tag.RowsAffected() == 0 {
		writeError(w, http.StatusNotFound, "not_found", "key not found")
		return
	}
	writeNoContent(w)
}

// --- Access tokens ---

func (s *Server) handleListTokens(w http.ResponseWriter, r *http.Request) {
	user := userFromContext(r.Context())
	rows, err := s.db.Pool.Query(r.Context(), `
		SELECT id, name, token_prefix, scopes, expires_at, last_used_at, created_at
		FROM access_tokens
		WHERE user_id = $1 AND revoked_at IS NULL
		ORDER BY created_at DESC
	`, user.ID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal", "query failed")
		return
	}
	defer rows.Close()
	tokens := make([]map[string]interface{}, 0)
	for rows.Next() {
		var id uuid.UUID
		var name, prefix string
		var scopes []string
		var expires, lastUsed *time.Time
		var created time.Time
		if rows.Scan(&id, &name, &prefix, &scopes, &expires, &lastUsed, &created) != nil {
			continue
		}
		tokens = append(tokens, map[string]interface{}{
			"id": id, "name": name, "token_prefix": prefix, "scopes": scopes,
			"expires_at": expires, "last_used_at": lastUsed, "created_at": created,
		})
	}
	writeJSON(w, http.StatusOK, tokens)
}

func (s *Server) handleCreateToken(w http.ResponseWriter, r *http.Request) {
	user := userFromContext(r.Context())
	var body struct {
		Name   string   `json:"name"`
		Scopes []string `json:"scopes"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_body", "invalid JSON")
		return
	}
	body.Name = strings.TrimSpace(body.Name)
	if body.Name == "" {
		writeError(w, http.StatusBadRequest, "invalid", "name required")
		return
	}
	if len(body.Scopes) == 0 {
		body.Scopes = []string{"api"}
	}
	raw := make([]byte, 32)
	_, _ = rand.Read(raw)
	tokenStr := "sgt_" + hex.EncodeToString(raw)
	sum := sha256.Sum256([]byte(tokenStr))
	hash := hex.EncodeToString(sum[:])
	prefix := tokenStr[:12]
	var id uuid.UUID
	err := s.db.Pool.QueryRow(r.Context(), `
		INSERT INTO access_tokens (user_id, name, token_hash, token_prefix, scopes)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id
	`, user.ID, body.Name, hash, prefix, body.Scopes).Scan(&id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal", "could not create token")
		return
	}
	writeJSON(w, http.StatusCreated, map[string]interface{}{
		"id": id, "name": body.Name, "token": tokenStr, "token_prefix": prefix,
		"scopes": body.Scopes, "created_at": time.Now().UTC(),
	})
}

func (s *Server) handleDeleteToken(w http.ResponseWriter, r *http.Request) {
	user := userFromContext(r.Context())
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid_id", "invalid id")
		return
	}
	tag, err := s.db.Pool.Exec(r.Context(), `
		UPDATE access_tokens SET revoked_at = NOW() WHERE id = $1 AND user_id = $2 AND revoked_at IS NULL
	`, id, user.ID)
	if err != nil || tag.RowsAffected() == 0 {
		writeError(w, http.StatusNotFound, "not_found", "token not found")
		return
	}
	writeNoContent(w)
}

// --- Issues ---

func (s *Server) handleListIssues(w http.ResponseWriter, r *http.Request) {
	owner := chi.URLParam(r, "owner")
	name := chi.URLParam(r, "repo")
	repo, err := s.ensureRepoAccess(r.Context(), r, owner, name)
	if err != nil || repo == nil {
		writeError(w, http.StatusNotFound, "not_found", "repository not found")
		return
	}
	state := r.URL.Query().Get("state")
	if state == "" {
		state = "open"
	}
	q := `
		SELECT i.id, i.number, i.title, i.body, i.state, i.author_id, u.username, u.is_verified,
		       i.comments_count, i.created_at, i.updated_at, i.closed_at
		FROM issues i
		JOIN users u ON u.id = i.author_id
		WHERE i.repository_id = $1
	`
	args := []interface{}{repo.ID}
	if state != "all" {
		q += ` AND i.state = $2`
		args = append(args, state)
	}
	q += ` ORDER BY i.number DESC LIMIT 100`
	rows, err := s.db.Pool.Query(r.Context(), q, args...)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal", "query failed")
		return
	}
	defer rows.Close()
	list := make([]map[string]interface{}, 0)
	for rows.Next() {
		var id, authorID uuid.UUID
		var number, comments int
		var title, body, st, username string
		var verified bool
		var created, updated time.Time
		var closed *time.Time
		if rows.Scan(&id, &number, &title, &body, &st, &authorID, &username, &verified,
			&comments, &created, &updated, &closed) != nil {
			continue
		}
		list = append(list, map[string]interface{}{
			"id": id, "number": number, "title": title, "body": body, "state": st,
			"author_id": authorID, "author": map[string]interface{}{
				"username": username, "is_verified": verified,
			},
			"comments_count": comments, "created_at": created, "updated_at": updated, "closed_at": closed,
		})
	}
	writeJSON(w, http.StatusOK, list)
}

func (s *Server) handleCreateIssue(w http.ResponseWriter, r *http.Request) {
	user := userFromContext(r.Context())
	owner := chi.URLParam(r, "owner")
	name := chi.URLParam(r, "repo")
	repo, err := s.ensureRepoAccess(r.Context(), r, owner, name)
	if err != nil || repo == nil {
		writeError(w, http.StatusNotFound, "not_found", "repository not found")
		return
	}
	var body struct {
		Title string `json:"title"`
		Body  string `json:"body"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_body", "invalid JSON")
		return
	}
	body.Title = strings.TrimSpace(body.Title)
	if body.Title == "" {
		writeError(w, http.StatusBadRequest, "invalid", "title required")
		return
	}
	var number int
	_ = s.db.Pool.QueryRow(r.Context(), `
		SELECT COALESCE(MAX(number), 0) + 1 FROM issues WHERE repository_id = $1
	`, repo.ID).Scan(&number)
	var id uuid.UUID
	err = s.db.Pool.QueryRow(r.Context(), `
		INSERT INTO issues (repository_id, number, title, body, author_id)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id
	`, repo.ID, number, body.Title, body.Body, user.ID).Scan(&id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal", "could not create issue")
		return
	}
	_, _ = s.db.Pool.Exec(r.Context(), `
		UPDATE repositories SET open_issues_count = open_issues_count + 1 WHERE id = $1
	`, repo.ID)
	writeJSON(w, http.StatusCreated, map[string]interface{}{
		"id": id, "number": number, "title": body.Title, "body": body.Body, "state": "open",
		"author": map[string]interface{}{"username": user.Username, "is_verified": user.IsVerified},
		"created_at": time.Now().UTC(),
	})
}

func (s *Server) handleGetIssue(w http.ResponseWriter, r *http.Request) {
	owner := chi.URLParam(r, "owner")
	name := chi.URLParam(r, "repo")
	num, _ := strconv.Atoi(chi.URLParam(r, "number"))
	repo, err := s.ensureRepoAccess(r.Context(), r, owner, name)
	if err != nil || repo == nil {
		writeError(w, http.StatusNotFound, "not_found", "repository not found")
		return
	}
	var id, authorID uuid.UUID
	var number, comments int
	var title, body, st, username string
	var verified bool
	var created, updated time.Time
	var closed *time.Time
	err = s.db.Pool.QueryRow(r.Context(), `
		SELECT i.id, i.number, i.title, i.body, i.state, i.author_id, u.username, u.is_verified,
		       i.comments_count, i.created_at, i.updated_at, i.closed_at
		FROM issues i JOIN users u ON u.id = i.author_id
		WHERE i.repository_id = $1 AND i.number = $2
	`, repo.ID, num).Scan(&id, &number, &title, &body, &st, &authorID, &username, &verified,
		&comments, &created, &updated, &closed)
	if err != nil {
		writeError(w, http.StatusNotFound, "not_found", "issue not found")
		return
	}
	writeJSON(w, http.StatusOK, map[string]interface{}{
		"id": id, "number": number, "title": title, "body": body, "state": st,
		"author_id": authorID, "author": map[string]interface{}{"username": username, "is_verified": verified},
		"comments_count": comments, "created_at": created, "updated_at": updated, "closed_at": closed,
	})
}

func (s *Server) handleUpdateIssue(w http.ResponseWriter, r *http.Request) {
	user := userFromContext(r.Context())
	owner := chi.URLParam(r, "owner")
	name := chi.URLParam(r, "repo")
	num, _ := strconv.Atoi(chi.URLParam(r, "number"))
	repo, err := s.ensureRepoAccess(r.Context(), r, owner, name)
	if err != nil || repo == nil {
		writeError(w, http.StatusNotFound, "not_found", "repository not found")
		return
	}
	var body struct {
		Title *string `json:"title"`
		Body  *string `json:"body"`
		State *string `json:"state"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_body", "invalid JSON")
		return
	}
	var currentState string
	var issueID uuid.UUID
	err = s.db.Pool.QueryRow(r.Context(), `
		SELECT id, state FROM issues WHERE repository_id = $1 AND number = $2
	`, repo.ID, num).Scan(&issueID, &currentState)
	if err != nil {
		writeError(w, http.StatusNotFound, "not_found", "issue not found")
		return
	}
	if body.Title != nil {
		_, _ = s.db.Pool.Exec(r.Context(), `UPDATE issues SET title = $1, updated_at = NOW() WHERE id = $2`, *body.Title, issueID)
	}
	if body.Body != nil {
		_, _ = s.db.Pool.Exec(r.Context(), `UPDATE issues SET body = $1, updated_at = NOW() WHERE id = $2`, *body.Body, issueID)
	}
	if body.State != nil && (*body.State == "open" || *body.State == "closed") && *body.State != currentState {
		if *body.State == "closed" {
			_, _ = s.db.Pool.Exec(r.Context(), `
				UPDATE issues SET state = 'closed', closed_at = NOW(), closed_by_id = $1, updated_at = NOW() WHERE id = $2
			`, user.ID, issueID)
			_, _ = s.db.Pool.Exec(r.Context(), `
				UPDATE repositories SET open_issues_count = GREATEST(open_issues_count - 1, 0) WHERE id = $1
			`, repo.ID)
		} else {
			_, _ = s.db.Pool.Exec(r.Context(), `
				UPDATE issues SET state = 'open', closed_at = NULL, closed_by_id = NULL, updated_at = NOW() WHERE id = $1
			`, issueID)
			_, _ = s.db.Pool.Exec(r.Context(), `
				UPDATE repositories SET open_issues_count = open_issues_count + 1 WHERE id = $1
			`, repo.ID)
		}
	}
	s.handleGetIssue(w, r)
}

func (s *Server) handleCreateIssueComment(w http.ResponseWriter, r *http.Request) {
	user := userFromContext(r.Context())
	owner := chi.URLParam(r, "owner")
	name := chi.URLParam(r, "repo")
	num, _ := strconv.Atoi(chi.URLParam(r, "number"))
	repo, err := s.ensureRepoAccess(r.Context(), r, owner, name)
	if err != nil || repo == nil {
		writeError(w, http.StatusNotFound, "not_found", "repository not found")
		return
	}
	var issueID uuid.UUID
	err = s.db.Pool.QueryRow(r.Context(), `
		SELECT id FROM issues WHERE repository_id = $1 AND number = $2
	`, repo.ID, num).Scan(&issueID)
	if err != nil {
		writeError(w, http.StatusNotFound, "not_found", "issue not found")
		return
	}
	var body struct {
		Body string `json:"body"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || strings.TrimSpace(body.Body) == "" {
		writeError(w, http.StatusBadRequest, "invalid", "body required")
		return
	}
	var id uuid.UUID
	err = s.db.Pool.QueryRow(r.Context(), `
		INSERT INTO comments (repository_id, issue_id, author_id, body)
		VALUES ($1, $2, $3, $4) RETURNING id
	`, repo.ID, issueID, user.ID, body.Body).Scan(&id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal", "could not create comment")
		return
	}
	_, _ = s.db.Pool.Exec(r.Context(), `
		UPDATE issues SET comments_count = comments_count + 1, updated_at = NOW() WHERE id = $1
	`, issueID)
	writeJSON(w, http.StatusCreated, map[string]interface{}{
		"id": id, "body": body.Body,
		"author": map[string]interface{}{"username": user.Username, "is_verified": user.IsVerified},
		"created_at": time.Now().UTC(),
	})
}

// --- Releases ---

func (s *Server) handleListReleases(w http.ResponseWriter, r *http.Request) {
	owner := chi.URLParam(r, "owner")
	name := chi.URLParam(r, "repo")
	repo, err := s.ensureRepoAccess(r.Context(), r, owner, name)
	if err != nil || repo == nil {
		writeError(w, http.StatusNotFound, "not_found", "repository not found")
		return
	}
	rows, err := s.db.Pool.Query(r.Context(), `
		SELECT r.id, r.tag_name, r.name, r.body, r.draft, r.prerelease, r.author_id,
		       u.username, u.is_verified, r.target_commitish, r.created_at, r.published_at
		FROM releases r JOIN users u ON u.id = r.author_id
		WHERE r.repository_id = $1
		ORDER BY r.created_at DESC
		LIMIT 50
	`, repo.ID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal", "query failed")
		return
	}
	defer rows.Close()
	list := make([]map[string]interface{}, 0)
	for rows.Next() {
		var id, authorID uuid.UUID
		var tag, rname, body, target, username string
		var draft, pre, verified bool
		var created time.Time
		var published *time.Time
		if rows.Scan(&id, &tag, &rname, &body, &draft, &pre, &authorID, &username, &verified,
			&target, &created, &published) != nil {
			continue
		}
		list = append(list, map[string]interface{}{
			"id": id, "tag_name": tag, "name": rname, "body": body,
			"draft": draft, "prerelease": pre, "target_commitish": target,
			"author": map[string]interface{}{"username": username, "is_verified": verified},
			"verified": verified,
			"created_at": created, "published_at": published,
		})
	}
	writeJSON(w, http.StatusOK, list)
}

func (s *Server) handleCreateRelease(w http.ResponseWriter, r *http.Request) {
	user := userFromContext(r.Context())
	owner := chi.URLParam(r, "owner")
	name := chi.URLParam(r, "repo")
	repo, err := s.ensureRepoAccess(r.Context(), r, owner, name)
	if err != nil || repo == nil {
		writeError(w, http.StatusNotFound, "not_found", "repository not found")
		return
	}
	// Only owner or collaborator — simplified: owner or admin
	if user.ID != repo.OwnerID && !user.IsAdmin {
		writeError(w, http.StatusForbidden, "forbidden", "not allowed")
		return
	}
	var body struct {
		TagName         string `json:"tag_name"`
		Name            string `json:"name"`
		Body            string `json:"body"`
		Draft           bool   `json:"draft"`
		Prerelease      bool   `json:"prerelease"`
		TargetCommitish string `json:"target_commitish"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_body", "invalid JSON")
		return
	}
	body.TagName = strings.TrimSpace(body.TagName)
	if body.TagName == "" {
		writeError(w, http.StatusBadRequest, "invalid", "tag_name required")
		return
	}
	if body.Name == "" {
		body.Name = body.TagName
	}
	if body.TargetCommitish == "" {
		body.TargetCommitish = repo.DefaultBranch
		if body.TargetCommitish == "" {
			body.TargetCommitish = "main"
		}
	}
	var id uuid.UUID
	err = s.db.Pool.QueryRow(r.Context(), `
		INSERT INTO releases (repository_id, tag_name, name, body, draft, prerelease, author_id, target_commitish, published_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CASE WHEN $5 THEN NULL ELSE NOW() END)
		RETURNING id
	`, repo.ID, body.TagName, body.Name, body.Body, body.Draft, body.Prerelease, user.ID, body.TargetCommitish).Scan(&id)
	if err != nil {
		if strings.Contains(err.Error(), "unique") || strings.Contains(err.Error(), "duplicate") {
			writeError(w, http.StatusConflict, "conflict", "tag already has a release")
			return
		}
		writeError(w, http.StatusInternalServerError, "internal", "could not create release")
		return
	}
	writeJSON(w, http.StatusCreated, map[string]interface{}{
		"id": id, "tag_name": body.TagName, "name": body.Name, "body": body.Body,
		"draft": body.Draft, "prerelease": body.Prerelease,
		"author": map[string]interface{}{"username": user.Username, "is_verified": user.IsVerified},
		"verified": user.IsVerified,
		"created_at": time.Now().UTC(),
	})
}

// Star status helper for repo response
func (s *Server) handleCheckStarred(w http.ResponseWriter, r *http.Request) {
	user := userFromContext(r.Context())
	owner := chi.URLParam(r, "owner")
	name := chi.URLParam(r, "repo")
	repo, err := s.getRepo(r.Context(), owner, name)
	if err != nil || repo == nil {
		writeJSON(w, http.StatusOK, map[string]bool{"starred": false})
		return
	}
	var exists bool
	_ = s.db.Pool.QueryRow(r.Context(), `
		SELECT EXISTS(SELECT 1 FROM stars WHERE user_id = $1 AND repository_id = $2)
	`, user.ID, repo.ID).Scan(&exists)
	writeJSON(w, http.StatusOK, map[string]bool{"starred": exists})
}

var _ = fmt.Sprintf
