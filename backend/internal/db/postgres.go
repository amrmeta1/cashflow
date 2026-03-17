package db

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/rs/zerolog/log"

	"github.com/finch-co/cashflow/internal/config"
)

func NewPool(ctx context.Context, cfg config.DatabaseConfig) (*pgxpool.Pool, error) {
	poolCfg, err := pgxpool.ParseConfig(cfg.DSN())
	if err != nil {
		return nil, fmt.Errorf("parsing db config: %w", err)
	}

	poolCfg.MaxConns = 20

	pool, err := pgxpool.NewWithConfig(ctx, poolCfg)
	if err != nil {
		return nil, fmt.Errorf("creating db pool: %w", err)
	}

	if err := pool.Ping(ctx); err != nil {
		return nil, fmt.Errorf("pinging db: %w", err)
	}

	// Verify table visibility (debug)
	rows, err := pool.Query(ctx, `
		SELECT table_name 
		FROM information_schema.tables 
		WHERE table_schema='public' 
		ORDER BY table_name
	`)
	if err != nil {
		log.Warn().Err(err).Msg("failed to query tables for verification")
	} else {
		defer rows.Close()
		var tables []string
		for rows.Next() {
			var tableName string
			if err := rows.Scan(&tableName); err == nil {
				tables = append(tables, tableName)
			}
		}
		log.Info().Strs("tables", tables).Msg("database tables visible to connection pool")
	}

	return pool, nil
}
