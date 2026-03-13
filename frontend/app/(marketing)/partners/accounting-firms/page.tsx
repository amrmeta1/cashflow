"use client";

import Link from "next/link";
import {
  Building2,
  Users,
  BarChart3,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/shared/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/shared/ui/card";
import { useI18n } from "@/lib/i18n/context";

export default function PartnersPage() {
  const { locale } = useI18n();
  const isAr = locale === "ar";

  const benefits = isAr
    ? [
        "وحدة تحكم موحدة لإدارة جميع عملائك",
        "تقارير شهرية تلقائية جاهزة للعملاء",
        "تنبيهات استباقية لمشاكل تدفق عملائك",
        "برنامج خصم خاص بشركات المحاسبة",
        "تكامل مع Zoho و Wafeq و QuickBooks",
        "دعم فني مخصص وأولوية",
      ]
    : [
        "Single dashboard to manage all your clients",
        "Auto-generated monthly reports ready for clients",
        "Proactive alerts for client cash flow issues",
        "Special partner pricing program",
        "Integration with Zoho, Wafeq, and QuickBooks",
        "Dedicated partner support and priority access",
      ];

  return (
    <div className="py-16">
      <div className="mx-auto max-w-5xl px-4">
        {/* Hero */}
        <div className="text-center mb-16">
          <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-xl bg-primary/10 text-primary mb-4">
            <Building2 className="h-6 w-6" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold">
            {isAr
              ? "برنامج شركاء CashFlow.ai لشركات المحاسبة"
              : "CashFlow.ai Partner Program for Accounting Firms"}
          </h1>
          <p className="mt-3 text-muted-foreground text-lg max-w-2xl mx-auto">
            {isAr
              ? "قدم خدمات إدارة التدفق النقدي الذكية لعملائك. زد إيراداتك مع CashFlow.ai."
              : "Offer intelligent cash flow management to your clients. Grow your revenue with CashFlow.ai."}
          </p>
          <div className="mt-8">
            <Button size="lg" asChild>
              <Link href="/demo">
                {isAr ? "انضم للبرنامج" : "Join the Program"}
                <ArrowRight className="ms-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          {[
            { icon: Users, stat: "50+", label_en: "Partner Firms", label_ar: "شركة شريكة" },
            { icon: BarChart3, stat: "500+", label_en: "Managed Clients", label_ar: "عميل مُدار" },
            { icon: Building2, stat: "3", label_en: "GCC Countries", label_ar: "دول خليجية" },
          ].map((item, i) => {
            const Icon = item.icon;
            return (
              <Card key={i} className="text-center">
                <CardContent className="pt-6">
                  <Icon className="h-8 w-8 mx-auto text-primary mb-2" />
                  <p className="text-3xl font-bold">{item.stat}</p>
                  <p className="text-sm text-muted-foreground">
                    {isAr ? item.label_ar : item.label_en}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Benefits */}
        <Card>
          <CardHeader>
            <CardTitle>
              {isAr ? "مزايا البرنامج" : "Partner Benefits"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {benefits.map((benefit, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                  {benefit}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
