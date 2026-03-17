package errors

import (
	"errors"
	"fmt"
)

// Domain error types for the cashflow platform.
// These errors provide semantic meaning and can be mapped to HTTP status codes.

var (
	// Validation errors (400 Bad Request)
	ErrInvalidInput       = errors.New("invalid input")
	ErrMissingField       = errors.New("required field missing")
	ErrInvalidFormat      = errors.New("invalid format")
	ErrInvalidDocumentType = errors.New("unsupported document type")
	
	// Not found errors (404 Not Found)
	ErrNotFound        = errors.New("resource not found")
	ErrTenantNotFound  = errors.New("tenant not found")
	ErrAccountNotFound = errors.New("account not found")
	
	// Conflict errors (409 Conflict)
	ErrAlreadyExists = errors.New("resource already exists")
	ErrDuplicate     = errors.New("duplicate entry")
	
	// Processing errors (422 Unprocessable Entity)
	ErrParsingFailed     = errors.New("parsing failed")
	ErrNoTransactions    = errors.New("no valid transactions found")
	ErrValidationFailed  = errors.New("validation failed")
	
	// Internal errors (500 Internal Server Error)
	ErrInternal         = errors.New("internal server error")
	ErrDatabaseError    = errors.New("database error")
	ErrEventPublishFailed = errors.New("event publish failed")
	
	// Service unavailable (503 Service Unavailable)
	ErrServiceUnavailable = errors.New("service unavailable")
	ErrTimeout            = errors.New("operation timeout")
)

// DomainError wraps an error with additional context.
type DomainError struct {
	Code    string
	Message string
	Err     error
	Details map[string]interface{}
}

func (e *DomainError) Error() string {
	if e.Err != nil {
		return fmt.Sprintf("%s: %v", e.Message, e.Err)
	}
	return e.Message
}

func (e *DomainError) Unwrap() error {
	return e.Err
}

// NewDomainError creates a new domain error.
func NewDomainError(code, message string, err error) *DomainError {
	return &DomainError{
		Code:    code,
		Message: message,
		Err:     err,
		Details: make(map[string]interface{}),
	}
}

// WithDetail adds a detail field to the error.
func (e *DomainError) WithDetail(key string, value interface{}) *DomainError {
	e.Details[key] = value
	return e
}

// ValidationError represents a validation error with field-level details.
type ValidationError struct {
	Field   string
	Message string
}

func (e *ValidationError) Error() string {
	return fmt.Sprintf("%s: %s", e.Field, e.Message)
}

// NewValidationError creates a new validation error.
func NewValidationError(field, message string) *ValidationError {
	return &ValidationError{
		Field:   field,
		Message: message,
	}
}

// ParsingError represents an error that occurred during document parsing.
type ParsingError struct {
	Row     int
	Column  string
	Message string
	Err     error
}

func (e *ParsingError) Error() string {
	if e.Err != nil {
		return fmt.Sprintf("row %d, column %s: %s (%v)", e.Row, e.Column, e.Message, e.Err)
	}
	return fmt.Sprintf("row %d, column %s: %s", e.Row, e.Column, e.Message)
}

func (e *ParsingError) Unwrap() error {
	return e.Err
}

// NewParsingError creates a new parsing error.
func NewParsingError(row int, column, message string, err error) *ParsingError {
	return &ParsingError{
		Row:     row,
		Column:  column,
		Message: message,
		Err:     err,
	}
}
