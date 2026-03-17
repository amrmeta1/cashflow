"use client";

import {
  Shield,
  Lock,
  Key,
  Eye,
  Server,
  FileCheck,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/shared/ui/card";
import { useI18n } from "@/lib/i18n/context";

const SECURITY_FEATURES = [
  { icon: Lock, title_en: "Encryption at Rest & Transit", title_ar: "تشفير البيانات أثناء التخزين والنقل", desc_en: "All data is encrypted using AES-256 at rest and TLS 1.3 in transit. Bank credentials are stored in HSM-backed vaults.", desc_ar: "جميع البيانات مشفرة باستخدام AES-256 أثناء التخزين و TLS 1.3 أثناء النقل." },
  { icon: Key, title_en: "Access Control", title_ar: "التحكم بالوصول", desc_en: "Multi-tenant architecture with tenant-level data isolation. Role-based access control ready for future authentication integration.", desc_ar: "معمارية متعددة المستأجرين مع عزل البيانات على مستوى المستأجر. نظام صلاحيات جاهز للتكامل المستقبلي." },
  { icon: Eye, title_en: "Audit Logging", title_ar: "سجل المراجعة", desc_en: "Every action is logged with actor, timestamp, IP address, and user agent. Immutable audit trail for compliance.", desc_ar: "يتم تسجيل كل إجراء مع الفاعل والوقت وعنوان IP. سجل مراجعة غير قابل للتغيير." },
  { icon: Server, title_en: "Infrastructure Security", title_ar: "أمان البنية التحتية", desc_en: "Deployed on GCC-region cloud infrastructure. Network isolation, WAF, and DDoS protection enabled.", desc_ar: "منشور على بنية تحتية سحابية في منطقة الخليج مع عزل شبكي وحماية من DDoS." },
  { icon: FileCheck, title_en: "Compliance Ready", title_ar: "جاهز للامتثال", desc_en: "Designed to meet SAMA, QCB, and CBUAE regulatory requirements for financial data handling.", desc_ar: "مصمم لتلبية متطلبات ساما والمركزي القطري والمركزي الإماراتي." },
  { icon: Shield, title_en: "Multi-Tenancy Isolation", title_ar: "عزل متعدد المستأجرين", desc_en: "Complete data isolation between tenants. Row-level security enforced at the database level.", desc_ar: "عزل كامل للبيانات بين المستأجرين مع أمان على مستوى الصفوف في قاعدة البيانات." },
];

export default function SecurityPage() {
  const { locale } = useI18n();
  const isAr = locale === "ar";

  return (
    <div className="py-16">
      <div className="mx-auto max-w-5xl px-4">
        <div className="text-center mb-12">
          <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-xl bg-primary/10 text-primary mb-4">
            <Shield className="h-6 w-6" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold">
            {isAr ? "أمان على مستوى المؤسسات" : "Enterprise-grade Security"}
          </h1>
          <p className="mt-3 text-muted-foreground text-lg max-w-2xl mx-auto">
            {isAr
              ? "بياناتك المالية محمية بأعلى معايير الأمان. مصمم للامتثال التنظيمي في الخليج."
              : "Your financial data is protected with the highest security standards. Built for GCC regulatory compliance."}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {SECURITY_FEATURES.map((feature, i) => {
            const Icon = feature.icon;
            return (
              <Card key={i}>
                <CardHeader>
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary mb-2">
                    <Icon className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-base">
                    {isAr ? feature.title_ar : feature.title_en}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    {isAr ? feature.desc_ar : feature.desc_en}
                  </CardDescription>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
