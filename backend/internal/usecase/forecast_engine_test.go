package usecase

import (
	"math"
	"testing"
)

func TestForecastEngineBuild13WeekForecast_Length(t *testing.T) {
	engine := &ForecastEngine{}

	got := engine.Build13WeekForecast(1000, 200, 150)

	if len(got) != 13 {
		t.Fatalf("expected 13 forecast points, got %d", len(got))
	}
}

func TestForecastEngineBuild13WeekForecast_AccumulatesWeeklyNet(t *testing.T) {
	engine := &ForecastEngine{}

	// Weekly net = (200 - 150) * 7 = 350.
	got := engine.Build13WeekForecast(1000, 200, 150)

	wantFirst := 1350.0
	wantLast := 5550.0 // 1000 + (13 * 350)

	if !almostEqual(got[0], wantFirst) {
		t.Fatalf("week 1 mismatch: got %f, want %f", got[0], wantFirst)
	}
	if !almostEqual(got[12], wantLast) {
		t.Fatalf("week 13 mismatch: got %f, want %f", got[12], wantLast)
	}
}

func TestForecastEngineBuild13WeekForecast_NegativeWeeklyNet(t *testing.T) {
	engine := &ForecastEngine{}

	// Weekly net = (100 - 200) * 7 = -700.
	got := engine.Build13WeekForecast(1000, 100, 200)

	wantFirst := 300.0
	wantLast := -8100.0 // 1000 + (13 * -700)

	if !almostEqual(got[0], wantFirst) {
		t.Fatalf("week 1 mismatch: got %f, want %f", got[0], wantFirst)
	}
	if !almostEqual(got[12], wantLast) {
		t.Fatalf("week 13 mismatch: got %f, want %f", got[12], wantLast)
	}
}

func almostEqual(a, b float64) bool {
	const epsilon = 1e-9
	return math.Abs(a-b) <= epsilon
}
