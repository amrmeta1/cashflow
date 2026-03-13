"use client";

import { useState } from "react";
import { Send, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/shared/ui/button";
import { Input } from "@/components/shared/ui/input";
import { Label } from "@/components/shared/ui/label";
import { Textarea } from "@/components/shared/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/shared/ui/card";
import { useI18n } from "@/lib/i18n/context";

export default function DemoPage() {
  const { locale } = useI18n();
  const isAr = locale === "ar";

  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    company: "",
    phone: "",
    message: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      setSubmitted(true);
    } catch {
      // fail silently for now
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="py-20">
        <div className="mx-auto max-w-md text-center px-4">
          <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-full bg-green-100 text-green-600 dark:bg-green-950 dark:text-green-400 mb-4">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold mb-2">
            {isAr ? "شكرًا لك!" : "Thank you!"}
          </h1>
          <p className="text-muted-foreground">
            {isAr
              ? "تم استلام طلبك. سيتواصل معك فريقنا خلال يوم عمل واحد."
              : "Your request has been received. Our team will get back to you within one business day."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="py-16">
      <div className="mx-auto max-w-lg px-4">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">
              {isAr ? "اطلب عرضًا تجريبيًا" : "Request a Demo"}
            </CardTitle>
            <CardDescription>
              {isAr
                ? "أخبرنا عن عملك وسنعد لك عرضًا مخصصًا."
                : "Tell us about your business and we'll prepare a personalized demo."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>{isAr ? "الاسم الكامل" : "Full Name"} *</Label>
                <Input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder={isAr ? "أدخل اسمك" : "Enter your name"}
                />
              </div>
              <div>
                <Label>{isAr ? "البريد الإلكتروني" : "Email"} *</Label>
                <Input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder={isAr ? "you@company.com" : "you@company.com"}
                />
              </div>
              <div>
                <Label>{isAr ? "اسم الشركة" : "Company Name"}</Label>
                <Input
                  value={form.company}
                  onChange={(e) => setForm({ ...form, company: e.target.value })}
                  placeholder={isAr ? "اسم شركتك" : "Your company name"}
                />
              </div>
              <div>
                <Label>{isAr ? "رقم الهاتف" : "Phone Number"}</Label>
                <Input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+966 5X XXX XXXX"
                />
              </div>
              <div>
                <Label>{isAr ? "رسالة" : "Message"}</Label>
                <Textarea
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  placeholder={isAr ? "أخبرنا عن احتياجاتك" : "Tell us about your needs"}
                  rows={3}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                <Send className="me-2 h-4 w-4" />
                {loading
                  ? (isAr ? "جاري الإرسال..." : "Sending...")
                  : (isAr ? "إرسال الطلب" : "Submit Request")}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
