"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Loader2,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Building2,
  TrendingUp,
  FileCheck,
  Network,
  GitBranch,
  Bot,
  Activity,
  Mail,
  Briefcase,
  Factory,
  Laptop,
  Home,
  Store,
} from "lucide-react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";
import {
  useCompany,
  COUNTRY_PROFILES,
  type CountryCode,
  type CompanySize,
} from "@/contexts/CompanyContext";
import { createTenant } from "@/lib/api/tenant-api";
import { useTenant } from "@/lib/hooks/use-tenant";

// ── Static data ───────────────────────────────────────────────────────────────

const COUNTRY_CODES: CountryCode[] = ["QA", "SA", "AE"];

const COMPANY_SIZES: { value: CompanySize; sub: string }[] = [
  { value: "startup",    sub: "1–50" },
  { value: "sme",        sub: "50–250" },
  { value: "enterprise", sub: "250+" },
];

const INDUSTRIES = [
  { value: "construction", en: "Construction", ar: "المقاولات",   icon: Building2 },
  { value: "trading",      en: "Trading",      ar: "التجارة",     icon: Store },
  { value: "tech",         en: "Tech",         ar: "التكنولوجيا", icon: Laptop },
  { value: "real-estate",  en: "Real Estate",  ar: "العقارات",    icon: Home },
  { value: "other",        en: "Other",        ar: "أخرى",        icon: Factory },
];

const USER_ROLES = [
  { value: "cfo",             en: "CFO",             ar: "المدير المالي التنفيذي" },
  { value: "finance-manager", en: "Finance Manager", ar: "مدير المالية" },
  { value: "accountant",      en: "Accountant",      ar: "محاسب" },
  { value: "ceo",             en: "CEO",             ar: "الرئيس التنفيذي" },
];

const USE_CASES = [
  {
    value: "cashflow",
    en: "Cash Flow Forecasting",
    ar: "توقعات التدفق النقدي",
    icon: TrendingUp,
    phraseEn: "Calibrating cash flow models...",
    phraseAr: "معايرة نماذج التدفق النقدي...",
  },
  {
    value: "compliance",
    en: "VAT & Compliance",
    ar: "ضريبة القيمة المضافة والامتثال",
    icon: FileCheck,
    phraseEn: "Integrating compliance rules...",
    phraseAr: "دمج قواعد الامتثال الضريبي...",
  },
  {
    value: "group",
    en: "Multi-Entity / Group",
    ar: "متعدد الكيانات / المجموعة",
    icon: Network,
    phraseEn: "Configuring multi-entity consolidation...",
    phraseAr: "إعداد توحيد متعدد الكيانات...",
  },
  {
    value: "approvals",
    en: "Approval Workflows",
    ar: "سير عمل الموافقات",
    icon: GitBranch,
    phraseEn: "Setting up approval chains...",
    phraseAr: "إعداد سلاسل الموافقات...",
  },
  {
    value: "collections",
    en: "AI Collections",
    ar: "تحصيلات الذكاء الاصطناعي",
    icon: Bot,
    phraseEn: "Training AI collections engine...",
    phraseAr: "تدريب محرك التحصيلات الذكي...",
  },
  {
    value: "stress",
    en: "Stress Testing",
    ar: "اختبار الإجهاد",
    icon: Activity,
    phraseEn: "Loading stress test scenarios...",
    phraseAr: "تحميل سيناريوهات اختبار الإجهاد...",
  },
];

const DEFAULT_PHRASES = [
  { en: "Configuring local currency...",  ar: "تخصيص العملة المحلية..." },
  { en: "Integrating tax regulations...", ar: "دمج قوانين الضرائب..." },
  { en: "Activating AI agents...",        ar: "تفعيل وكلاء الذكاء الاصطناعي..." },
];

const TOTAL_STEPS = 4;

/** Map demo URL industry to onboarding industry value */
function demoIndustryToOnboarding(demoIndustry: string | null): string {
  const map: Record<string, string> = {
    contracting: "construction",
    trading: "trading",
    clinic: "other",
    retail: "other",
    general: "tech",
  };
  if (!demoIndustry) return "tech";
  return map[demoIndustry] ?? "tech";
}

// ── Slide variants ────────────────────────────────────────────────────────────

function slideVariants(direction: number) {
  return {
    initial: { x: direction * 56, opacity: 0 },
    animate: { x: 0,              opacity: 1 },
    exit:    { x: direction * -56, opacity: 0 },
  };
}

const fadeVariants = {
  initial: { opacity: 0, scale: 0.97 },
  animate: { opacity: 1, scale: 1 },
  exit:    { opacity: 0, scale: 0.97 },
};

const transition = { duration: 0.28, ease: [0.4, 0, 0.2, 1] as const };

type Step = 1 | 2 | 3 | 4 | 5;

// ── Helper ────────────────────────────────────────────────────────────────────

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 text-sm">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="font-medium text-end">{value}</span>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "company";
}

export default function OnboardingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { locale, dir } = useI18n();
  const { updateCompanyProfile, setCountry } = useCompany();
  const { setCurrentTenant, setMemberships } = useTenant();
  const isAr = locale === "ar";

  const fromDemo = useMemo(() => {
    const company = searchParams.get("company");
    const industryParam = searchParams.get("industry");
    return {
      companyName: company?.trim() || "",
      industry: demoIndustryToOnboarding(industryParam),
    };
  }, [searchParams]);

  // Form state (pre-filled when coming from demo)
  const [companyName, setCompanyName] = useState("");
  const [companySize, setCompanySize] = useState<CompanySize>("sme");
  const [industry,    setIndustry]    = useState("tech");
  const [countryCode, setCountryCode] = useState<CountryCode>("QA");
  const [userRole,    setUserRole]    = useState("finance-manager");
  const [inviteEmail, setInviteEmail] = useState("");
  const [useCases,    setUseCases]    = useState<string[]>([]);

  useEffect(() => {
    if (fromDemo.companyName) setCompanyName((c) => c || fromDemo.companyName);
    if (fromDemo.industry) setIndustry(fromDemo.industry);
  }, [fromDemo.companyName, fromDemo.industry]);

  // Wizard state
  const [step,      setStep]      = useState<Step>(1);
  const [direction, setDirection] = useState(1);

  // Step 5 state
  const [loadingDone, setLoadingDone] = useState(false);
  const [phraseIdx,   setPhraseIdx]   = useState(0);
  const [tenantCreatedOnServer, setTenantCreatedOnServer] = useState(false);
  const [backendUnavailable, setBackendUnavailable] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Build loading phrases: selected use cases first, then defaults
  const loadingPhrases = [
    ...useCases
      .map((uc) => USE_CASES.find((u) => u.value === uc))
      .filter(Boolean)
      .map((u) => ({ en: u!.phraseEn, ar: u!.phraseAr })),
    ...DEFAULT_PHRASES,
  ];

  // Step 5 loading logic
  useEffect(() => {
    if (step !== 5) return;

    setPhraseIdx(0);
    setLoadingDone(false);

    intervalRef.current = setInterval(() => {
      setPhraseIdx((i) => (i + 1) % loadingPhrases.length);
    }, 700);

    const timer = setTimeout(async () => {
      clearInterval(intervalRef.current!);
      const name = companyName.trim();
      const slug = slugify(name);

      // Save settings locally for demo mode
      try {
        const mockTenant = {
          id: `tenant-${Date.now()}`,
          name,
          slug,
          plan: "starter" as const,
          status: "active" as const,
          metadata: { industry, companySize, countryCode, userRole, useCases },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        setCurrentTenant(mockTenant);
        const membership = {
          id: "m-1",
          tenant_id: mockTenant.id,
          user_id: "demo-user",
          role: "owner" as const,
          status: "active" as const,
          created_at: mockTenant.created_at,
          updated_at: mockTenant.updated_at,
          tenant: mockTenant,
        };
        setMemberships([membership]);
        setBackendUnavailable(false);
        setTenantCreatedOnServer(false);
      } catch (err) {
        console.error("Failed to save settings:", err);
        setBackendUnavailable(true);
      }

      setCountry(countryCode);
      updateCompanyProfile({
        companyName: name,
        companySize,
        industry,
        userRole,
        useCases,
        isConfigured: true,
      });
      setLoadingDone(true);
    }, 3200);

    return () => {
      clearInterval(intervalRef.current!);
      clearTimeout(timer);
    };
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  function goTo(next: Step, dir: number) {
    setDirection(dir);
    setStep(next);
  }

  function toggleUseCase(value: string) {
    setUseCases((prev) =>
      prev.includes(value)
        ? prev.filter((v) => v !== value)
        : prev.length < 3
          ? [...prev, value]
          : prev
    );
  }

  const canContinue = companyName.trim().length >= 1;
  const progress    = step <= TOTAL_STEPS ? `${(step / TOTAL_STEPS) * 100}%` : "100%";
  const cp          = COUNTRY_PROFILES[countryCode];

  const selectedIndustry = INDUSTRIES.find((i) => i.value === industry);
  const selectedRole     = USER_ROLES.find((r) => r.value === userRole);

  return (
    <div
      dir={dir}
      className="min-h-screen w-full flex items-center justify-center bg-background p-4"
    >
      <div className="max-w-lg w-full rounded-2xl border shadow-2xl bg-card overflow-hidden">

        {/* ── Progress bar ── */}
        {step < 5 && (
          <div className="h-1 bg-muted w-full">
            <motion.div
              className="h-full bg-primary"
              animate={{ width: progress }}
              transition={{ duration: 0.4, ease: "easeInOut" }}
            />
          </div>
        )}

        <div className="p-8">
          {/* ── Logo + step counter ── */}
          {step < 5 && (
            <div className="flex items-center gap-2 mb-8">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-xs">
                CF
              </div>
              <span className="font-semibold text-sm">CashFlow.ai</span>
              <span className="ms-auto text-xs text-muted-foreground">
                {isAr
                  ? `خطوة ${step} من ${TOTAL_STEPS}`
                  : `Step ${step} of ${TOTAL_STEPS}`}
              </span>
            </div>
          )}

          {/* ── Animated step body ── */}
          <AnimatePresence mode="wait" initial={false}>

            {/* ── STEP 1: Company Details ── */}
            {step === 1 && (
              <motion.div
                key="step1"
                variants={slideVariants(direction)}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={transition}
                className="space-y-6"
              >
                <div>
                  <h1 className="text-xl font-bold tracking-tight">
                    {isAr
                      ? "لنبدأ بتأسيس مساحة عملك"
                      : "Let's set up your workspace"}
                  </h1>
                  <p className="text-sm text-muted-foreground mt-1">
                    {isAr
                      ? "بضع خطوات بسيطة لتخصيص تجربتك المالية"
                      : "A few quick steps to personalize your financial experience"}
                  </p>
                </div>

                {/* Company Name */}
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">
                    {isAr ? "اسم الشركة" : "Company Name"}
                  </Label>
                  <Input
                    ref={inputRef}
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && canContinue && goTo(2, 1)}
                    className="h-10"
                    placeholder={isAr ? "مثال: مجموعة الماجد القابضة" : "e.g. Al-Majd Holding Group"}
                  />
                </div>

                {/* Company Size */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    {isAr ? "حجم الشركة" : "Company Size"}
                  </Label>
                  <div className="grid grid-cols-3 gap-3">
                    {COMPANY_SIZES.map((s) => (
                      <button
                        key={s.value}
                        type="button"
                        onClick={() => setCompanySize(s.value)}
                        className={cn(
                          "flex flex-col items-center gap-0.5 rounded-xl border p-3 text-center transition-all cursor-pointer",
                          "hover:border-primary/50 hover:bg-primary/5",
                          companySize === s.value
                            ? "ring-2 ring-primary border-primary bg-primary/5"
                            : "border-border bg-background"
                        )}
                      >
                        <span className="text-sm font-semibold tabular-nums">{s.sub}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {isAr ? "موظف" : "employees"}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Industry */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    {isAr ? "قطاع الصناعة" : "Industry"}
                  </Label>
                  <div className="grid grid-cols-5 gap-2">
                    {INDUSTRIES.map((ind) => {
                      const Icon = ind.icon;
                      return (
                        <button
                          key={ind.value}
                          type="button"
                          onClick={() => setIndustry(ind.value)}
                          className={cn(
                            "flex flex-col items-center gap-1.5 rounded-xl border p-2.5 text-center transition-all cursor-pointer",
                            "hover:border-primary/50 hover:bg-primary/5",
                            industry === ind.value
                              ? "ring-2 ring-primary border-primary bg-primary/5"
                              : "border-border bg-background"
                          )}
                        >
                          <Icon className="h-4 w-4" />
                          <span className="text-[9px] leading-tight text-muted-foreground">
                            {isAr ? ind.ar : ind.en}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <Button
                  className="w-full h-10 gap-2"
                  disabled={!canContinue}
                  onClick={() => goTo(2, 1)}
                >
                  {isAr ? "متابعة" : "Continue"}
                  {isAr ? <ArrowLeft className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
                </Button>
              </motion.div>
            )}

            {/* ── STEP 2: Localization ── */}
            {step === 2 && (
              <motion.div
                key="step2"
                variants={slideVariants(direction)}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={transition}
                className="space-y-6"
              >
                <div>
                  <h1 className="text-xl font-bold tracking-tight">
                    {isAr
                      ? "أين يقع المقر الرئيسي لشركتك؟"
                      : "Where is your company headquartered?"}
                  </h1>
                  <p className="text-sm text-muted-foreground mt-1">
                    {isAr
                      ? "سنقوم بضبط العملة وقوانين الضرائب تلقائياً."
                      : "We'll automatically configure your currency and tax rules."}
                  </p>
                </div>

                {/* Country cards */}
                <div className="grid grid-cols-3 gap-3">
                  {COUNTRY_CODES.map((code) => {
                    const c          = COUNTRY_PROFILES[code];
                    const isSelected = countryCode === code;
                    return (
                      <button
                        key={code}
                        type="button"
                        onClick={() => setCountryCode(code)}
                        className={cn(
                          "flex flex-col items-center gap-2 rounded-xl border p-4 text-center transition-all cursor-pointer",
                          "hover:border-primary/50 hover:bg-primary/5",
                          isSelected
                            ? "ring-2 ring-primary border-primary bg-primary/5"
                            : "border-border bg-background"
                        )}
                      >
                        <span className="text-3xl">{c.flag}</span>
                        <div>
                          <p className="text-sm font-semibold">
                            {isAr ? c.nameAr : c.nameEn}
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-0.5 tabular-nums">
                            {c.currency} / {c.taxAuthority}
                          </p>
                        </div>
                        {isSelected && (
                          <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    className="gap-1.5"
                    onClick={() => goTo(1, -1)}
                  >
                    {isAr ? <ArrowRight className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}
                    {isAr ? "رجوع" : "Back"}
                  </Button>
                  <Button
                    className="flex-1 h-10 gap-2"
                    onClick={() => goTo(3, 1)}
                  >
                    {isAr ? "متابعة" : "Continue"}
                    {isAr ? <ArrowLeft className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
                  </Button>
                </div>
              </motion.div>
            )}

            {/* ── STEP 3: Team Setup ── */}
            {step === 3 && (
              <motion.div
                key="step3"
                variants={slideVariants(direction)}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={transition}
                className="space-y-6"
              >
                <div>
                  <h1 className="text-xl font-bold tracking-tight">
                    {isAr ? "أخبرنا عن دورك" : "Tell us about your role"}
                  </h1>
                  <p className="text-sm text-muted-foreground mt-1">
                    {isAr
                      ? "سنخصص لوحة التحكم بناءً على مسؤولياتك"
                      : "We'll tailor the dashboard to your responsibilities"}
                  </p>
                </div>

                {/* Role selection */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    {isAr ? "دورك في الشركة" : "Your Role"}
                  </Label>
                  <div className="grid grid-cols-2 gap-3">
                    {USER_ROLES.map((role) => (
                      <button
                        key={role.value}
                        type="button"
                        onClick={() => setUserRole(role.value)}
                        className={cn(
                          "flex items-center gap-2 rounded-xl border px-3 py-3 text-start transition-all cursor-pointer",
                          "hover:border-primary/50 hover:bg-primary/5",
                          userRole === role.value
                            ? "ring-2 ring-primary border-primary bg-primary/5"
                            : "border-border bg-background"
                        )}
                      >
                        <Briefcase className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <span className="text-sm font-medium">
                          {isAr ? role.ar : role.en}
                        </span>
                        {userRole === role.value && (
                          <CheckCircle2 className="h-3.5 w-3.5 text-primary ms-auto shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Invite teammate (optional) */}
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5" />
                    {isAr ? "دعوة زميل (اختياري)" : "Invite a teammate (optional)"}
                  </Label>
                  <Input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="h-10"
                    placeholder="colleague@company.com"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    className="gap-1.5"
                    onClick={() => goTo(2, -1)}
                  >
                    {isAr ? <ArrowRight className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}
                    {isAr ? "رجوع" : "Back"}
                  </Button>
                  <Button
                    className="flex-1 h-10 gap-2"
                    onClick={() => goTo(4, 1)}
                  >
                    {isAr ? "متابعة" : "Continue"}
                    {isAr ? <ArrowLeft className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
                  </Button>
                </div>
              </motion.div>
            )}

            {/* ── STEP 4: Use Case ── */}
            {step === 4 && (
              <motion.div
                key="step4"
                variants={slideVariants(direction)}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={transition}
                className="space-y-6"
              >
                <div>
                  <h1 className="text-xl font-bold tracking-tight">
                    {isAr ? "ما الذي يهمك أكثر؟" : "What matters most to you?"}
                  </h1>
                  <p className="text-sm text-muted-foreground mt-1">
                    {isAr
                      ? "اختر حتى 3 أولويات — سنبرز هذه الميزات في لوحتك"
                      : "Pick up to 3 priorities — we'll highlight these in your dashboard"}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {USE_CASES.map((uc) => {
                    const Icon       = uc.icon;
                    const isSelected = useCases.includes(uc.value);
                    const isDisabled = !isSelected && useCases.length >= 3;
                    return (
                      <button
                        key={uc.value}
                        type="button"
                        disabled={isDisabled}
                        onClick={() => toggleUseCase(uc.value)}
                        className={cn(
                          "flex items-center gap-3 rounded-xl border p-3 text-start transition-all cursor-pointer",
                          "hover:border-primary/50 hover:bg-primary/5",
                          isSelected
                            ? "ring-2 ring-primary border-primary bg-primary/5"
                            : "border-border bg-background",
                          isDisabled && "opacity-40 cursor-not-allowed pointer-events-none"
                        )}
                      >
                        <div
                          className={cn(
                            "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                            isSelected ? "bg-primary/15" : "bg-muted"
                          )}
                        >
                          <Icon
                            className={cn(
                              "h-4 w-4",
                              isSelected ? "text-primary" : "text-muted-foreground"
                            )}
                          />
                        </div>
                        <span className="text-xs font-medium leading-snug">
                          {isAr ? uc.ar : uc.en}
                        </span>
                        {isSelected && (
                          <CheckCircle2 className="h-3.5 w-3.5 text-primary ms-auto shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {useCases.length > 0 && (
                  <p className="text-xs text-muted-foreground text-center">
                    {isAr
                      ? `${useCases.length} / 3 مختار`
                      : `${useCases.length} / 3 selected`}
                  </p>
                )}

                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    className="gap-1.5"
                    onClick={() => goTo(3, -1)}
                  >
                    {isAr ? <ArrowRight className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}
                    {isAr ? "رجوع" : "Back"}
                  </Button>
                  <Button
                    className="flex-1 h-10 gap-2 font-semibold"
                    onClick={() => goTo(5, 1)}
                  >
                    🚀 {isAr ? "تهيئة النظام" : "Initialize System"}
                  </Button>
                </div>
              </motion.div>
            )}

            {/* ── STEP 5a: AI Loading ── */}
            {step === 5 && !loadingDone && (
              <motion.div
                key="step5-loading"
                variants={fadeVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={transition}
                className="flex flex-col items-center text-center py-8 gap-6"
              >
                <div className="relative flex items-center justify-center">
                  <div className="absolute h-20 w-20 rounded-full bg-primary/10 animate-ping opacity-40" />
                  <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                    <Loader2 className="h-8 w-8 text-primary animate-spin" />
                  </div>
                </div>

                <div className="space-y-2">
                  <h2 className="text-lg font-bold leading-snug">
                    {isAr
                      ? `جاري بناء العقل المالي لـ${companyName || "شركتك"}...`
                      : `Building the financial brain for ${companyName || "your company"}...`}
                  </h2>
                  <AnimatePresence mode="wait">
                    <motion.p
                      key={phraseIdx}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.25 }}
                      className="text-sm text-muted-foreground"
                    >
                      {isAr
                        ? loadingPhrases[phraseIdx]?.ar
                        : loadingPhrases[phraseIdx]?.en}
                    </motion.p>
                  </AnimatePresence>
                </div>

                <div className="flex items-center gap-2 text-xs text-muted-foreground/60">
                  <span>{cp.flag}</span>
                  <span>{cp.currency} · {cp.taxAuthority}</span>
                </div>
              </motion.div>
            )}

            {/* ── STEP 5b: Welcome screen ── */}
            {step === 5 && loadingDone && (
              <motion.div
                key="step5-welcome"
                variants={fadeVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={transition}
                className="flex flex-col items-center text-center py-6 gap-6"
              >
                {/* Success icon */}
                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 260, damping: 20 }}
                  className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10"
                >
                  <CheckCircle2 className="h-9 w-9 text-green-500" />
                </motion.div>

                <div className="space-y-1">
                  <h2 className="text-xl font-bold">
                    {isAr
                      ? `مرحباً بك، ${companyName}!`
                      : `Welcome, ${companyName}!`}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {isAr ? "مساحة عملك جاهزة تماماً" : "Your workspace is all set up"}
                  </p>
                  {!backendUnavailable && (
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                      {isAr ? "تم حفظ الإعدادات بنجاح" : "Settings saved successfully"}
                    </p>
                  )}
                  {backendUnavailable && (
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                      {isAr ? "تم حفظ الإعدادات محلياً" : "Settings saved locally"}
                    </p>
                  )}
                </div>

                {/* Next: connect bank / data — optional hint */}
                <p className="text-xs text-muted-foreground">
                  {isAr ? "لاحقاً: " : "Next: "}
                  <Link
                    href="/app/integrations-hub"
                    className="underline hover:text-primary font-medium"
                  >
                    {isAr ? "اربط حسابك البنكي أو استورد البيانات" : "Connect your bank or import data"}
                  </Link>
                  {isAr ? " من لوحة الربط." : " in Integrations."}
                </p>

                {/* Summary card */}
                <div className="w-full rounded-xl border bg-muted/30 p-4 text-start space-y-2.5">
                  <SummaryRow
                    label={isAr ? "الشركة" : "Company"}
                    value={`${companyName} · ${isAr ? selectedIndustry?.ar : selectedIndustry?.en}`}
                  />
                  <SummaryRow
                    label={isAr ? "البلد" : "Country"}
                    value={`${cp.flag} ${isAr ? cp.nameAr : cp.nameEn} · ${cp.currency}`}
                  />
                  <SummaryRow
                    label={isAr ? "الدور" : "Role"}
                    value={isAr ? (selectedRole?.ar ?? "") : (selectedRole?.en ?? "")}
                  />
                  {useCases.length > 0 && (
                    <SummaryRow
                      label={isAr ? "الأولويات" : "Priorities"}
                      value={useCases
                        .map((uc) => {
                          const u = USE_CASES.find((u) => u.value === uc);
                          return isAr ? u?.ar : u?.en;
                        })
                        .filter(Boolean)
                        .join(", ")}
                    />
                  )}
                </div>

                <Button
                  className="w-full h-10 gap-2 font-semibold"
                  onClick={() => router.replace("/app/dashboard")}
                >
                  {isAr ? "الذهاب إلى لوحة التحكم" : "Go to Dashboard"}
                  {isAr ? <ArrowLeft className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
                </Button>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
