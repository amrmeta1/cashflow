"use client";

import { Shield, Key, Activity, Lock } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/shared/ui/card";
import { Badge } from "@/components/shared/ui/badge";

export default function SecurityPage() {
  const { locale } = useI18n();
  const isAr = locale === "ar";

  const sections = [
    {
      title: isAr ? "البنية التحتية" : "Architecture",
      icon: Shield,
      items: isAr ? [
        "عزل متعدد المستأجرين مع مخططات قاعدة بيانات مخصصة",
        "تشفير شامل للبيانات أثناء النقل (TLS 1.3)",
        "بنية الخدمات الصغيرة لقابلية التوسع",
        "نشر سحابي أصلي على بنية تحتية للمؤسسات",
        "تصميم يعتمد على API مع نقاط نهاية RESTful",
        "بنية موجهة بالأحداث للتحديثات الفورية",
      ] : [
        "Multi-tenant isolation with dedicated database schemas",
        "End-to-end encryption for data in transit (TLS 1.3)",
        "Microservices architecture for scalability",
        "Cloud-native deployment on enterprise infrastructure",
        "API-first design with RESTful endpoints",
        "Event-driven architecture for real-time updates",
      ],
    },
    {
      title: isAr ? "التحكم في الوصول" : "Access Control",
      icon: Key,
      items: isAr ? [
        "التحكم في الوصول القائم على الأدوار (RBAC) مع أذونات دقيقة",
        "دعم المصادقة متعددة العوامل (MFA)",
        "تكامل تسجيل الدخول الموحد (SSO) عبر OAuth 2.0 / OIDC",
        "إدارة الجلسات مع انتهاء تلقائي",
        "القائمة البيضاء لعناوين IP لتعزيز الأمان",
        "تسجيل المراجعة لجميع أحداث الوصول",
      ] : [
        "Role-based access control (RBAC) with granular permissions",
        "Multi-factor authentication (MFA) support",
        "Single sign-on (SSO) integration via OAuth 2.0 / OIDC",
        "Session management with automatic timeout",
        "IP whitelisting for enhanced security",
        "Audit logging for all access events",
      ],
    },
    {
      title: isAr ? "المراقبة والموثوقية" : "Monitoring & Reliability",
      icon: Activity,
      items: isAr ? [
        "المراقبة والتنبيه في الوقت الفعلي",
        "اتفاقية مستوى الخدمة 99.9٪ مع التكرار",
        "التبديل التلقائي والتعافي من الكوارث",
        "مقاييس الأداء وفحوصات الصحة",
        "التتبع الموزع لتصحيح الأخطاء",
        "عمليات تدقيق أمنية منتظمة واختبار الاختراق",
      ] : [
        "Real-time monitoring and alerting",
        "99.9% uptime SLA with redundancy",
        "Automated failover and disaster recovery",
        "Performance metrics and health checks",
        "Distributed tracing for debugging",
        "Regular security audits and penetration testing",
      ],
    },
    {
      title: isAr ? "حماية البيانات" : "Data Protection",
      icon: Lock,
      items: isAr ? [
        "تشفير البيانات أثناء الراحة (AES-256)",
        "نسخ احتياطية تلقائية منتظمة مع استرداد نقطة زمنية",
        "الامتثال للائحة العامة لحماية البيانات (GDPR) وخصوصية البيانات",
        "خيارات إقامة البيانات للمتطلبات الإقليمية",
        "سياسات حذف البيانات والاحتفاظ بها بشكل آمن",
        "شهادات أمان من جهات خارجية (SOC 2، ISO 27001)",
      ] : [
        "Data encryption at rest (AES-256)",
        "Regular automated backups with point-in-time recovery",
        "GDPR and data privacy compliance",
        "Data residency options for regional requirements",
        "Secure data deletion and retention policies",
        "Third-party security certifications (SOC 2, ISO 27001)",
      ],
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">
          {isAr ? "الأمان والامتثال" : "Security & Compliance"}
        </h1>
        <Badge variant="outline" className="text-xs">
          {isAr ? "بنية جاهزة للمؤسسات" : "Enterprise-ready architecture"}
        </Badge>
      </div>

      <div className="grid gap-6">
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <Card key={section.title} className="shadow-sm border-border/50">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Icon className="h-5 w-5 text-muted-foreground" />
                  <CardTitle className="text-base font-semibold">
                    {section.title}
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {section.items.map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-primary mt-1.5">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
