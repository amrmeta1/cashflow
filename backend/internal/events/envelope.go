package events

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

// Envelope is the canonical event wrapper for all messages on NATS JetStream.
// Every event published through the system uses this schema.
type Envelope struct {
	EventID    string         `json:"event_id"`
	EventType  string         `json:"event_type"`
	TenantID   string         `json:"tenant_id"`
	OccurredAt time.Time      `json:"occurred_at"`
	Version    int            `json:"version"`
	Payload    json.RawMessage `json:"payload"`
	TraceID    string         `json:"trace_id,omitempty"`
	SpanID     string         `json:"span_id,omitempty"`
	IdempotencyKey string     `json:"idempotency_key"`
}

// NewEnvelope creates a new event envelope with a generated event_id and idempotency_key.
func NewEnvelope(eventType, tenantID string, version int, payload any) (*Envelope, error) {
	raw, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}

	eventID := uuid.New().String()

	return &Envelope{
		EventID:        eventID,
		EventType:      eventType,
		TenantID:       tenantID,
		OccurredAt:     time.Now().UTC(),
		Version:        version,
		Payload:        raw,
		IdempotencyKey: eventID, // default: same as event_id; callers can override
	}, nil
}

// WithIdempotencyKey overrides the default idempotency key.
func (e *Envelope) WithIdempotencyKey(key string) *Envelope {
	e.IdempotencyKey = key
	return e
}

// Marshal serializes the envelope to JSON bytes for publishing.
func (e *Envelope) Marshal() ([]byte, error) {
	return json.Marshal(e)
}

// UnmarshalEnvelope deserializes an envelope from raw NATS message data.
func UnmarshalEnvelope(data []byte) (*Envelope, error) {
	var env Envelope
	if err := json.Unmarshal(data, &env); err != nil {
		return nil, err
	}
	return &env, nil
}
