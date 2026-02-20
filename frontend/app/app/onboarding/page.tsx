"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle2, ArrowRight, ArrowLeft } from "lucide-react";
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

// ── Static data ───────────────────────────────────────────────────────────────

const COUNTRY_CODES: CountryCode[] = ["QA", "SA", "AE"];

const COMPANY_SIZES: { value: CompanySize; sub: string }[] = [
  { value: "startup",    sub: "1–50" },
  { value: "sme",        sub: "50–250" },
  { value: "enterprise", sub: "250+" },
];

const LOADING_PHRASES = [
  "تخصيص العملة المحلية...",
  "دمج قوانين الضرائب...",
  "تفعيل وكلاء الذكاء الاصطناعي...",
];

// ── Slide variants ────────────────────────────────────────────────────────────

function slideVariants(direction: number) {
  return {
    initial:  { x: direction * 56, opacity: 0 },
    animate:  { x: 0,              opacity: 1 },
    exit:     { x: direction * -56, opacity: 0 },
  };
}

const fadeVariants = {
  initial: { opacity: 0, scale: 0.97 },
  animate: { opacity: 1, scale: 1 },
  exit:    { opacity: 0, scale: 0.97 },
};

const transition = { duration: 0.28, ease: [0.4, 0, 0.2, 1] as const };

// ── Page ──────────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter();
  const { locale, dir } = useI18n();
  const { updateCompanyProfile, setCountry } = useCompany();
  const isAr = locale === "ar";

  // Form state
  const [companyName, setCompanyName]     = useState("");
  const [companySize, setCompanySize]     = useState<CompanySize>("sme");
  const [countryCode, setCountryCode]     = useState<CountryCode>("QA");

  // Wizard state
  const [step, setStep]           = useState<1 | 2 | 3>(1);
  const [direction, setDirection] = useState(1);

  // Step 3 cycling phrase
  const [phraseIdx, setPhraseIdx] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus company name on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Step 3 logic
  useEffect(() => {
    if (step !== 3) return;

    intervalRef.current = setInterval(() => {
      setPhraseIdx((i) => (i + 1) % LOADING_PHRASES.length);
    }, 800);

    const timer = setTimeout(async () => {
      clearInterval(intervalRef.current!);
      setCountry(countryCode);
      updateCompanyProfile({
        companyName: companyName.trim(),
        companySize,
        isConfigured: true,
      });
      router.push("/app/dashboard");
    }, 3000);

    return () => {
      clearInterval(intervalRef.current!);
      clearTimeout(timer);
    };
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  function goTo(next: 1 | 2 | 3, dir: number) {
    setDirection(dir);
    setStep(next);
  }

  const canContinue = companyName.trim().length >= 1;
  const progress = step === 1 ? "50%" : step === 2 ? "100%" : "100%";
  const cp = COUNTRY_PROFILES[countryCode];

  return (
    <div
      dir={dir}
      className="min-h-screen w-full flex items-center justify-center bg-background p-4"
    >
      <div className="max-w-lg w-full rounded-2xl border shadow-2xl bg-card overflow-hidden">

        {/* ── Progress bar ── */}
        {step < 3 && (
          <div className="h-1 bg-muted w-full">
            <motion.div
              className="h-full bg-primary"
              animate={{ width: progress }}
              transition={{ duration: 0.4, ease: "easeInOut" }}
            />
          </div>
        )}

        <div className="p-8">
          {/* ── Logo ── */}
          <div className="flex items-center gap-2 mb-8">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-xs">
              CF
            </div>
            <span className="font-semibold text-sm">CashFlow.ai</span>
          </div>

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
                          {isAr
                            ? s.value === "startup" ? "موظف" : s.value === "sme" ? "موظف" : "موظف+"
                            : "employees"}
                        </span>
                      </button>
                    ))}
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
                    const c = COUNTRY_PROFILES[code];
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

                {/* Actions */}
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
                    className="flex-1 h-10 gap-2 font-semibold"
                    onClick={() => goTo(3, 1)}
                  >
                    🚀 {isAr ? "تهيئة النظام" : "Initialize System"}
                  </Button>
                </div>
              </motion.div>
            )}

            {/* ── STEP 3: AI Loading ── */}
            {step === 3 && (
              <motion.div
                key="step3"
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
                      ? `جاري بناء العقل المالي لشركة ${companyName || "شركتك"}...`
                      : `Building the financial brain for ${companyName || "your company"}...`}
                  </h2>
                  <motion.p
                    key={phraseIdx}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.25 }}
                    className="text-sm text-muted-foreground"
                  >
                    {LOADING_PHRASES[phraseIdx]}
                  </motion.p>
                </div>

                <div className="flex items-center gap-2 text-xs text-muted-foreground/60">
                  <span className="tabular-nums">{cp.flag}</span>
                  <span>{cp.currency} · {cp.taxAuthority}</span>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
