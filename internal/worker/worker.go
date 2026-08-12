package worker

import (
	"context"
	"log/slog"
	"sync"
	"time"

	"github.com/m4rcel-lol/softgit/internal/config"
	"github.com/m4rcel-lol/softgit/internal/db"
	"github.com/redis/go-redis/v9"
)

type Worker struct {
	db     *db.DB
	rdb    *redis.Client
	cfg    *config.Config
	logger *slog.Logger
	wg     sync.WaitGroup
	stop   chan struct{}
}

func New(database *db.DB, rdb *redis.Client, cfg *config.Config, logger *slog.Logger) *Worker {
	return &Worker{
		db:     database,
		rdb:    rdb,
		cfg:    cfg,
		logger: logger,
		stop:   make(chan struct{}),
	}
}

func (w *Worker) Start(ctx context.Context) {
	w.wg.Add(1)
	go w.loop(ctx)
}

func (w *Worker) Stop() {
	close(w.stop)
	w.wg.Wait()
}

func (w *Worker) loop(ctx context.Context) {
	defer w.wg.Done()
	ticker := time.NewTicker(5 * time.Second)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-w.stop:
			return
		case <-ticker.C:
			w.processJobs(ctx)
		}
	}
}

func (w *Worker) processJobs(ctx context.Context) {
	// Claim a pending job
	rows, err := w.db.Pool.Query(ctx, `
		UPDATE jobs SET status = 'running', locked_at = NOW(), locked_by = 'worker', attempts = attempts + 1, updated_at = NOW()
		WHERE id = (
			SELECT id FROM jobs
			WHERE status = 'pending' AND run_at <= NOW() AND attempts < max_attempts
			ORDER BY run_at
			FOR UPDATE SKIP LOCKED
			LIMIT 1
		)
		RETURNING id, type, payload
	`)
	if err != nil {
		return
	}
	defer rows.Close()
	for rows.Next() {
		var id, typ string
		var payload []byte
		if err := rows.Scan(&id, &typ, &payload); err != nil {
			continue
		}
		w.logger.Info("processing job", "id", id, "type", typ)
		// Dispatch by type – email, webhook, etc.
		// Foundation: mark completed
		_, _ = w.db.Pool.Exec(ctx, `
			UPDATE jobs SET status = 'completed', completed_at = NOW(), updated_at = NOW() WHERE id = $1
		`, id)
	}
}
