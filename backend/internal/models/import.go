package models

import (
	"github.com/google/uuid"
)

// ImportBankJSONPayload represents the JSON payload for structured transaction import
type ImportBankJSONPayload struct {
	AccountID    uuid.UUID               `json:"account_id"`
	Transactions []ImportJSONTransaction `json:"transactions"`
}

// ImportJSONTransaction represents a single transaction in the JSON import payload
type ImportJSONTransaction struct {
	Date         string  `json:"date"`
	Amount       float64 `json:"amount"`
	Currency     string  `json:"currency"`
	Description  string  `json:"description"`
	Counterparty string  `json:"counterparty"`
	Category     string  `json:"category"`
	RawText      string  `json:"raw_text"`
	AIVendor     string  `json:"ai_vendor"`
	AIConfidence int     `json:"ai_confidence"`
}

// JSONImportResult represents the result of a JSON import operation
type JSONImportResult struct {
	JobID      uuid.UUID `json:"job_id"`
	Imported   int       `json:"imported"`
	Duplicates int       `json:"duplicates"`
	Errors     int       `json:"errors"`
	TotalRows  int       `json:"total_rows"`
}
