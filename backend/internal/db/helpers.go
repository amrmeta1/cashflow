package db

import "encoding/json"

// mapToJSON converts a map to a JSON byte slice for JSONB columns.
// Returns '{}' for nil maps.
func mapToJSON(m map[string]any) []byte {
	if m == nil {
		return []byte("{}")
	}
	b, err := json.Marshal(m)
	if err != nil {
		return []byte("{}")
	}
	return b
}
