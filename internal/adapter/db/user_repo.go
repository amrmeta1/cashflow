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

func (r *UserRepo) Create(ctx context.Context, input domain.CreateUserInput, passwordHash string) (*domain.User, error) {
	var idpSubject, idpIssuer *string
	if input.IDPSubject != "" {
		idpSubject = &input.IDPSubject
	}
	if input.IDPIssuer != "" {
		idpIssuer = &input.IDPIssuer
	}

	var pwHash *string
	if passwordHash != "" {
		pwHash = &passwordHash
	}

	var u domain.User
	err := r.pool.QueryRow(ctx,
		`INSERT INTO users (email, password_hash, full_name, idp_subject, idp_issuer)
		 VALUES ($1, $2, $3, $4, $5)
		 RETURNING id, email, email_verified, COALESCE(password_hash,''), full_name, avatar_url,
		           COALESCE(idp_subject,''), COALESCE(idp_issuer,''), status, last_login_at, created_at, updated_at`,
		input.Email, pwHash, input.FullName, idpSubject, idpIssuer,
	).Scan(&u.ID, &u.Email, &u.EmailVerified, &u.PasswordHash, &u.FullName, &u.AvatarURL,
		&u.IDPSubject, &u.IDPIssuer, &u.Status, &u.LastLoginAt, &u.CreatedAt, &u.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("creating user: %w", err)
	}
	return &u, nil
}

func (r *UserRepo) GetByID(ctx context.Context, id uuid.UUID) (*domain.User, error) {
	var u domain.User
	err := r.pool.QueryRow(ctx,
		`SELECT id, email, email_verified, COALESCE(password_hash,''), full_name, avatar_url,
		        COALESCE(idp_subject,''), COALESCE(idp_issuer,''), status, last_login_at, created_at, updated_at
		 FROM users WHERE id = $1 AND status != 'deleted'`, id,
	).Scan(&u.ID, &u.Email, &u.EmailVerified, &u.PasswordHash, &u.FullName, &u.AvatarURL,
		&u.IDPSubject, &u.IDPIssuer, &u.Status, &u.LastLoginAt, &u.CreatedAt, &u.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, domain.ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("getting user: %w", err)
	}
	return &u, nil
}

func (r *UserRepo) GetByEmail(ctx context.Context, email string) (*domain.User, error) {
	var u domain.User
	err := r.pool.QueryRow(ctx,
		`SELECT id, email, email_verified, COALESCE(password_hash,''), full_name, avatar_url,
		        COALESCE(idp_subject,''), COALESCE(idp_issuer,''), status, last_login_at, created_at, updated_at
		 FROM users WHERE email = $1 AND status != 'deleted'`, email,
	).Scan(&u.ID, &u.Email, &u.EmailVerified, &u.PasswordHash, &u.FullName, &u.AvatarURL,
		&u.IDPSubject, &u.IDPIssuer, &u.Status, &u.LastLoginAt, &u.CreatedAt, &u.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, domain.ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("getting user by email: %w", err)
	}
	return &u, nil
}

func (r *UserRepo) GetByIDPSubject(ctx context.Context, issuer, subject string) (*domain.User, error) {
	var u domain.User
	err := r.pool.QueryRow(ctx,
		`SELECT id, email, email_verified, COALESCE(password_hash,''), full_name, avatar_url,
		        COALESCE(idp_subject,''), COALESCE(idp_issuer,''), status, last_login_at, created_at, updated_at
		 FROM users WHERE idp_issuer = $1 AND idp_subject = $2 AND status != 'deleted'`, issuer, subject,
	).Scan(&u.ID, &u.Email, &u.EmailVerified, &u.PasswordHash, &u.FullName, &u.AvatarURL,
		&u.IDPSubject, &u.IDPIssuer, &u.Status, &u.LastLoginAt, &u.CreatedAt, &u.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, domain.ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("getting user by idp: %w", err)
	}
	return &u, nil
}

func (r *UserRepo) ListByTenant(ctx context.Context, tenantID uuid.UUID, limit, offset int) ([]domain.User, int, error) {
	var total int
	err := r.pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM users u
		 JOIN memberships m ON m.user_id = u.id
		 WHERE m.tenant_id = $1 AND u.status != 'deleted'`, tenantID,
	).Scan(&total)
	if err != nil {
		return nil, 0, fmt.Errorf("counting users: %w", err)
	}

	rows, err := r.pool.Query(ctx,
		`SELECT u.id, u.email, u.email_verified, COALESCE(u.password_hash,''), u.full_name, u.avatar_url,
		        COALESCE(u.idp_subject,''), COALESCE(u.idp_issuer,''), u.status, u.last_login_at, u.created_at, u.updated_at
		 FROM users u
		 JOIN memberships m ON m.user_id = u.id
		 WHERE m.tenant_id = $1 AND u.status != 'deleted'
		 ORDER BY u.created_at DESC LIMIT $2 OFFSET $3`, tenantID, limit, offset,
	)
	if err != nil {
		return nil, 0, fmt.Errorf("listing users: %w", err)
	}
	defer rows.Close()

	var users []domain.User
	for rows.Next() {
		var u domain.User
		if err := rows.Scan(&u.ID, &u.Email, &u.EmailVerified, &u.PasswordHash, &u.FullName, &u.AvatarURL,
			&u.IDPSubject, &u.IDPIssuer, &u.Status, &u.LastLoginAt, &u.CreatedAt, &u.UpdatedAt); err != nil {
			return nil, 0, fmt.Errorf("scanning user: %w", err)
		}
		users = append(users, u)
	}
	return users, total, nil
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

	var u domain.User
	err = r.pool.QueryRow(ctx,
		`UPDATE users SET full_name=$1, avatar_url=$2, status=$3, updated_at=now()
		 WHERE id=$4
		 RETURNING id, email, email_verified, COALESCE(password_hash,''), full_name, avatar_url,
		           COALESCE(idp_subject,''), COALESCE(idp_issuer,''), status, last_login_at, created_at, updated_at`,
		fullName, avatarURL, status, id,
	).Scan(&u.ID, &u.Email, &u.EmailVerified, &u.PasswordHash, &u.FullName, &u.AvatarURL,
		&u.IDPSubject, &u.IDPIssuer, &u.Status, &u.LastLoginAt, &u.CreatedAt, &u.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("updating user: %w", err)
	}
	return &u, nil
}

func (r *UserRepo) UpdateLastLogin(ctx context.Context, id uuid.UUID) error {
	_, err := r.pool.Exec(ctx, `UPDATE users SET last_login_at=now() WHERE id=$1`, id)
	return err
}

func (r *UserRepo) Delete(ctx context.Context, id uuid.UUID) error {
	tag, err := r.pool.Exec(ctx,
		`UPDATE users SET status='deleted', updated_at=now() WHERE id=$1 AND status != 'deleted'`, id,
	)
	if err != nil {
		return fmt.Errorf("deleting user: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return domain.ErrNotFound
	}
	return nil
}
