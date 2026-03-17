"use client";

import { useState } from "react";
import {
  Layers,
  Crown,
  ArrowDown,
  Building2,
  TrendingUp,
  Percent,
  Bot,
  ShieldCheck,
  Zap,
  ArrowUpRight,
  Banknote,
  Info,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/shared/ui/card";
import { Badge } from "@/components/shared/ui/badge";
import { Button } from "@/components/shared/ui/button";
import { useI18n } from "@/lib/i18n/context";
import { useCurrency } from "@/contexts/CurrencyContext";
import { cn } from "@/lib/utils";

// ── Data ─────────────────────────────────────────────────────────────────────

interface PoolEntity {
  id: string;
  nameEn: string;
  nameAr: string;
  balance: number;
  status: "contributing" | "borrowing";
  benefitEn: string;
  benefitAr: string;
  benefitAmount: number;
  color: string;
}

const ENTITIES: PoolEntity[] = [
  {
    id: "construction",
    nameEn: "Tadfuq Construction LLC",
    nameAr: "شركة تدفق للمقاولات ذ.م.م",
    balance: 1_450_000,
    status: "contributing",
    benefitEn: "Earns",
    benefitAr: "يكسب",
    benefitAmount: 4_200,
    color: "from-blue-500 to-blue-600",
  },
  {
    id: "trading",
    nameEn: "Tadfuq Trading Co.",
    nameAr: "شركة تدفق التجارية",
    balance: 680_000,
    status: "contributing",
    benefitEn: "Earns",
    benefitAr: "يكسب",
    benefitAmount: 1_800,
    color: "from-emerald-500 to-emerald-600",
  },
  {
    id: "tech",
    nameEn: "Tadfuq Tech Solutions",
    nameAr: "تدفق للحلول التقنية",
    balance: 420_000,
    status: "contributing",
    benefitEn: "Earns",
    benefitAr: "يكسب",
    benefitAmount: 1_100,
    color: "from-violet-500 to-violet-600",
  },
  {
    id: "properties",
    nameEn: "Tadfuq Properties",
    nameAr: "تدفق العقارية",
    balance: 170_000,
    status: "borrowing",
    benefitEn: "Saves",
    benefitAr: "يوفر",
    benefitAmount: 2_300,
    color: "from-amber-500 to-amber-600",
  },
];

const POOL_CHART_DATA = [
  { month: "Sep", balance: 3_200_000 },
  { month: "Oct", balance: 3_500_000 },
  { month: "Nov", balance: 3_800_000 },
  { month: "Dec", balance: 4_100_000 },
  { month: "Jan", balance: 4_450_000 },
  { month: "Feb", balance: 4_820_000 },
];

interface OptRow {
  entityEn: string;
  entityAr: string;
  standaloneRate: string;
  poolRate: string;
  balance: number;
  savingsAmount: number;
  highlight?: boolean;
}

const OPT_TABLE: OptRow[] = [
  { entityEn: "HQ", entityAr: "المقر الرئيسي", standaloneRate: "1.5%", poolRate: "2.8%", balance: 2_100_000, savingsAmount: 2_275 },
  { entityEn: "Construction", entityAr: "المقاولات", standaloneRate: "1.2%", poolRate: "2.8%", balance: 1_450_000, savingsAmount: 1_933 },
  { entityEn: "Trading", entityAr: "التجارية", standaloneRate: "1.0%", poolRate: "2.8%", balance: 680_000, savingsAmount: 1_020 },
  { entityEn: "Tech", entityAr: "التقنية", standaloneRate: "0.8%", poolRate: "2.8%", balance: 420_000, savingsAmount: 700 },
  { entityEn: "Properties", entityAr: "العقارية", standaloneRate: "8.0% OD", poolRate: "2.8%", balance: 170_000, savingsAmount: 737, highlight: true },
];

// ── Component ────────────────────────────────────────────────────────────────

export default function CashPoolingPage() {
  const { t, dir } = useI18n();
  const { fmt, fmtAxis, selected: currCode } = useCurrency();
  const isAr = dir === "rtl";

  const [poolType, setPoolType] = useState<"physical" | "notional">("physical");

  return (
    <div dir={dir} className="flex flex-col h-full overflow-y-auto bg-background">
      <div className="max-w-6xl w-full mx-auto px-4 py-8 space-y-6">

        {/* ── 1. Header ──────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 p-2.5 text-white shadow-lg">
              <Layers className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                {isAr ? "إدارة تجميع السيولة" : "Cash Pool Management"}
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                {isAr
                  ? "تحسين السيولة عبر جميع كيانات المجموعة من خلال التجميع"
                  : "Optimize liquidity across all group entities through pooling"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex rounded-lg border bg-muted/50 p-0.5">
              <Button
                size="sm"
                variant={poolType === "physical" ? "default" : "ghost"}
                className="text-xs"
                onClick={() => setPoolType("physical")}
              >
                {isAr ? "تجميع فعلي" : "Physical Pool"}
              </Button>
              <Button
                size="sm"
                variant={poolType === "notional" ? "default" : "ghost"}
                className="text-xs"
                onClick={() => setPoolType("notional")}
              >
                {isAr ? "تجميع اعتباري" : "Notional Pool"}
              </Button>
            </div>
            <Badge variant="secondary" className="gap-1.5 text-xs">
              <Building2 className="h-3 w-3" />
              {isAr ? "٥ كيانات في التجميع" : "5 Entities in Pool"}
            </Badge>
          </div>
        </div>

        {/* ── 2. Pool Summary Hero ────────────────────────────────────────── */}
        <Card className="border-0 bg-gradient-to-br from-indigo-600 via-purple-600 to-fuchsia-600 text-white shadow-xl">
          <CardContent className="py-6 px-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6">
              {[
                {
                  labelEn: "Total Pool Balance",
                  labelAr: "إجمالي رصيد التجميع",
                  value: fmt(4_820_000),
                  icon: Banknote,
                },
                {
                  labelEn: "Interest Savings (MTD)",
                  labelAr: "وفورات الفائدة (الشهر)",
                  value: fmt(12_400),
                  icon: TrendingUp,
                },
                {
                  labelEn: "Borrowing Cost Avoided",
                  labelAr: "تكلفة اقتراض تم تجنبها",
                  value: fmt(8_200),
                  icon: ShieldCheck,
                },
                {
                  labelEn: "Net Pool Benefit",
                  labelAr: "صافي فائدة التجميع",
                  value: fmt(20_600),
                  icon: Zap,
                },
                {
                  labelEn: "Pool Utilization",
                  labelAr: "نسبة استخدام التجميع",
                  value: "78%",
                  valueAr: "٧٨٪",
                  icon: Percent,
                },
              ].map((m) => (
                <div key={m.labelEn} className="space-y-1">
                  <div className="flex items-center gap-1.5 text-white/70 text-xs font-medium">
                    <m.icon className="h-3.5 w-3.5" />
                    {isAr ? m.labelAr : m.labelEn}
                  </div>
                  <p className="text-lg font-bold tracking-tight">
                    {"valueAr" in m ? (isAr ? m.valueAr : m.value) : m.value}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* ── 3. Master Account + 4. Participating Entities ───────────── */}
        <div className="space-y-4">
          {/* Master Account */}
          <Card className="border-2 border-indigo-200 dark:border-indigo-800 bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-950/40 dark:to-background shadow-md">
            <CardContent className="py-5 px-6">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 p-2 shadow-md">
                  <Crown className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-lg">
                      {isAr ? "الحساب الرئيسي" : "Master Account"}
                    </h3>
                    <Badge className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300 text-xs">
                      {isAr ? "المقر الرئيسي" : "HQ"}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {isAr
                      ? "تدفق المقر الرئيسي — QNB حساب الشركات"
                      : "Tadfuq HQ — QNB Corporate"}
                  </p>
                </div>
                <div className={cn("text-right", isAr && "text-left")}>
                  <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                    {fmt(2_100_000)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Visual connector */}
          <div className="flex justify-center">
            <div className="flex flex-col items-center gap-0.5 text-muted-foreground/50">
              <div className="w-px h-4 bg-border" />
              <ArrowDown className="h-4 w-4" />
              <div className="w-px h-4 bg-border" />
            </div>
          </div>

          {/* Participating Entities */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {ENTITIES.map((ent) => (
              <Card
                key={ent.id}
                className="relative overflow-hidden hover:shadow-md transition-shadow"
              >
                <div className={cn(
                  "absolute inset-y-0 w-1 bg-gradient-to-b",
                  ent.color,
                  isAr ? "right-0" : "left-0",
                )} />
                <CardContent className="py-4 px-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate">
                        {isAr ? ent.nameAr : ent.nameEn}
                      </p>
                      <p className="text-lg font-bold mt-0.5">
                        {fmt(ent.balance)}
                      </p>
                    </div>
                    <Badge
                      variant={ent.status === "contributing" ? "default" : "destructive"}
                      className="text-[10px] shrink-0"
                    >
                      {ent.status === "contributing"
                        ? isAr ? "مساهم" : "Contributing"
                        : isAr ? "مقترض" : "Borrowing"}
                    </Badge>
                  </div>
                  <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <ArrowUpRight className="h-3 w-3 text-emerald-500" />
                    <span>
                      {isAr ? ent.benefitAr : ent.benefitEn}:{" "}
                      <span className="font-semibold text-foreground">
                        {fmt(ent.benefitAmount)}/{isAr ? "شهر" : "mo"}
                      </span>
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* ── 5. Pool Balance Over Time ───────────────────────────────── */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">
              {isAr ? "رصيد التجميع عبر الزمن" : "Pool Balance Over Time"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={POOL_CHART_DATA}>
                  <defs>
                    <linearGradient id="poolGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} className="text-muted-foreground" />
                  <YAxis tickFormatter={fmtAxis} tick={{ fontSize: 12 }} className="text-muted-foreground" />
                  <Tooltip
                    formatter={(val: number) => [fmt(val), isAr ? "الرصيد" : "Balance"]}
                    contentStyle={{
                      borderRadius: 8,
                      fontSize: 12,
                      border: "1px solid hsl(var(--border))",
                      background: "hsl(var(--popover))",
                      color: "hsl(var(--popover-foreground))",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="balance"
                    stroke="#6366f1"
                    strokeWidth={2.5}
                    fill="url(#poolGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* ── 6. Interest Optimization Table ──────────────────────────── */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Percent className="h-4 w-4 text-indigo-500" />
              {isAr ? "تحسين الفائدة" : "Interest Optimization"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground text-xs">
                    <th className={cn("py-2 font-medium", isAr ? "text-right" : "text-left")}>
                      {isAr ? "الكيان" : "Entity"}
                    </th>
                    <th className={cn("py-2 font-medium", isAr ? "text-right" : "text-left")}>
                      {isAr ? "المعدل المستقل" : "Standalone Rate"}
                    </th>
                    <th className={cn("py-2 font-medium", isAr ? "text-right" : "text-left")}>
                      {isAr ? "معدل التجميع" : "Pool Rate"}
                    </th>
                    <th className={cn("py-2 font-medium", isAr ? "text-left" : "text-right")}>
                      {isAr ? "الرصيد" : "Balance"}
                    </th>
                    <th className={cn("py-2 font-medium", isAr ? "text-left" : "text-right")}>
                      {isAr ? "الوفر الشهري" : "Monthly Savings"}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {OPT_TABLE.map((row) => (
                    <tr
                      key={row.entityEn}
                      className={cn(
                        "border-b last:border-0",
                        row.highlight && "bg-amber-50/50 dark:bg-amber-950/20",
                      )}
                    >
                      <td className={cn("py-2.5 font-medium", isAr ? "text-right" : "text-left")}>
                        {isAr ? row.entityAr : row.entityEn}
                        {row.highlight && (
                          <span className="ml-1.5 text-[10px] text-amber-600 dark:text-amber-400">
                            ({isAr ? "تجنب السحب على المكشوف" : "avoided overdraft"})
                          </span>
                        )}
                      </td>
                      <td className={cn("py-2.5", isAr ? "text-right" : "text-left")}>
                        {row.standaloneRate}
                      </td>
                      <td className={cn("py-2.5 text-emerald-600 dark:text-emerald-400 font-medium", isAr ? "text-right" : "text-left")}>
                        {row.poolRate}
                      </td>
                      <td className={cn("py-2.5 font-medium", isAr ? "text-left" : "text-right")}>
                        {fmt(row.balance)}
                      </td>
                      <td className={cn("py-2.5 font-semibold text-emerald-600 dark:text-emerald-400", isAr ? "text-left" : "text-right")}>
                        {fmt(row.savingsAmount)}
                      </td>
                    </tr>
                  ))}
                  {/* Total row */}
                  <tr className="border-t-2 font-bold">
                    <td className={cn("py-2.5", isAr ? "text-right" : "text-left")}>
                      {isAr ? "الإجمالي" : "Total"}
                    </td>
                    <td />
                    <td />
                    <td className={cn("py-2.5", isAr ? "text-left" : "text-right")}>
                      {currCode} {fmtAxis(4_820_000)}
                    </td>
                    <td className={cn("py-2.5 text-emerald-600 dark:text-emerald-400", isAr ? "text-left" : "text-right")}>
                      {fmt(6_665)}/{isAr ? "شهر" : "mo"}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* ── 7. Pool Rules & Limits ─────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              icon: ShieldCheck,
              titleEn: "Minimum Balance",
              titleAr: "الحد الأدنى للرصيد",
              value: fmt(50_000),
              valueSuffix: isAr ? "لكل كيان" : "per entity",
              color: "text-blue-500",
            },
            {
              icon: Banknote,
              titleEn: "Max Borrowing Limit",
              titleAr: "حد الاقتراض الأقصى",
              value: fmt(500_000),
              valueSuffix: null,
              color: "text-amber-500",
            },
            {
              icon: Zap,
              titleEn: "Auto-Sweep Threshold",
              titleAr: "حد التحويل التلقائي",
              value: fmt(200_000),
              valueSuffix: null,
              color: "text-emerald-500",
            },
          ].map((rule) => (
            <Card key={rule.titleEn}>
              <CardContent className="py-4 px-5 flex items-center gap-3">
                <rule.icon className={cn("h-5 w-5 shrink-0", rule.color)} />
                <div>
                  <p className="text-xs text-muted-foreground font-medium">
                    {isAr ? rule.titleAr : rule.titleEn}
                  </p>
                  <p className="font-semibold text-sm mt-0.5">
                    {rule.value}{rule.valueSuffix ? ` ${rule.valueSuffix}` : ""}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* ── 8. AI Insight ──────────────────────────────────────────── */}
        <Card className="border-indigo-200 dark:border-indigo-800 bg-gradient-to-br from-indigo-50/50 to-purple-50/30 dark:from-indigo-950/30 dark:to-purple-950/20">
          <CardContent className="py-5 px-6">
            <div className="flex gap-3">
              <div className="rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 p-2 h-fit shadow-md">
                <Bot className="h-4 w-4 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <p className="font-semibold text-sm">
                    {isAr ? "رؤية المتوقّع" : "Mutawaqi Insight"}
                  </p>
                  <Badge variant="secondary" className="text-[10px]">AI</Badge>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {isAr
                    ? `نسبة استخدام التجميع عند ٧٨٪. كيان العقارية يقترض لمدة ٣ أشهر متتالية. يُنصح بضخ رأسمال بمبلغ ${fmt(100_000)} من فائض المقر الرئيسي لتقليل تكاليف الاقتراض بمقدار ${fmt(2_300)} شهرياً.`
                    : `Pool utilization at 78%. Properties entity has been borrowing for 3 consecutive months. Consider a capital injection of ${fmt(100_000)} from HQ surplus to reduce borrowing costs by ${fmt(2_300)}/month.`}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
