package repositories

import (
"github.com/finch-co/cashflow/internal/models"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// analysisDataPayload is the JSONB shape for analysis_data column.
type analysisDataPayload struct {
	Liquidity         models.LiquidityAnalysis  `json:"liquidity"`
	ExpenseBreakdown  []models.ExpenseBreakdown `json:"expense_breakdown"`
	RecurringPayments []models.RecurringPayment `json:"recurring_payments"`
	CollectionHealth  models.CollectionHealth   `json:"collection_health"`
}

// AnalysisRepo implements models.AnalysisRepository using PostgreSQL.
type AnalysisRepo struct {
	pool *pgxpool.Pool
}

// NewAnalysisRepo returns a new AnalysisRepo using the given pool.
func NewAnalysisRepo(pool *pgxpool.Pool) *AnalysisRepo {
	return &AnalysisRepo{pool: pool}
}

// Save persists a cash analysis. ID and CreatedAt are set from RETURNING if zero.
func (r *AnalysisRepo) Save(ctx context.Context, analysis *models.CashAnalysis) error {
	payload := analysisDataPayload{
		Liquidity:         analysis.Liquidity,
		ExpenseBreakdown:  analysis.ExpenseBreakdown,
		RecurringPayments: analysis.RecurringPayments,
		CollectionHealth:  analysis.CollectionHealth,
	}
	analysisDataBytes, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("marshaling analysis_data: %w", err)
	}
	recsBytes, err := json.Marshal(analysis.Recommendations)
	if err != nil {
		return fmt.Errorf("marshaling recommendations: %w", err)
	}

	var healthScore, runwayDays *int
	if analysis.HealthScore >= 0 {
		healthScore = &analysis.HealthScore
	}
	if analysis.RunwayDays >= 0 {
		runwayDays = &analysis.RunwayDays
	}
	riskLevel := string(analysis.RiskLevel)
	var txnCount *int
	if analysis.TransactionCount >= 0 {
		txnCount = &analysis.TransactionCount
	}

	err = r.pool.QueryRow(ctx,
		`INSERT INTO cash_analyses (tenant_id, analyzed_at, health_score, risk_level, runway_days, analysis_data, recommendations, transaction_count, created_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
		 RETURNING id, created_at`,
		analysis.TenantID, analysis.AnalyzedAt, healthScore, riskLevel, runwayDays, analysisDataBytes, recsBytes, txnCount,
	).Scan(&analysis.ID, &analysis.CreatedAt)
	if err != nil {
		return fmt.Errorf("inserting cash_analysis: %w", err)
	}
	return nil
}

// GetLatest returns the most recent analysis for the tenant, or models.ErrNotFound.
func (r *AnalysisRepo) GetLatest(ctx context.Context, tenantID uuid.UUID) (*models.CashAnalysis, error) {
	row := r.pool.QueryRow(ctx,
		`SELECT id, tenant_id, analyzed_at, health_score, risk_level, runway_days, analysis_data, recommendations, transaction_count, created_at
		 FROM cash_analyses
		 WHERE tenant_id = $1
		 ORDER BY analyzed_at DESC
		 LIMIT 1`,
		tenantID,
	)
	var a models.CashAnalysis
	var analyzedAt, createdAt time.Time
	var healthScore, runwayDays, txnCount *int
	var riskLevel string
	var analysisDataBytes, recsBytes []byte
	err := row.Scan(&a.ID, &a.TenantID, &analyzedAt, &healthScore, &riskLevel, &runwayDays, &analysisDataBytes, &recsBytes, &txnCount, &createdAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, models.ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("getting latest cash_analysis: %w", err)
	}
	a.AnalyzedAt = analyzedAt
	a.CreatedAt = createdAt
	if healthScore != nil {
		a.HealthScore = *healthScore
	}
	a.RiskLevel = models.RiskLevel(riskLevel)
	if runwayDays != nil {
		a.RunwayDays = *runwayDays
	}
	if txnCount != nil {
		a.TransactionCount = *txnCount
	}

	var payload analysisDataPayload
	if err := json.Unmarshal(analysisDataBytes, &payload); err != nil {
		return nil, fmt.Errorf("unmarshaling analysis_data: %w", err)
	}
	a.Liquidity = payload.Liquidity
	a.ExpenseBreakdown = payload.ExpenseBreakdown
	a.RecurringPayments = payload.RecurringPayments
	a.CollectionHealth = payload.CollectionHealth

	if err := json.Unmarshal(recsBytes, &a.Recommendations); err != nil {
		return nil, fmt.Errorf("unmarshaling recommendations: %w", err)
	}
	return &a, nil
}

// GetTransactionsForAnalysis returns all transactions for the tenant ordered by date ascending, with RunningBalance computed.
func (r *AnalysisRepo) GetTransactionsForAnalysis(ctx context.Context, tenantID uuid.UUID) ([]models.TransactionForAnalysis, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT txn_date, description, amount, category, counterparty
		 FROM bank_transactions
		 WHERE tenant_id = $1
		 ORDER BY txn_date ASC, id ASC`,
		tenantID,
	)
	if err != nil {
		return nil, fmt.Errorf("listing transactions for analysis: %w", err)
	}
	defer rows.Close()

	var out []models.TransactionForAnalysis
	var runningBalance float64
	for rows.Next() {
		var t models.TransactionForAnalysis
		var txnDate time.Time
		if err := rows.Scan(&txnDate, &t.Description, &t.Amount, &t.Category, &t.Counterparty); err != nil {
			return nil, fmt.Errorf("scanning transaction: %w", err)
		}
		t.Date = txnDate
		runningBalance += t.Amount
		t.RunningBalance = runningBalance
		out = append(out, t)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterating transactions: %w", err)
	}
	return out, nil
}
