# Bank Statement PDF Parser

## Overview

This package provides a generic PDF bank statement parser with support for multiple banks. The first implementation supports QNB (Qatar National Bank) statements.

## Architecture

### Components

1. **BankParser Interface** (`parser.go`)
   - Defines the contract for all bank-specific parsers
   - Provides common utility functions for vendor extraction and categorization
   - Manages parser registry for automatic bank detection

2. **QNB Parser** (`qnb_parser.go`)
   - Implements QNB-specific parsing logic
   - Handles QNB statement format: `DATE DESCRIPTION DEBIT CREDIT BALANCE`
   - Extracts transactions from PDF text

3. **Parser Registry**
   - Auto-detects bank type from PDF content
   - Routes to appropriate parser
   - Extensible for future banks (HSBC, QIB, Doha Bank, etc.)

## Usage

### Parsing a PDF Statement

```go
import "github.com/finch-co/cashflow/internal/ingestion/bank_parser"

// Initialize parser registry
registry := bank_parser.NewParserRegistry()

// Parse PDF and auto-detect bank type
transactions, bankType, err := registry.DetectAndParse(pdfBytes)
if err != nil {
    return err
}

// Process transactions
for _, txn := range transactions {
    fmt.Printf("Date: %s, Amount: %.2f, Description: %s\n", 
        txn.Date, txn.Amount, txn.Description)
}
```

### Integration with Ingestion Pipeline

The PDF parser is integrated into the existing ingestion flow:

1. **Upload**: User uploads PDF via `/api/v1/tenants/{tenantId}/imports/bank-csv`
2. **Detection**: Handler detects file type (PDF vs CSV)
3. **Parsing**: PDF is parsed using appropriate bank parser
4. **Conversion**: Parsed transactions converted to `BankTransaction` model
5. **Storage**: Transactions stored with deduplication
6. **Pipeline**: Triggers downstream services:
   - AI Classification
   - Vendor Stats
   - Cash Flow DNA
   - Forecast Engine
   - Analysis Service

## Vendor Extraction

The parser intelligently extracts vendor names from transaction descriptions:

| Description Pattern | Extracted Vendor |
|---------------------|------------------|
| `TRANSFER BASSEM HUSSEIN` | Bassem Hussein |
| `POS DOHA CLINIC HOSPITAL` | Doha Clinic Hospital |
| `PAYMENT SUPPLIER ABC` | Supplier Abc |
| `ATM CASH` | Atm Cash |

## Transaction Categorization

Automatic categorization based on description keywords:

| Keywords | Category |
|----------|----------|
| ATM, CASH | cash_withdrawal |
| SALARY, PAYROLL | payroll |
| RENT, LEASE | rent |
| BANK CHARGE, FEE | bank_charges |
| TRANSFER | transfer |
| POS | pos_purchase |

## QNB Statement Format

### Expected Format

```
DATE        DESCRIPTION                    DEBIT      CREDIT     BALANCE
01/12/2022  ATM CASH                      15000                 255007.02
04/12/2022  TRANSFER BASSEM HUSSEIN       5000                  250007.02
05/12/2022  POS DOHA CLINIC HOSPITAL      2500                  247507.02
```

### Parsing Rules

- **Date Format**: DD/MM/YYYY
- **Debit**: Negative amount (outflow)
- **Credit**: Positive amount (inflow)
- **Amount Calculation**: `amount = credit - debit`

## Adding New Bank Parsers

To add support for a new bank:

1. Create new parser file (e.g., `hsbc_parser.go`)
2. Implement `BankParser` interface:
   ```go
   type HSBCParser struct{}
   
   func (p *HSBCParser) Parse(pdfBytes []byte) ([]ParsedTransaction, error) {
       // Bank-specific parsing logic
   }
   
   func (p *HSBCParser) DetectBankType(pdfBytes []byte) (bool, error) {
       // Detection logic
   }
   
   func (p *HSBCParser) GetBankName() string {
       return "hsbc"
   }
   ```
3. Register in `NewParserRegistry()`:
   ```go
   hsbcParser := NewHSBCParser()
   registry.Register(hsbcParser.GetBankName(), hsbcParser)
   ```

## Testing

Run tests:
```bash
go test ./internal/ingestion/bank_parser/... -v
```

All tests passing:
- ✅ Vendor extraction
- ✅ Transaction categorization
- ✅ Amount parsing
- ✅ Description normalization
- ✅ QNB parser initialization

## Logging

The parser includes comprehensive logging:

- `"pdf statement uploaded"` - File received
- `"bank type detected: qnb"` - Bank identified
- `"pdf text extracted"` - PDF parsing started
- `"transactions parsed from pdf"` - Count of transactions
- `"vendor extracted"` - Vendor identification
- `"pdf import completed"` - Final result with counts

## Error Handling

- Invalid PDF format → Clear error message
- Unrecognized bank type → Error with details
- Date parsing failures → Log warning, skip transaction
- Amount parsing failures → Log warning, skip transaction
- Vendor extraction failures → Use description as fallback

## Dependencies

- `github.com/ledongthuc/pdf` - PDF text extraction
- `github.com/rs/zerolog/log` - Structured logging

## Future Enhancements

- Support for multi-page statements
- OCR for scanned PDFs
- Support for additional banks:
  - HSBC
  - QIB (Qatar Islamic Bank)
  - Doha Bank
  - Commercial Bank of Qatar
- Enhanced vendor name normalization
- Machine learning for pattern detection
