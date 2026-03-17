package models

import (
	"time"

	"github.com/google/uuid"
)

// ImportJob represents a file import job
type ImportJob struct {
	ID               uuid.UUID `db:"id" json:"id"`
	TenantID         uuid.UUID `db:"tenant_id" json:"tenant_id"`
	AccountID        uuid.UUID `db:"account_id" json:"account_id"`
	FileName         string    `db:"file_name" json:"file_name"`
	FileType         string    `db:"file_type" json:"file_type"` // pdf, csv, excel
	BankType         string    `db:"bank_type" json:"bank_type"` // qnb, hsbc, etc.
	TransactionCount int       `db:"transaction_count" json:"transaction_count"`
	TotalAmount      float64   `db:"total_amount" json:"total_amount"`
	Currency         string    `db:"currency" json:"currency"`
	Status           string    `db:"status" json:"status"` // success, failed, partial
	ErrorMessage     string    `db:"error_message" json:"error_message,omitempty"`
	CreatedAt        time.Time `db:"created_at" json:"created_at"`
	UpdatedAt        time.Time `db:"updated_at" json:"updated_at"`
}

// ImportJobRepository defines the interface for import job storage
type ImportJobRepository interface {
	Create(job *ImportJob) error
	GetByID(id uuid.UUID) (*ImportJob, error)
	ListByTenant(tenantID uuid.UUID, limit int) ([]ImportJob, error)
	Update(job *ImportJob) error
}
