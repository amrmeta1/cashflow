package detector

// DocumentType represents the type of financial document being imported.
type DocumentType string

const (
	// DocumentTypeBankStatement represents a bank statement CSV with date, description, amount.
	DocumentTypeBankStatement DocumentType = "bank_statement"
	
	// DocumentTypeLedger represents an accounting ledger with debit/credit columns.
	DocumentTypeLedger DocumentType = "ledger"
	
	// DocumentTypePDF represents a PDF bank statement.
	DocumentTypePDF DocumentType = "pdf"
	
	// DocumentTypeUnknown represents an unrecognized document format.
	DocumentTypeUnknown DocumentType = "unknown"
)

// String returns the string representation of the document type.
func (dt DocumentType) String() string {
	return string(dt)
}

// IsValid returns true if the document type is recognized.
func (dt DocumentType) IsValid() bool {
	switch dt {
	case DocumentTypeBankStatement, DocumentTypeLedger, DocumentTypePDF:
		return true
	default:
		return false
	}
}

// RequiredColumns returns the required columns for each document type.
func (dt DocumentType) RequiredColumns() []string {
	switch dt {
	case DocumentTypeBankStatement:
		return []string{"date", "description", "amount OR (debit + credit)"}
	case DocumentTypeLedger:
		return []string{"debit OR credit", "account OR account_name"}
	case DocumentTypePDF:
		return []string{} // PDF parsing doesn't use columns
	default:
		return []string{}
	}
}

// HumanReadable returns a human-readable name for the document type.
func (dt DocumentType) HumanReadable() string {
	switch dt {
	case DocumentTypeBankStatement:
		return "Bank Statement"
	case DocumentTypeLedger:
		return "Trial Balance / Ledger"
	case DocumentTypePDF:
		return "PDF Bank Statement"
	default:
		return "Unknown"
	}
}
