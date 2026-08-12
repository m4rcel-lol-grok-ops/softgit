package api

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/m4rcel-lol/softgit/internal/auth"
	"github.com/m4rcel-lol/softgit/internal/git"
	"github.com/m4rcel-lol/softgit/internal/models"
)

type contextKey string

const userContextKey contextKey = "user"

func (s *Server) authMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		user, err := s.authenticate(r)
		if err != nil || user == nil {
			writeError(w, http.StatusUnauthorized, "unauthorized", "authentication required")
			return
		}
		ctx := context.WithValue(r.Context(), userContextKey, user)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func (s *Server) adminMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		user := userFromContext(r.Context())
		if user == nil || !user.IsAdmin {
			writeError(w, http.StatusForbidden, "forbidden", "admin required")
			return
		}
		next.ServeHTTP(w, r)
	})
}

func userFromContext(ctx context.Context) *models.User {
	u, _ := ctx.Value(userContextKey).(*models.User)
	return u
}

func (s *Server) authenticate(r *http.Request) (*models.User, error) {
	h := r.Header.Get("Authorization")
	if h == "" {
		c, err := r.Cookie("softgit_session")
		if err != nil || c.Value == "" {
			return nil, nil
		}
		return s.userFromSessionToken(r.Context(), c.Value)
	}
	parts := strings.SplitN(h, " ", 2)
	if len(parts) != 2 {
		return nil, nil
	}
	scheme, token := strings.ToLower(parts[0]), parts[1]
	switch scheme {
	case "bearer":
		return s.userFromToken(r.Context(), token)
	case "basic":
		return s.userFromBasic(r)
	default:
		return nil, nil
	}
}

func (s *Server) userFromToken(ctx context.Context, token string) (*models.User, error) {
	hash := auth.HashToken(token)
	var userID uuid.UUID
	var revoked *time.Time
	err := s.db.Pool.QueryRow(ctx, `
		SELECT user_id, revoked_at FROM access_tokens
		WHERE token_hash = $1 AND (expires_at IS NULL OR expires_at > NOW())
	`, hash).Scan(&userID, &revoked)
	if err == nil && revoked == nil {
		return s.getUserByID(ctx, userID)
	}
	return s.userFromSessionToken(ctx, token)
}

func (s *Server) userFromSessionToken(ctx context.Context, token string) (*models.User, error) {
	hash := auth.HashToken(token)
	var userID uuid.UUID
	var expires time.Time
	var revoked *time.Time
	err := s.db.Pool.QueryRow(ctx, `
		SELECT user_id, expires_at, revoked_at FROM sessions WHERE token_hash = $1
	`, hash).Scan(&userID, &expires, &revoked)
	if err != nil || revoked != nil || time.Now().After(expires) {
		return nil, nil
	}
	return s.getUserByID(ctx, userID)
}

func (s *Server) userFromBasic(r *http.Request) (*models.User, error) {
	username, password, ok := r.BasicAuth()
	if !ok {
		return nil, nil
	}
	user, err := s.getUserByUsername(r.Context(), username)
	if err != nil || user == nil {
		return nil, nil
	}
	if !auth.VerifyPassword(password, user.PasswordHash) {
		return nil, nil
	}
	return user, nil
}

func (s *Server) getUserByID(ctx context.Context, id uuid.UUID) (*models.User, error) {
	u := &models.User{}
	err := s.db.Pool.QueryRow(ctx, `
		SELECT id, username, email, display_name, bio, avatar_url, website, location,
		       password_hash, is_admin, is_active, email_verified, created_at, updated_at, last_login_at
		FROM users WHERE id = $1 AND is_active = TRUE
	`, id).Scan(
		&u.ID, &u.Username, &u.Email, &u.DisplayName, &u.Bio, &u.AvatarURL, &u.Website, &u.Location,
		&u.PasswordHash, &u.IsAdmin, &u.IsActive, &u.EmailVerified, &u.CreatedAt, &u.UpdatedAt, &u.LastLoginAt,
	)
	if err != nil {
		return nil, err
	}
	return u, nil
}

func (s *Server) getUserByUsername(ctx context.Context, username string) (*models.User, error) {
	u := &models.User{}
	err := s.db.Pool.QueryRow(ctx, `
		SELECT id, username, email, display_name, bio, avatar_url, website, location,
		       password_hash, is_admin, is_active, email_verified, created_at, updated_at, last_login_at
		FROM users WHERE LOWER(username) = LOWER($1) AND is_active = TRUE
	`, username).Scan(
		&u.ID, &u.Username, &u.Email, &u.DisplayName, &u.Bio, &u.AvatarURL, &u.Website, &u.Location,
		&u.PasswordHash, &u.IsAdmin, &u.IsActive, &u.EmailVerified, &u.CreatedAt, &u.UpdatedAt, &u.LastLoginAt,
	)
	if err != nil {
		return nil, err
	}
	return u, nil
}

func (s *Server) handleRegister(w http.ResponseWriter, r *http.Request) {
	if !s.cfg.Auth.RegistrationEnabled {
		writeError(w, http.StatusForbidden, "registration_disabled", "registration is disabled")
		return
	}
	var req struct {
		Username string `json:"username"`
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := jsonDecode(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_body", "invalid JSON")
		return
	}
	if err := git.ValidateName(req.Username); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_username", err.Error())
		return
	}
	if len(req.Password) < s.cfg.Auth.PasswordMinLength {
		writeError(w, http.StatusBadRequest, "weak_password", "password too short")
		return
	}
	hash, err := auth.HashPassword(req.Password)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal", "could not hash password")
		return
	}
	var count int
	_ = s.db.Pool.QueryRow(r.Context(), `SELECT COUNT(*) FROM users`).Scan(&count)
	isAdmin := count == 0

	var id uuid.UUID
	err = s.db.Pool.QueryRow(r.Context(), `
		INSERT INTO users (username, email, display_name, password_hash, is_admin, email_verified)
		VALUES ($1, $2, $1, $3, $4, $5)
		RETURNING id
	`, req.Username, strings.ToLower(req.Email), hash, isAdmin, !s.cfg.Auth.EmailVerificationRequired).Scan(&id)
	if err != nil {
		if strings.Contains(err.Error(), "unique") {
			writeError(w, http.StatusConflict, "already_exists", "username or email already taken")
			return
		}
		writeError(w, http.StatusInternalServerError, "internal", "could not create user")
		return
	}
	user, _ := s.getUserByID(r.Context(), id)
	writeJSON(w, http.StatusCreated, user)
}

func (s *Server) handleLogin(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Login    string `json:"login"`
		Password string `json:"password"`
	}
	if err := jsonDecode(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_body", "invalid JSON")
		return
	}
	var user *models.User
	if strings.Contains(req.Login, "@") {
		u := &models.User{}
		err := s.db.Pool.QueryRow(r.Context(), `
			SELECT id, username, email, display_name, bio, avatar_url, website, location,
			       password_hash, is_admin, is_active, email_verified, created_at, updated_at, last_login_at
			FROM users WHERE LOWER(email) = LOWER($1) AND is_active = TRUE
		`, req.Login).Scan(
			&u.ID, &u.Username, &u.Email, &u.DisplayName, &u.Bio, &u.AvatarURL, &u.Website, &u.Location,
			&u.PasswordHash, &u.IsAdmin, &u.IsActive, &u.EmailVerified, &u.CreatedAt, &u.UpdatedAt, &u.LastLoginAt,
		)
		if err == nil {
			user = u
		}
	} else {
		user, _ = s.getUserByUsername(r.Context(), req.Login)
	}
	if user == nil || !auth.VerifyPassword(req.Password, user.PasswordHash) {
		writeError(w, http.StatusUnauthorized, "invalid_credentials", "invalid login or password")
		return
	}

	token, err := generateSessionToken()
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal", "could not create session")
		return
	}
	hash := auth.HashToken(token)
	expires := time.Now().Add(s.cfg.Auth.SessionTTL)
	_, err = s.db.Pool.Exec(r.Context(), `
		INSERT INTO sessions (user_id, token_hash, user_agent, ip_address, expires_at)
		VALUES ($1, $2, $3, $4::inet, $5)
	`, user.ID, hash, r.UserAgent(), r.RemoteAddr, expires)
	if err != nil {
		// fallback without inet cast
		_, err = s.db.Pool.Exec(r.Context(), `
			INSERT INTO sessions (user_id, token_hash, user_agent, expires_at)
			VALUES ($1, $2, $3, $4)
		`, user.ID, hash, r.UserAgent(), expires)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "internal", "could not create session")
			return
		}
	}
	_, _ = s.db.Pool.Exec(r.Context(), `UPDATE users SET last_login_at = NOW() WHERE id = $1`, user.ID)

	http.SetCookie(w, &http.Cookie{
		Name:     "softgit_session",
		Value:    token,
		Path:     "/",
		HttpOnly: true,
		Secure:   s.cfg.IsProduction(),
		SameSite: http.SameSiteLaxMode,
		Expires:  expires,
	})
	writeJSON(w, http.StatusOK, map[string]interface{}{
		"token":      token,
		"expires_at": expires,
		"user":       user,
	})
}

func (s *Server) handleLogout(w http.ResponseWriter, r *http.Request) {
	c, err := r.Cookie("softgit_session")
	if err == nil && c.Value != "" {
		hash := auth.HashToken(c.Value)
		_, _ = s.db.Pool.Exec(r.Context(), `UPDATE sessions SET revoked_at = NOW() WHERE token_hash = $1`, hash)
	}
	http.SetCookie(w, &http.Cookie{Name: "softgit_session", Value: "", Path: "/", MaxAge: -1})
	writeNoContent(w)
}

func (s *Server) handleMe(w http.ResponseWriter, r *http.Request) {
	user, _ := s.authenticate(r)
	if user == nil {
		writeError(w, http.StatusUnauthorized, "unauthorized", "not authenticated")
		return
	}
	writeJSON(w, http.StatusOK, user)
}

func (s *Server) handleGetCurrentUser(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, userFromContext(r.Context()))
}

func (s *Server) handleUpdateCurrentUser(w http.ResponseWriter, r *http.Request) {
	user := userFromContext(r.Context())
	var req struct {
		DisplayName *string `json:"display_name"`
		Bio         *string `json:"bio"`
		Website     *string `json:"website"`
		Location    *string `json:"location"`
	}
	if err := jsonDecode(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_body", "invalid JSON")
		return
	}
	if req.DisplayName != nil {
		user.DisplayName = *req.DisplayName
	}
	if req.Bio != nil {
		user.Bio = *req.Bio
	}
	if req.Website != nil {
		user.Website = *req.Website
	}
	if req.Location != nil {
		user.Location = *req.Location
	}
	_, err := s.db.Pool.Exec(r.Context(), `
		UPDATE users SET display_name=$1, bio=$2, website=$3, location=$4, updated_at=NOW() WHERE id=$5
	`, user.DisplayName, user.Bio, user.Website, user.Location, user.ID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal", "update failed")
		return
	}
	writeJSON(w, http.StatusOK, user)
}

func generateSessionToken() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}

func jsonDecode(r *http.Request, v interface{}) error {
	defer r.Body.Close()
	dec := json.NewDecoder(r.Body)
	return dec.Decode(v)
}
