package api

import (
	"log/slog"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/go-chi/httprate"
	"github.com/m4rcel-lol/softgit/internal/config"
	"github.com/m4rcel-lol/softgit/internal/db"
	"github.com/m4rcel-lol/softgit/internal/git"
	"github.com/redis/go-redis/v9"
)

type Server struct {
	cfg    *config.Config
	db     *db.DB
	rdb    *redis.Client
	git    *git.Manager
	logger *slog.Logger
}

func NewRouter(cfg *config.Config, database *db.DB, rdb *redis.Client, gitMgr *git.Manager, logger *slog.Logger) http.Handler {
	s := &Server{cfg: cfg, db: database, rdb: rdb, git: gitMgr, logger: logger}

	r := chi.NewRouter()
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(s.requestLogger)
	r.Use(middleware.Recoverer)
	r.Use(middleware.Compress(5))
	r.Use(cors.Handler(cors.Options{
		AllowOriginFunc:  func(r *http.Request, origin string) bool { return true },
		AllowedMethods:   []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-Request-ID"},
		ExposedHeaders:   []string{"Link", "X-Request-ID", "X-Total-Count"},
		AllowCredentials: true,
		MaxAge:           300,
	}))
	r.Use(httprate.Limit(cfg.RateLimit.Requests, cfg.RateLimit.Window, httprate.WithKeyByIP()))

	r.Get("/health", s.handleHealth)
	r.Get("/ready", s.handleReady)
	r.Get("/metrics", s.handleMetrics)

	// Git Smart HTTP
	r.Route("/{owner}/{repo}.git", func(r chi.Router) {
		r.Get("/info/refs", s.handleGitInfoRefs)
		r.Post("/git-upload-pack", s.handleGitUploadPack)
		r.Post("/git-receive-pack", s.handleGitReceivePack)
	})

	r.Route("/api/v1", func(r chi.Router) {
		r.Post("/auth/register", s.handleRegister)
		r.Post("/auth/login", s.handleLogin)
		r.Post("/auth/logout", s.handleLogout)
		r.Get("/auth/me", s.handleMe)

		// Public user endpoints
		r.Get("/users/{username}", s.handleGetUser)
		r.Get("/users/{username}/repos", s.handleListUserRepos)
		r.Get("/users/{username}/profile-readme", s.handleProfileReadme)
		r.Get("/search", s.handleSearch)

		// Public avatar files
		r.Get("/avatars/{filename}", s.handleServeAvatar)

		// Public repository read (visibility checked inside)
		r.Get("/repos/{owner}/{repo}", s.handleGetRepoPublic)
		r.Get("/repos/{owner}/{repo}/branches", s.handleListBranches)
		r.Get("/repos/{owner}/{repo}/tags", s.handleListTags)
		r.Get("/repos/{owner}/{repo}/commits", s.handleListCommits)
		r.Get("/repos/{owner}/{repo}/contents", s.handleGetContents)
		r.Get("/repos/{owner}/{repo}/contents/*", s.handleGetContents)
		r.Get("/repos/{owner}/{repo}/raw/*", s.handleGetRaw)
		r.Get("/repos/{owner}/{repo}/archive/{ref}.{format}", s.handleArchive)
		r.Get("/repos/{owner}/{repo}/issues", s.handleListIssues)
		r.Get("/repos/{owner}/{repo}/pulls", s.handleListPulls)
		r.Get("/repos/{owner}/{repo}/releases", s.handleListReleases)

		r.Group(func(r chi.Router) {
			r.Use(s.authMiddleware)

			r.Get("/user", s.handleGetCurrentUser)
			r.Patch("/user", s.handleUpdateCurrentUser)
			r.Post("/user/avatar", s.handleUploadAvatar)
			r.Delete("/user/avatar", s.handleDeleteAvatar)
			r.Get("/user/ssh_keys", s.handleListSSHKeys)
			r.Post("/user/ssh_keys", s.handleCreateSSHKey)
			r.Delete("/user/ssh_keys/{id}", s.handleDeleteSSHKey)
			r.Get("/user/tokens", s.handleListTokens)
			r.Post("/user/tokens", s.handleCreateToken)
			r.Delete("/user/tokens/{id}", s.handleDeleteToken)

			r.Get("/user/repos", s.handleListMyRepos)
			r.Post("/user/repos", s.handleCreateUserRepo)
			r.Patch("/repos/{owner}/{repo}", s.handleUpdateRepo)
			r.Delete("/repos/{owner}/{repo}", s.handleDeleteRepo)
			r.Post("/repos/{owner}/{repo}/transfer", s.handleTransferRepo)
			r.Post("/repos/{owner}/{repo}/rename", s.handleRenameRepo)

			r.Put("/user/starred/{owner}/{repo}", s.handleStarRepo)
			r.Delete("/user/starred/{owner}/{repo}", s.handleUnstarRepo)

			r.Post("/repos/{owner}/{repo}/issues", s.handleCreateIssue)
			r.Get("/repos/{owner}/{repo}/issues/{number}", s.handleGetIssue)
			r.Patch("/repos/{owner}/{repo}/issues/{number}", s.handleUpdateIssue)
			r.Post("/repos/{owner}/{repo}/issues/{number}/comments", s.handleCreateIssueComment)

			r.Post("/repos/{owner}/{repo}/pulls", s.handleCreatePull)
			r.Get("/repos/{owner}/{repo}/pulls/{number}", s.handleGetPull)
			r.Put("/repos/{owner}/{repo}/pulls/{number}/merge", s.handleMergePull)

			r.Post("/repos/{owner}/{repo}/releases", s.handleCreateRelease)

			r.Get("/repos/{owner}/{repo}/hooks", s.handleListHooks)
			r.Post("/repos/{owner}/{repo}/hooks", s.handleCreateHook)

			r.Route("/admin", func(r chi.Router) {
				r.Use(s.adminMiddleware)
				r.Get("/stats", s.handleAdminStats)
				r.Get("/users", s.handleAdminListUsers)
				r.Patch("/users/{id}", s.handleAdminUpdateUser)
				r.Get("/repositories", s.handleAdminListRepos)
				r.Get("/audit_logs", s.handleAdminAuditLogs)
				r.Get("/settings", s.handleAdminGetSettings)
				r.Patch("/settings", s.handleAdminUpdateSettings)
			})
		})
	})

	r.NotFound(func(w http.ResponseWriter, r *http.Request) {
		writeError(w, http.StatusNotFound, "not_found", "resource not found")
	})
	return r
}

func (s *Server) requestLogger(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		ww := middleware.NewWrapResponseWriter(w, r.ProtoMajor)
		next.ServeHTTP(ww, r)
		s.logger.Info("request",
			"method", r.Method,
			"path", r.URL.Path,
			"status", ww.Status(),
			"duration_ms", time.Since(start).Milliseconds(),
			"request_id", middleware.GetReqID(r.Context()),
		)
	})
}
