package usecase

const forecastWeeks = 13

// ForecastEngine builds deterministic rolling cash forecasts.
type ForecastEngine struct{}

// Build13WeekForecast returns projected ending balances for each of the next 13 weeks.
func (f *ForecastEngine) Build13WeekForecast(
	currentCash float64,
	avgDailyInflow float64,
	avgDailyOutflow float64,
) []float64 {
	weeklyNet := (avgDailyInflow - avgDailyOutflow) * 7
	forecast := make([]float64, forecastWeeks)

	runningBalance := currentCash
	for i := 0; i < forecastWeeks; i++ {
		runningBalance += weeklyNet
		forecast[i] = runningBalance
	}

	return forecast
}
