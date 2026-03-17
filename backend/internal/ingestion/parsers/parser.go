package parsers

import (
	"io"

	"github.com/finch-co/cashflow/internal/ingestion/models"
)

// Parser is the interface that all document parsers must implement.
// Each parser is responsible for converting a specific document format
// (CSV, PDF, JSON, etc.) into normalized transactions.
type Parser interface {
	// Parse reads from the input and returns normalized transactions.
	// Returns error if parsing fails or document format is invalid.
	Parse(reader io.Reader) ([]models.NormalizedTransaction, error)
	
	// Name returns the parser name for logging and metrics.
	Name() string
	
	// SupportedFormats returns the file formats this parser can handle.
	SupportedFormats() []string
}

// ParserFactory creates parsers based on document type.
type ParserFactory struct {
	parsers map[string]Parser
}

// NewParserFactory creates a new parser factory.
func NewParserFactory() *ParserFactory {
	return &ParserFactory{
		parsers: make(map[string]Parser),
	}
}

// Register adds a parser to the factory.
func (f *ParserFactory) Register(documentType string, parser Parser) {
	f.parsers[documentType] = parser
}

// GetParser returns a parser for the given document type.
func (f *ParserFactory) GetParser(documentType string) (Parser, bool) {
	parser, ok := f.parsers[documentType]
	return parser, ok
}

// ParseResult contains the results of a parsing operation.
type ParseResult struct {
	Transactions []models.NormalizedTransaction
	TotalRows    int
	ParsedRows   int
	Errors       []ParseError
}

// ParseError represents an error that occurred during parsing.
type ParseError struct {
	Row     int
	Column  string
	Message string
}

// HasErrors returns true if there were any parsing errors.
func (pr *ParseResult) HasErrors() bool {
	return len(pr.Errors) > 0
}

// SuccessRate returns the percentage of successfully parsed rows.
func (pr *ParseResult) SuccessRate() float64 {
	if pr.TotalRows == 0 {
		return 0
	}
	return float64(pr.ParsedRows) / float64(pr.TotalRows) * 100
}
