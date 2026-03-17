"use client";

import type { Scenario } from "@/contexts/ScenarioContext";

interface ScenarioBannerProps {
  scenarios: Scenario[];
  activeScenario: Scenario | null;
  locale: string;
}

export function ScenarioBanner({ scenarios, activeScenario, locale }: ScenarioBannerProps) {
  if (scenarios.length === 0) return null;

  const isAr = locale === "ar";
  
  const formatDelta = (delta: number) => {
    const sign = delta >= 0 ? "+" : "";
    return `${sign}${delta.toLocaleString("en")}`;
  };

  const message = isAr
    ? `${scenarios.length} سيناريو نشط${
        activeScenario
          ? ` · الأساس للمقارنة: فرق ${formatDelta(activeScenario.deltaCash)} · ${activeScenario.riskLevel}`
          : ""
      }`
    : `${scenarios.length} scenario(s) active${
        activeScenario
          ? ` · Primary: delta ${formatDelta(activeScenario.deltaCash)} · ${activeScenario.riskLevel}`
          : ""
      }`;

  return (
    <aside
      className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-4 py-2 text-sm text-muted-foreground"
      role="status"
      aria-live="polite"
    >
      {message}
    </aside>
  );
}
