"use client";

import { useRef, useState, useCallback } from "react";
import { useI18n } from "@/lib/i18n/context";
import { useToast } from "@/components/ui/toast";
import { useScenario } from "@/contexts/ScenarioContext";
import { AIDailyBrief } from "@/components/agent/AIDailyBrief";
import { ForecastSnapshot } from "@/components/agent/ForecastSnapshot";
import { TreasuryChat } from "@/components/agent/TreasuryChat";
import { ActiveCasesPanel } from "@/components/agent/ActiveCasesPanel";
import { CaseDrawer } from "@/components/agent/CaseDrawer";
import { SimulationModal } from "@/components/agent/SimulationModal";
import { ScenarioBanner } from "@/components/agent/ScenarioBanner";
import type { AgentCase } from "@/components/agent/ActiveCasesPanel";
import type { Scenario } from "@/contexts/ScenarioContext";
import { getTenantId } from "@/lib/api/client";
import { useActiveAlerts } from "@/lib/hooks/useActiveAlerts";
import { useDailyBrief } from "@/lib/hooks/useDailyBrief";

export default function AIAdvisorPage() {
  const { dir, locale } = useI18n();
  const { toast } = useToast();
  const { scenarios, activeScenario, addScenario } = useScenario();
  const casesSectionRef = useRef<HTMLDivElement>(null);
  const [selectedCase, setSelectedCase] = useState<AgentCase | null>(null);
  const [simulationOpen, setSimulationOpen] = useState(false);
  const tenantId = getTenantId();
  const isAr = locale === "ar";

  const { data: alerts = [], isLoading: alertsLoading } = useActiveAlerts(tenantId);
  const { data: dailyBrief, isLoading: briefLoading } = useDailyBrief(tenantId);

  const handleOpenCases = useCallback(() => {
    casesSectionRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const handleApplyScenario = useCallback(
    (scenario: Scenario) => {
      if (scenarios.length >= 3) {
        toast({
          title: isAr ? "الحد الأقصى للسيناريوهات" : "Maximum scenarios",
          description: isAr
            ? "يمكنك إضافة 3 سيناريوهات كحد أقصى. احذف واحداً للمتابعة."
            : "You can add up to 3 scenarios. Remove one to continue.",
          variant: "destructive",
        });
        return;
      }
      addScenario(scenario);
      toast({
        title: isAr ? "تمت إضافة السيناريو" : "Scenario added",
        description: isAr
          ? `فرق السيولة: ${scenario.deltaCash >= 0 ? "+" : ""}${scenario.deltaCash.toLocaleString("en")} · ${scenario.riskLevel}`
          : `Delta: ${scenario.deltaCash >= 0 ? "+" : ""}${scenario.deltaCash.toLocaleString("en")} · ${scenario.riskLevel}`,
        variant: "success",
      });
    },
    [scenarios.length, addScenario, toast, isAr]
  );

  const handleSimulationOpen = useCallback(() => {
    setSimulationOpen(true);
  }, []);

  const handleSimulationClose = useCallback(() => {
    setSimulationOpen(false);
  }, []);

  const handleCaseClose = useCallback(() => {
    setSelectedCase(null);
  }, []);

  const handleCaseSimulate = useCallback(() => {
    setSelectedCase(null);
    setSimulationOpen(true);
  }, []);

  return (
    <div dir={dir} className="min-h-full w-full" data-page-content>
      <div className="max-w-7xl w-full mx-auto px-6 py-8 flex flex-col gap-6">
        <ScenarioBanner
          scenarios={scenarios}
          activeScenario={activeScenario}
          locale={locale}
        />
        <AIDailyBrief
          data={dailyBrief}
          loading={briefLoading}
          onOpenCases={handleOpenCases}
          onOpenSimulation={handleSimulationOpen}
        />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ForecastSnapshot tenantId={tenantId} />
          <div ref={casesSectionRef}>
            <ActiveCasesPanel
              alerts={alerts}
              loading={alertsLoading}
              selectedCase={selectedCase}
              onSelectCase={setSelectedCase}
            />
          </div>
        </div>
        <TreasuryChat />
      </div>
      <CaseDrawer
        open={!!selectedCase}
        case={selectedCase}
        onClose={handleCaseClose}
        onSimulate={handleCaseSimulate}
      />
      <SimulationModal
        open={simulationOpen}
        onClose={handleSimulationClose}
        onApply={handleApplyScenario}
      />
    </div>
  );
}
