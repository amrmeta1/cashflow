package mq

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

// Envelope is the standard message wrapper for all RabbitMQ messages.
type Envelope struct {
	EventID        string         `json:"event_id"`
	EventType      string         `json:"event_type"`
	TenantID       string         `json:"tenant_id"`
	OccurredAt     time.Time      `json:"occurred_at"`
	Version        int            `json:"version"`
	IdempotencyKey string         `json:"idempotency_key"`
	TraceID        string         `json:"trace_id"`
	Payload        json.RawMessage `json:"payload"`
}

// NewEnvelope creates a new message envelope with generated IDs.
func NewEnvelope(eventType, tenantID string, payload any) (*Envelope, error) {
	data, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}
	return &Envelope{
		EventID:        uuid.New().String(),
		EventType:      eventType,
		TenantID:       tenantID,
		OccurredAt:     time.Now().UTC(),
		Version:        1,
		IdempotencyKey: uuid.New().String(),
		TraceID:        uuid.New().String(),
		Payload:        data,
	}, nil
}

// Marshal serializes the envelope to JSON bytes.
func (e *Envelope) Marshal() ([]byte, error) {
	return json.Marshal(e)
}

// UnmarshalEnvelope deserializes JSON bytes into an Envelope.
func UnmarshalEnvelope(data []byte) (*Envelope, error) {
	var env Envelope
	if err := json.Unmarshal(data, &env); err != nil {
		return nil, err
	}
	return &env, nil
}
