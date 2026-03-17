"use client";

import { useState, useMemo } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  AlertTriangle,
  Bot,
  Zap,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/shared/ui/card";
import { Badge } from "@/components/shared/ui/badge";
import { Button } from "@/components/shared/ui/button";
import { useI18n } from "@/lib/i18n/context";
import { useCurrency } from "@/contexts/CurrencyContext";
import { cn } from "@/lib/utils";

// ── Types ────────────────────────────────────────────────────────────────────

type EventType = "inflow" | "outflow" | "transfer";

interface CalendarEvent {
  id: string;
  day: number;
  type: EventType;
  description: string;
  description_ar: string;
  amount: number;
  counterparty: string;
  counterparty_ar: string;
}

// ── Mock Data — March 2026 ──────────────────────────────────────────────────

const EVENTS: CalendarEvent[] = [
  { id: "e1",  day: 1,  type: "outflow", description: "Rent payment",            description_ar: "دفعة الإيجار",            amount: -15_000,  counterparty: "Al Faisaliah Tower", counterparty_ar: "برج الفيصلية" },
  { id: "e2",  day: 3,  type: "inflow",  description: "Client A invoice",         description_ar: "فاتورة العميل أ",          amount: 45_000,   counterparty: "Client A",           counterparty_ar: "العميل أ" },
  { id: "e3",  day: 5,  type: "outflow", description: "Ooredoo bill",             description_ar: "فاتورة Ooredoo",           amount: -3_200,   counterparty: "Ooredoo",            counterparty_ar: "Ooredoo" },
  { id: "e4",  day: 10, type: "outflow", description: "Supplier payment",         description_ar: "دفعة المورد",              amount: -28_000,  counterparty: "Gulf Supplies Co.",   counterparty_ar: "شركة الخليج للتوريدات" },
  { id: "e5",  day: 12, type: "inflow",  description: "Client B payment",         description_ar: "دفعة العميل ب",            amount: 67_000,   counterparty: "Client B",           counterparty_ar: "العميل ب" },
  { id: "e6",  day: 15, type: "outflow", description: "VAT payment",              description_ar: "دفعة ضريبة القيمة المضافة", amount: -18_500,  counterparty: "ZATCA",              counterparty_ar: "هيئة الزكاة والضريبة" },
  { id: "e7",  day: 20, type: "inflow",  description: "Service revenue",          description_ar: "إيراد خدمات",              amount: 23_000,   counterparty: "Client D",           counterparty_ar: "العميل د" },
  { id: "e8",  day: 25, type: "outflow", description: "Payroll",                  description_ar: "الرواتب",                  amount: -89_000,  counterparty: "Employees",          counterparty_ar: "الموظفون" },
  { id: "e9",  day: 25, type: "outflow", description: "GOSI / Social Insurance",  description_ar: "التأمينات الاجتماعية",      amount: -12_000,  counterparty: "GOSI",               counterparty_ar: "التأمينات" },
  { id: "e10", day: 28, type: "inflow",  description: "Client C payment",         description_ar: "دفعة العميل ج",            amount: 38_000,   counterparty: "Client C",           counterparty_ar: "العميل ج" },
  { id: "e11", day: 31, type: "outflow", description: "Utility bills",            description_ar: "فواتير المرافق",            amount: -4_500,   counterparty: "SEC / Marafiq",      counterparty_ar: "الكهرباء / المرافق" },
];

const OPENING_BALANCE = 120_000;
const DANGER_THRESHOLD = 50_000;

const DAY_NAMES_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_NAMES_AR = ["أحد", "إثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"];

const MONTH_NAMES_EN = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const MONTH_NAMES_AR = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function eventDotColor(type: EventType): string {
  if (type === "inflow") return "bg-emerald-500";
  if (type === "outflow") return "bg-red-500";
  return "bg-blue-500";
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function CashCalendarPage() {
  const { locale, dir } = useI18n();
  const { fmt, fmtAxis } = useCurrency();
  const isAr = locale === "ar";

  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<"month" | "week">("month");
  const [currentMonth] = useState({ year: 2026, month: 2 }); // March 2026

  const daysInMonth = getDaysInMonth(currentMonth.year, currentMonth.month);
  const firstDay = getFirstDayOfWeek(currentMonth.year, currentMonth.month);
  const dayNames = isAr ? DAY_NAMES_AR : DAY_NAMES_EN;
  const monthName = isAr
    ? MONTH_NAMES_AR[currentMonth.month]
    : MONTH_NAMES_EN[currentMonth.month];

  const eventsByDay = useMemo(() => {
    const map = new Map<number, CalendarEvent[]>();
    for (const ev of EVENTS) {
      const list = map.get(ev.day) ?? [];
      list.push(ev);
      map.set(ev.day, list);
    }
    return map;
  }, []);

  const totalInflows = EVENTS.filter((e) => e.type === "inflow").reduce((s, e) => s + e.amount, 0);
  const totalOutflows = EVENTS.filter((e) => e.type === "outflow").reduce((s, e) => s + e.amount, 0);
  const netFlow = totalInflows + totalOutflows;

  // Running balance per day to detect "danger days"
  const dailyBalance = useMemo(() => {
    const balances = new Map<number, number>();
    let running = OPENING_BALANCE;
    for (let d = 1; d <= daysInMonth; d++) {
      const dayEvents = eventsByDay.get(d) ?? [];
      for (const ev of dayEvents) running += ev.amount;
      balances.set(d, running);
    }
    return balances;
  }, [eventsByDay, daysInMonth]);

  const dangerDays = useMemo(
    () => Array.from(dailyBalance.entries()).filter(([, b]) => b < DANGER_THRESHOLD).length,
    [dailyBalance],
  );

  const selectedEvents = selectedDay ? eventsByDay.get(selectedDay) ?? [] : [];

  // Running balance list for the selected day detail
  const selectedRunningBalances = useMemo(() => {
    if (!selectedDay) return [];
    let running = OPENING_BALANCE;
    for (let d = 1; d < selectedDay; d++) {
      const dayEvents = eventsByDay.get(d) ?? [];
      for (const ev of dayEvents) running += ev.amount;
    }
    const result: number[] = [];
    for (const ev of selectedEvents) {
      running += ev.amount;
      result.push(running);
    }
    return result;
  }, [selectedDay, selectedEvents, eventsByDay]);

  // Build calendar grid cells
  const calendarCells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) calendarCells.push(null);
  for (let d = 1; d <= daysInMonth; d++) calendarCells.push(d);
  while (calendarCells.length % 7 !== 0) calendarCells.push(null);

  return (
    <div dir={dir} className="flex flex-col h-full overflow-y-auto bg-background">
      <div className="max-w-6xl w-full mx-auto px-4 py-8 space-y-6">
        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <CalendarDays className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">
                {isAr ? "تقويم التدفقات النقدية" : "Cash Flow Calendar"}
              </h1>
              <p className="text-sm text-muted-foreground">
                {isAr
                  ? "عرض التدفقات الداخلة والخارجة القادمة في تقويم شهري"
                  : "Upcoming inflows and outflows in a visual monthly calendar"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div className="flex rounded-lg border overflow-hidden">
              {(["month", "week"] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={cn(
                    "px-3 py-1.5 text-xs font-medium transition-colors",
                    viewMode === mode
                      ? "bg-primary text-primary-foreground"
                      : "bg-card text-muted-foreground hover:text-foreground",
                  )}
                >
                  {mode === "month"
                    ? isAr ? "شهري" : "Month"
                    : isAr ? "أسبوعي" : "Week"}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Month Navigation ── */}
        <div className="flex items-center justify-between">
          <Button variant="outline" size="icon" className="h-8 w-8">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-lg font-semibold tabular-nums">
            {monthName} {currentMonth.year}
          </h2>
          <Button variant="outline" size="icon" className="h-8 w-8">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* ── Legend ── */}
        <div className="flex items-center gap-5 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            {isAr ? "تدفق داخل" : "Inflow"}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
            {isAr ? "تدفق خارج" : "Outflow"}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
            {isAr ? "تحويل داخلي" : "Internal Transfer"}
          </span>
        </div>

        {/* ── Summary Strip ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="border-emerald-500/20 bg-emerald-500/5">
            <CardContent className="p-4">
              <p className="text-xs font-medium text-muted-foreground">
                {isAr ? "إجمالي التدفقات الداخلة" : "Total Inflows"}
              </p>
              <p className="text-lg font-bold tabular-nums text-emerald-600 dark:text-emerald-400 mt-1" dir="ltr">
                {fmt(totalInflows)}
              </p>
            </CardContent>
          </Card>
          <Card className="border-red-500/20 bg-red-500/5">
            <CardContent className="p-4">
              <p className="text-xs font-medium text-muted-foreground">
                {isAr ? "إجمالي التدفقات الخارجة" : "Total Outflows"}
              </p>
              <p className="text-lg font-bold tabular-nums text-red-600 dark:text-red-400 mt-1" dir="ltr">
                {fmt(Math.abs(totalOutflows))}
              </p>
            </CardContent>
          </Card>
          <Card className={cn(
            "border-primary/20",
            netFlow >= 0 ? "bg-emerald-500/5" : "bg-red-500/5",
          )}>
            <CardContent className="p-4">
              <p className="text-xs font-medium text-muted-foreground">
                {isAr ? "الصافي" : "Net"}
              </p>
              <p
                className={cn(
                  "text-lg font-bold tabular-nums mt-1",
                  netFlow >= 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-red-600 dark:text-red-400",
                )}
                dir="ltr"
              >
                {fmt(netFlow)}
              </p>
            </CardContent>
          </Card>
          <Card className="border-amber-500/20 bg-amber-500/5">
            <CardContent className="p-4">
              <p className="text-xs font-medium text-muted-foreground">
                {isAr ? "أيام الخطر" : "Danger Days"}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <p className="text-lg font-bold tabular-nums text-amber-600 dark:text-amber-400">
                  {dangerDays}
                </p>
                <span className="text-xs text-muted-foreground">
                  {isAr
                    ? `(أقل من ${fmt(DANGER_THRESHOLD)})`
                    : `(below ${fmt(DANGER_THRESHOLD)})`}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Calendar Grid ── */}
        <Card>
          <CardContent className="p-3 sm:p-4">
            {/* Day-of-week headers */}
            <div className="grid grid-cols-7 mb-1">
              {dayNames.map((name) => (
                <div
                  key={name}
                  className="text-center text-xs font-semibold text-muted-foreground py-2"
                >
                  {name}
                </div>
              ))}
            </div>

            {/* Day cells */}
            <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
              {calendarCells.map((day, idx) => {
                if (day === null) {
                  return (
                    <div
                      key={`empty-${idx}`}
                      className="bg-muted/30 min-h-[80px] sm:min-h-[100px]"
                    />
                  );
                }

                const dayEvents = eventsByDay.get(day) ?? [];
                const dayTotal = dayEvents.reduce((s, e) => s + e.amount, 0);
                const balance = dailyBalance.get(day) ?? 0;
                const isDanger = balance < DANGER_THRESHOLD;
                const isSelected = selectedDay === day;

                return (
                  <button
                    key={day}
                    onClick={() => setSelectedDay(selectedDay === day ? null : day)}
                    className={cn(
                      "bg-card min-h-[80px] sm:min-h-[100px] p-1.5 sm:p-2 flex flex-col items-start text-start transition-all relative group",
                      "hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                      isSelected && "ring-2 ring-primary bg-primary/5",
                      isDanger && "bg-red-500/5",
                    )}
                  >
                    <span
                      className={cn(
                        "text-sm font-medium tabular-nums leading-none",
                        isSelected && "text-primary font-bold",
                        isDanger && !isSelected && "text-red-500",
                      )}
                    >
                      {day}
                    </span>

                    {dayEvents.length > 0 && (
                      <>
                        {/* Event dots */}
                        <div className="flex gap-1 mt-1.5 flex-wrap">
                          {dayEvents.map((ev) => (
                            <span
                              key={ev.id}
                              className={cn(
                                "h-2 w-2 rounded-full shrink-0",
                                eventDotColor(ev.type),
                              )}
                            />
                          ))}
                        </div>

                        {/* Day total */}
                        <span
                          className={cn(
                            "text-[10px] sm:text-xs font-semibold tabular-nums mt-auto",
                            dayTotal >= 0
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-red-600 dark:text-red-400",
                          )}
                          dir="ltr"
                        >
                          {dayTotal >= 0 ? "+" : ""}{fmtAxis(dayTotal)}
                        </span>
                      </>
                    )}

                    {isDanger && (
                      <AlertTriangle className="absolute top-1.5 end-1.5 h-3 w-3 text-amber-500 opacity-70" />
                    )}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* ── Day Detail Panel ── */}
        {selectedDay !== null && selectedEvents.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">
                {isAr
                  ? `تفاصيل ${selectedDay} ${monthName} ${currentMonth.year}`
                  : `${monthName} ${selectedDay}, ${currentMonth.year} — Details`}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {selectedEvents.map((ev, i) => (
                <div
                  key={ev.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/30"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {ev.type === "inflow" ? (
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/10">
                        <ArrowUpRight className="h-4 w-4 text-emerald-500" />
                      </span>
                    ) : ev.type === "outflow" ? (
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-500/10">
                        <ArrowDownLeft className="h-4 w-4 text-red-500" />
                      </span>
                    ) : (
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500/10">
                        <ArrowLeftRight className="h-4 w-4 text-blue-500" />
                      </span>
                    )}

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={ev.type === "inflow" ? "secondary" : "destructive"}
                          className={cn(
                            "text-[10px] px-1.5 py-0",
                            ev.type === "inflow" && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
                            ev.type === "transfer" && "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30",
                          )}
                        >
                          {ev.type === "inflow"
                            ? isAr ? "تدفق داخل" : "Inflow"
                            : ev.type === "outflow"
                              ? isAr ? "تدفق خارج" : "Outflow"
                              : isAr ? "تحويل" : "Transfer"}
                        </Badge>
                        <span className="text-sm font-medium truncate">
                          {isAr ? ev.description_ar : ev.description}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {isAr ? ev.counterparty_ar : ev.counterparty}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col items-end shrink-0">
                    <span
                      className={cn(
                        "text-sm font-bold tabular-nums",
                        ev.amount >= 0
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-red-600 dark:text-red-400",
                      )}
                      dir="ltr"
                    >
                      {fmt(ev.amount)}
                    </span>
                    <span className="text-[10px] text-muted-foreground tabular-nums mt-0.5" dir="ltr">
                      {isAr ? "الرصيد:" : "Balance:"}{" "}
                      {fmt(selectedRunningBalances[i] ?? 0)}
                    </span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {selectedDay !== null && selectedEvents.length === 0 && (
          <Card>
            <CardContent className="p-6 text-center text-sm text-muted-foreground">
              {isAr
                ? "لا توجد أحداث في هذا اليوم"
                : "No events on this day"}
            </CardContent>
          </Card>
        )}

        {/* ── AI Insight ── */}
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 ring-2 ring-primary/20">
                <Bot className="h-4.5 w-4.5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold">
                  {isAr ? "تنبيه الوكيل رقيب" : "Raqib Agent Insight"}
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  {isAr ? "تحليل ذكي لتقويمك النقدي" : "AI-powered calendar analysis"}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-muted/50 p-4 text-sm leading-relaxed">
              {isAr ? (
                <p>
                  سينخفض رصيدك إلى أقل من <strong>{fmt(50_000)}</strong> في <strong>25 مارس</strong> بسبب
                  الرواتب والتأمينات الاجتماعية. أنصح بطلب دفعة مبكرة من <strong>العميل ب</strong> لتجنب
                  أي ضغط على السيولة.
                </p>
              ) : (
                <p>
                  Your balance will dip below <strong>{fmt(50_000)}</strong> on{" "}
                  <strong>March 25</strong> due to payroll and GOSI. Consider requesting early
                  payment from <strong>Client B</strong> to avoid a liquidity squeeze.
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-3">
              <Button size="sm" className="gap-2 shadow-[0_0_20px_-5px_hsl(var(--primary)/0.4)]">
                <Zap className="h-3.5 w-3.5" />
                {isAr ? "طلب دفعة مبكرة" : "Request Early Payment"}
              </Button>
              <Button size="sm" variant="outline" className="gap-2">
                <CalendarDays className="h-3.5 w-3.5" />
                {isAr ? "عرض سيناريوهات بديلة" : "View Alternative Scenarios"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
