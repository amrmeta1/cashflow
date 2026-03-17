package embeddings

import (
	"testing"
)

func TestNewEmbedder_Voyage(t *testing.T) {
	tests := []struct {
		name       string
		provider   string
		voyageKey  string
		openaiKey  string
		expectErr  bool
		errContains string
	}{
		{
			name:      "voyage with key",
			provider:  "voyage",
			voyageKey: "test-voyage-key",
			openaiKey: "",
			expectErr: false,
		},
		{
			name:        "voyage without key",
			provider:    "voyage",
			voyageKey:   "",
			openaiKey:   "",
			expectErr:   true,
			errContains: "VOYAGE_API_KEY",
		},
		{
			name:      "default provider with voyage key",
			provider:  "",
			voyageKey: "test-voyage-key",
			openaiKey: "",
			expectErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			embedder, err := NewEmbedder(tt.provider, tt.voyageKey, tt.openaiKey)

			if tt.expectErr {
				if err == nil {
					t.Error("Expected error, got nil")
				} else if tt.errContains != "" && !contains(err.Error(), tt.errContains) {
					t.Errorf("Expected error containing '%s', got '%s'", tt.errContains, err.Error())
				}
			} else {
				if err != nil {
					t.Errorf("Expected no error, got %v", err)
				}
				if embedder == nil {
					t.Error("Expected embedder, got nil")
				}
				// Verify it's a VoyageEmbedder
				if _, ok := embedder.(*VoyageEmbedder); !ok {
					t.Errorf("Expected *VoyageEmbedder, got %T", embedder)
				}
			}
		})
	}
}

func TestNewEmbedder_OpenAI(t *testing.T) {
	tests := []struct {
		name        string
		provider    string
		voyageKey   string
		openaiKey   string
		expectErr   bool
		errContains string
	}{
		{
			name:      "openai with key",
			provider:  "openai",
			voyageKey: "",
			openaiKey: "test-openai-key",
			expectErr: false,
		},
		{
			name:        "openai without key",
			provider:    "openai",
			voyageKey:   "",
			openaiKey:   "",
			expectErr:   true,
			errContains: "OPENAI_API_KEY",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			embedder, err := NewEmbedder(tt.provider, tt.voyageKey, tt.openaiKey)

			if tt.expectErr {
				if err == nil {
					t.Error("Expected error, got nil")
				} else if tt.errContains != "" && !contains(err.Error(), tt.errContains) {
					t.Errorf("Expected error containing '%s', got '%s'", tt.errContains, err.Error())
				}
			} else {
				if err != nil {
					t.Errorf("Expected no error, got %v", err)
				}
				if embedder == nil {
					t.Error("Expected embedder, got nil")
				}
				// Verify it's an OpenAIEmbedder
				if _, ok := embedder.(*OpenAIEmbedder); !ok {
					t.Errorf("Expected *OpenAIEmbedder, got %T", embedder)
				}
			}
		})
	}
}

func TestNewEmbedder_InvalidProvider(t *testing.T) {
	embedder, err := NewEmbedder("invalid", "key1", "key2")

	if err == nil {
		t.Error("Expected error for invalid provider")
	}

	if embedder != nil {
		t.Error("Expected nil embedder for invalid provider")
	}

	if !contains(err.Error(), "unknown embedding provider") {
		t.Errorf("Expected error about unknown provider, got: %s", err.Error())
	}
}

func contains(s, substr string) bool {
	return len(s) >= len(substr) && (s == substr || len(substr) == 0 || 
		(len(s) > 0 && len(substr) > 0 && findSubstring(s, substr)))
}

func findSubstring(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}
