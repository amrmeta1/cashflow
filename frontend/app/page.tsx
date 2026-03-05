"use client";

export default function StandaloneDashboard() {
  return (
    <html>
      <body>
        <div style={{ padding: "2rem", fontFamily: "system-ui" }}>
          <h1 style={{ fontSize: "2rem", fontWeight: "bold", marginBottom: "1rem" }}>
            Standalone Dashboard
          </h1>
          <p style={{ marginBottom: "1rem", color: "#666" }}>
            This page is completely standalone - no providers, no layouts, nothing.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem" }}>
            <div style={{ background: "#f0f9ff", padding: "1.5rem", borderRadius: "0.5rem" }}>
              <h2 style={{ fontSize: "0.875rem", marginBottom: "0.5rem" }}>Total Balance</h2>
              <p style={{ fontSize: "2rem", fontWeight: "bold", color: "#0284c7" }}>$218,340</p>
            </div>
            <div style={{ background: "#f0fdf4", padding: "1.5rem", borderRadius: "0.5rem" }}>
              <h2 style={{ fontSize: "0.875rem", marginBottom: "0.5rem" }}>Revenue</h2>
              <p style={{ fontSize: "2rem", fontWeight: "bold", color: "#16a34a" }}>$112,000</p>
            </div>
            <div style={{ background: "#fef2f2", padding: "1.5rem", borderRadius: "0.5rem" }}>
              <h2 style={{ fontSize: "0.875rem", marginBottom: "0.5rem" }}>Expenses</h2>
              <p style={{ fontSize: "2rem", fontWeight: "bold", color: "#dc2626" }}>$79,000</p>
            </div>
          </div>
          <div style={{ marginTop: "2rem", background: "white", padding: "1.5rem", borderRadius: "0.5rem", border: "1px solid #e5e7eb" }}>
            <h2 style={{ fontSize: "1.25rem", fontWeight: "600", marginBottom: "1rem" }}>
              ✅ Success!
            </h2>
            <p style={{ color: "#666" }}>
              If you can see this page, it means the basic Next.js routing works.
              The error is happening in one of the providers or layouts.
            </p>
          </div>
        </div>
      </body>
    </html>
  );
}
