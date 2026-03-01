package db

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/finch-co/cashflow/internal/domain"
)

type UserRepo struct {
	pool *pgxpool.Pool
}

func NewUserRepo(pool *pgxpool.Pool) *UserRepo {
	return &UserRepo{pool: pool}
}

const userCols = `id, sub, email, full_name, avatar_url, status, last_login_at, created_at, updated_at`

func scanUser(row pgx.Row) (*domain.User, error) {
	var u domain.User
	err := row.Scan(&u.ID, &u.Sub, &u.Email, &u.FullName, &u.AvatarURL,
		&u.Status, &u.LastLoginAt, &u.CreatedAt, &u.UpdatedAt)
	return &u, err
}

// Upsert creates or updates a user record from Keycloak JWT claims.
// On conflict (same sub), it updates email and full_name.
func (r *UserRepo) Upsert(ctx context.Context, input domain.UpsertUserInput) (*domain.User, error) {
	u, err := scanUser(r.pool.QueryRow(ctx,
		`INSERT INTO users (sub, email, full_name)
		 VALUES ($1, $2, $3)
		 ON CONFLICT (sub) DO UPDATE SET
		   email = EXCLUDED.email,
		   full_name = EXCLUDED.full_name,
		   updated_at = now()
		 RETURNING `+userCols,
		input.Sub, input.Email, input.FullName,
	))
	if err != nil {
		return nil, fmt.Errorf("upserting user: %w", err)
	}
	return u, nil
}

func (r *UserRepo) GetByID(ctx context.Context, id uuid.UUID) (*domain.User, error) {
	u, err := scanUser(r.pool.QueryRow(ctx,
		`SELECT `+userCols+` FROM users WHERE id = $1 AND status != 'deleted'`, id,
	))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, domain.ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("getting user: %w", err)
	}
	return u, nil
}

func (r *UserRepo) GetBySub(ctx context.Context, sub string) (*domain.User, error) {
	u, err := scanUser(r.pool.QueryRow(ctx,
		`SELECT `+userCols+` FROM users WHERE sub = $1 AND status != 'deleted'`, sub,
	))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, domain.ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("getting user by sub: %w", err)
	}
	return u, nil
}

func (r *UserRepo) Update(ctx context.Context, id uuid.UUID, input domain.UpdateUserInput) (*domain.User, error) {
	existing, err := r.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}

	fullName := existing.FullName
	if input.FullName != nil {
		fullName = *input.FullName
	}
	avatarURL := existing.AvatarURL
	if input.AvatarURL != nil {
		avatarURL = *input.AvatarURL
	}
	status := existing.Status
	if input.Status != nil {
		status = *input.Status
	}

	u, err := scanUser(r.pool.QueryRow(ctx,
		`UPDATE users SET full_name=$1, avatar_url=$2, status=$3, updated_at=now()
		 WHERE id=$4
		 RETURNING `+userCols,
		fullName, avatarURL, status, id,
	))
	if err != nil {
		return nil, fmt.Errorf("updating user: %w", err)
	}
	return u, nil
}

func (r *UserRepo) UpdateLastLogin(ctx context.Context, id uuid.UUID) error {
	_, err := r.pool.Exec(ctx, `UPDATE users SET last_login_at=now() WHERE id=$1`, id)
	return err
}
