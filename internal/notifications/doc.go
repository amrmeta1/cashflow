// Package notifications is a bounded-context placeholder for notification/alert logic
// (in-app notifications, analysis.completed alerts, threshold alerts, etc.).
// It is kept as a clear boundary so that it can be extracted into a separate
// service later with minimal change. For now, notification publishing remains
// in adapter/mq and in analysis/ingestion workers; this package is intentionally
// minimal.
package notifications
