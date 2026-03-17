"use client";

import { motion } from "framer-motion";
import { ShieldCheck, ArrowRight } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";

// ── Mock stacked bar segments ─────────────────────────────────────────────────

const BAR_SEGMENTS = [
  { color: "bg-emerald-500",   pct: "51.8%" },
  { color: "bg-amber-500/80",  pct: "12.1%" },
  { color: "bg-blue-500/80",   pct: "29.5%" },
  { color: "bg-purple-500/80", pct: "6.6%"  },
];

const MOCK_ROWS = [
  { raw: "POS PUR 0987 STC PAY RIYADH SA", vendor: "STC", cat: "Software",  conf: 97, amt: "-1,250", pos: false },
  { raw: "SADAD BILL 001 KAHRAMAA 00291847", vendor: "Kahramaa", cat: "Utilities", conf: 99, amt: "-3,740", pos: false },
  { raw: "CR NEOM DEV PROJ MILE 3 INV089",  vendor: "NEOM Dev", cat: "Revenue",   conf: 88, amt: "+180,000", pos: true  },
];

// ── Component ────────────────────────────────────────────────────────────────

export function AppPreview() {
  const { locale } = useI18n();
  const isAr = locale === "ar";

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.45 }}
      className="relative mx-auto w-full max-w-5xl mt-20 px-4"
    >
      {/* Outer glow frame */}
      <div className="relative rounded-2xl border border-white/10 bg-zinc-900/50 shadow-[0_0_80px_-20px_rgba(99,102,241,0.35)] backdrop-blur-sm overflow-hidden aspect-[16/9]">

        {/* ── Mock top bar ── */}
        <div className="flex items-center gap-1.5 px-4 py-3 border-b border-white/5">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500/60" />
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500/60" />
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/60" />
          <span className="ms-3 text-[10px] text-zinc-500 font-mono">app.cashflow.ai/dashboard</span>
        </div>

        <div className="p-5 flex flex-col gap-4 overflow-hidden">

          {/* ── Mock SafeCashCard ── */}
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
                <span className="text-xs font-semibold text-white">
                  {isAr ? "رصيد الإنفاق الآمن — AI" : "AI Safe-to-Spend Balance"}
                </span>
              </div>
              <span className="text-[10px] text-zinc-500 tabular-nums">
                {isAr ? "الرصيد الإجمالي: SAR 152,340" : "Gross Balance: SAR 152,340"}
              </span>
            </div>
            <div className="flex items-baseline gap-2 mb-3">
              <span className="text-xs text-zinc-500">SAR</span>
              <span className="text-3xl font-bold tabular-nums tracking-tighter text-white">78,840</span>
              <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                {isAr ? "متاح للعمليات" : "Available for ops"}
              </span>
            </div>
            {/* Stacked bar */}
            <div className="h-2 w-full rounded-full bg-zinc-800 overflow-hidden flex">
              {BAR_SEGMENTS.map((s, i) => (
                <div key={i} className={`h-full ${s.color}`} style={{ width: s.pct }} />
              ))}
            </div>
          </div>

          {/* ── Mock CSV import table ── */}
          <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 border-b border-white/5">
              <span className="text-[10px] font-semibold text-zinc-300">
                {isAr ? "استيراد AI — ٦ معاملات" : "AI Import — 6 transactions"}
              </span>
              <span className="text-[10px] text-emerald-400">98.6% accuracy</span>
            </div>
            <table className="w-full text-[10px]">
              <thead>
                <tr className="border-b border-white/5">
                  {(isAr
                    ? ["النص الخام", "المورد (AI)", "الفئة", "الدقة", "المبلغ"]
                    : ["Raw Bank Text", "AI Vendor", "Category", "Conf.", "Amount"]
                  ).map((h) => (
                    <th key={h} className="px-3 py-1.5 text-start text-zinc-500 font-medium whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {MOCK_ROWS.map((r, i) => (
                  <tr key={i} className="border-b border-white/5 last:border-0">
                    <td className="px-3 py-1.5">
                      <span className="font-mono text-zinc-500 bg-zinc-800 px-1 py-0.5 rounded truncate block max-w-[140px]">{r.raw}</span>
                    </td>
                    <td className="px-3 py-1.5">
                      <div className="flex items-center gap-1">
                        <ArrowRight className="h-2.5 w-2.5 text-primary shrink-0" />
                        <span className="font-semibold text-white">{r.vendor}</span>
                      </div>
                    </td>
                    <td className="px-3 py-1.5">
                      <span className="border border-white/10 text-zinc-300 px-1.5 py-0.5 rounded text-[9px]">{r.cat}</span>
                    </td>
                    <td className="px-3 py-1.5">
                      <div className="flex items-center gap-1">
                        <span className={`w-1.5 h-1.5 rounded-full ${r.conf >= 95 ? "bg-emerald-500" : "bg-amber-500"}`} />
                        <span className="tabular-nums text-zinc-400">{r.conf}%</span>
                      </div>
                    </td>
                    <td className="px-3 py-1.5 text-end">
                      <span className={`tabular-nums font-semibold ${r.pos ? "text-emerald-400" : "text-rose-400"}`}>{r.amt}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>

        {/* Bottom fade mask */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-zinc-950 to-transparent"
        />
      </div>
    </motion.div>
  );
}
