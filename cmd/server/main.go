package main

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"syscall"
	"time"

	"github.com/m4rcel-lol/softgit/internal/api"
	"github.com/m4rcel-lol/softgit/internal/config"
	"github.com/m4rcel-lol/softgit/internal/db"
	"github.com/m4rcel-lol/softgit/internal/git"
	"github.com/m4rcel-lol/softgit/internal/ssh"
	"github.com/m4rcel-lol/softgit/internal/worker"
	"github.com/redis/go-redis/v9"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		fmt.Fprintf(os.Stderr, "config error: %v\n", err)
		os.Exit(1)
	}

	logger := setupLogger(cfg)
	slog.SetDefault(logger)

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Wait for dependencies
	slog.Info("waiting for database")
	if err := db.WaitFor(ctx, cfg.Database, 60*time.Second); err != nil {
		slog.Error("database unavailable", "error", err)
		os.Exit(1)
	}

	database, err := db.Connect(ctx, cfg.Database)
	if err != nil {
		slog.Error("connect database", "error", err)
		os.Exit(1)
	}
	defer database.Close()

	// Migrations
	migrationsDir := os.Getenv("MIGRATIONS_DIR")
	if migrationsDir == "" {
		migrationsDir = "migrations"
	}
	slog.Info("running migrations", "dir", migrationsDir)
	if err := database.Migrate(ctx, migrationsDir); err != nil {
		slog.Error("migrate", "error", err)
		os.Exit(1)
	}

	// Redis
	opt, err := redis.ParseURL(cfg.Redis.URL)
	if err != nil {
		slog.Error("parse redis url", "error", err)
		os.Exit(1)
	}
	rdb := redis.NewClient(opt)
	if err := rdb.Ping(ctx).Err(); err != nil {
		slog.Warn("redis not available, continuing without cache", "error", err)
		rdb = nil
	} else {
		slog.Info("redis connected")
	}

	// Git manager
	if err := os.MkdirAll(cfg.Git.Root, 0o750); err != nil {
		slog.Error("create git root", "error", err)
		os.Exit(1)
	}
	if err := os.MkdirAll(cfg.Storage.LocalPath, 0o750); err != nil {
		slog.Error("create storage path", "error", err)
		os.Exit(1)
	}
	gitMgr, err := git.NewManager(cfg.Git.Root)
	if err != nil {
		slog.Error("git manager", "error", err)
		os.Exit(1)
	}

	// Background worker
	jobWorker := worker.New(database, rdb, cfg, logger)
	go jobWorker.Start(ctx)

	// HTTP API
	router := api.NewRouter(cfg, database, rdb, gitMgr, logger)

	httpServer := &http.Server{
		Addr:              fmt.Sprintf(":%d", cfg.App.HTTPPort),
		Handler:           router,
		ReadHeaderTimeout: 10 * time.Second,
		ReadTimeout:       0, // Git uploads can be long
		WriteTimeout:      0,
		IdleTimeout:       120 * time.Second,
		MaxHeaderBytes:    1 << 20,
	}

	// SSH server
	var sshServer *ssh.Server
	if cfg.SSH.Enabled {
		sshServer, err = ssh.NewServer(cfg, database, gitMgr, logger)
		if err != nil {
			slog.Error("ssh server init", "error", err)
			os.Exit(1)
		}
		go func() {
			slog.Info("ssh server listening", "addr", fmt.Sprintf("%s:%d", cfg.SSH.Host, cfg.SSH.Port))
			if err := sshServer.ListenAndServe(); err != nil {
				slog.Error("ssh server", "error", err)
			}
		}()
	}

	go func() {
		slog.Info("http server listening", "port", cfg.App.HTTPPort, "env", cfg.App.Env)
		if err := httpServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			slog.Error("http server", "error", err)
			os.Exit(1)
		}
	}()

	// Graceful shutdown
	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
	sig := <-sigCh
	slog.Info("shutting down", "signal", sig.String())

	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer shutdownCancel()
	_ = httpServer.Shutdown(shutdownCtx)
	if sshServer != nil {
		_ = sshServer.Close()
	}
	cancel()
	jobWorker.Stop()
	slog.Info("shutdown complete")
}

func setupLogger(cfg *config.Config) *slog.Logger {
	level := slog.LevelInfo
	switch cfg.App.LogLevel {
	case "debug":
		level = slog.LevelDebug
	case "warn":
		level = slog.LevelWarn
	case "error":
		level = slog.LevelError
	}
	opts := &slog.HandlerOptions{Level: level}
	var handler slog.Handler
	if cfg.App.LogFormat == "text" {
		handler = slog.NewTextHandler(os.Stdout, opts)
	} else {
		handler = slog.NewJSONHandler(os.Stdout, opts)
	}
	return slog.New(handler)
}

// Ensure path exists relative to binary for migrations in container
func init() {
	if _, err := os.Stat("migrations"); os.IsNotExist(err) {
		// try /app/migrations
		if _, err := os.Stat("/app/migrations"); err == nil {
			_ = os.Chdir("/app")
		}
	}
	_ = filepath.Walk
}
