package events

import (
	"context"

	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/propagation"
	"go.opentelemetry.io/otel/trace"
)

const tracerName = "github.com/finch-co/cashflow/internal/events"

// Tracer returns the package-level OTel tracer.
func Tracer() trace.Tracer {
	return otel.Tracer(tracerName)
}

// InjectTrace sets the envelope's trace_id and span_id from the active span.
func InjectTrace(ctx context.Context, env *Envelope) {
	sc := trace.SpanFromContext(ctx).SpanContext()
	if sc.IsValid() {
		env.TraceID = sc.TraceID().String()
		env.SpanID = sc.SpanID().String()
	}
}

// headerCarrier adapts a map[string]string to propagation.TextMapCarrier
// for W3C trace-context propagation via NATS headers.
type headerCarrier map[string]string

func (c headerCarrier) Get(key string) string { return c[key] }
func (c headerCarrier) Set(key, value string) { c[key] = value }
func (c headerCarrier) Keys() []string {
	keys := make([]string, 0, len(c))
	for k := range c {
		keys = append(keys, k)
	}
	return keys
}

// PropagateToHeaders injects W3C trace context into a map suitable for NATS headers.
func PropagateToHeaders(ctx context.Context) map[string]string {
	carrier := make(headerCarrier)
	otel.GetTextMapPropagator().Inject(ctx, carrier)
	return carrier
}

// ExtractTraceFromHeaders extracts W3C trace context from NATS message headers
// and returns a context with the remote span as parent.
func ExtractTraceFromHeaders(ctx context.Context, headers map[string]string) context.Context {
	return otel.GetTextMapPropagator().Extract(ctx, headerCarrier(headers))
}

// StartConsumerSpan starts a new OTel span for a consumer processing an event.
func StartConsumerSpan(ctx context.Context, operationName string, env *Envelope) (context.Context, trace.Span) {
	return Tracer().Start(ctx, operationName,
		trace.WithSpanKind(trace.SpanKindConsumer),
		trace.WithAttributes(
			attribute.String("messaging.system", "nats"),
			attribute.String("messaging.destination.name", env.EventType),
			attribute.String("messaging.message.id", env.EventID),
			attribute.String("tenant_id", env.TenantID),
		),
	)
}

// StartPublisherSpan starts a new OTel span for publishing an event.
func StartPublisherSpan(ctx context.Context, subject string) (context.Context, trace.Span) {
	return Tracer().Start(ctx, "publish "+subject,
		trace.WithSpanKind(trace.SpanKindProducer),
		trace.WithAttributes(
			attribute.String("messaging.system", "nats"),
			attribute.String("messaging.destination.name", subject),
		),
	)
}

func init() {
	// Ensure the W3C propagator is registered globally.
	prop := otel.GetTextMapPropagator()
	if _, ok := prop.(propagation.TraceContext); !ok {
		otel.SetTextMapPropagator(propagation.NewCompositeTextMapPropagator(
			propagation.TraceContext{},
			propagation.Baggage{},
			prop,
		))
	}
}
