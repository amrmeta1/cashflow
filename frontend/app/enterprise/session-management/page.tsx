"use client";

import { useState } from "react";
import {
  Monitor,
  Smartphone,
  Tablet,
  Laptop,
  Globe,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Key,
  LogIn,
  LogOut,
  Lock,
  Plug,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Bot,
  Fingerprint,
  Bell,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/shared/ui/card";
import { Badge } from "@/components/shared/ui/badge";
import { Button } from "@/components/shared/ui/button";
import { Switch } from "@/components/shared/ui/switch";
import { useI18n } from "@/lib/i18n/context";
import { useCompany } from "@/contexts/CompanyContext";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Session {
  id: string;
  deviceEn: string;
  deviceAr: string;
  browser: string;
  locationEn: string;
  locationAr: string;
  ip: string;
  loginTimeEn: string;
  loginTimeAr: string;
  isCurrent: boolean;
  isApi?: boolean;
  warn?: boolean;
}

interface SecurityEvent {
  id: string;
  timeEn: string;
  timeAr: string;
  icon: "success" | "expired" | "failed" | "password" | "2fa" | "api";
  descEn: string;
  descAr: string;
  deviceEn?: string;
  deviceAr?: string;
  locationEn?: string;
  locationAr?: string;
  blocked?: boolean;
}

interface TrustedDevice {
  id: string;
  nameEn: string;
  nameAr: string;
  trusted: boolean;
}

// ── Mock Data ─────────────────────────────────────────────────────────────────

const SESSIONS: Session[] = [
  {
    id: "s1",
    deviceEn: "MacBook Pro",
    deviceAr: "ماك بوك برو",
    browser: "Chrome 122",
    locationEn: "Riyadh, SA",
    locationAr: "الرياض، السعودية",
    ip: "192.168.1.***",
    loginTimeEn: "Today 08:15 AM",
    loginTimeAr: "اليوم ٨:١٥ ص",
    isCurrent: true,
  },
  {
    id: "s2",
    deviceEn: "iPhone 15 Pro",
    deviceAr: "آيفون ١٥ برو",
    browser: "Safari",
    locationEn: "Riyadh, SA",
    locationAr: "الرياض، السعودية",
    ip: "10.0.0.***",
    loginTimeEn: "Today 07:30 AM",
    loginTimeAr: "اليوم ٧:٣٠ ص",
    isCurrent: false,
  },
  {
    id: "s3",
    deviceEn: "iPad Air",
    deviceAr: "آيباد إير",
    browser: "Safari",
    locationEn: "Jeddah, SA",
    locationAr: "جدة، السعودية",
    ip: "172.16.0.***",
    loginTimeEn: "Yesterday 18:00",
    loginTimeAr: "أمس ١٨:٠٠",
    isCurrent: false,
  },
  {
    id: "s4",
    deviceEn: "Windows PC",
    deviceAr: "ويندوز PC",
    browser: "Edge",
    locationEn: "Dubai, UAE",
    locationAr: "دبي، الإمارات",
    ip: "85.12.***",
    loginTimeEn: "2 days ago",
    loginTimeAr: "منذ يومين",
    isCurrent: false,
    warn: true,
  },
  {
    id: "s5",
    deviceEn: "API Token",
    deviceAr: "رمز API",
    browser: "Postman",
    locationEn: "Auto",
    locationAr: "تلقائي",
    ip: "—",
    loginTimeEn: "5 days ago",
    loginTimeAr: "منذ ٥ أيام",
    isCurrent: false,
    isApi: true,
  },
];

const SECURITY_EVENTS: SecurityEvent[] = [
  { id: "e1", timeEn: "Today 08:15", timeAr: "اليوم ٨:١٥", icon: "success", descEn: "Login success", descAr: "تسجيل دخول ناجح", deviceEn: "MacBook Pro", deviceAr: "ماك بوك برو", locationEn: "Riyadh", locationAr: "الرياض" },
  { id: "e2", timeEn: "Today 07:30", timeAr: "اليوم ٧:٣٠", icon: "success", descEn: "Login success", descAr: "تسجيل دخول ناجح", deviceEn: "iPhone", deviceAr: "آيفون", locationEn: "Riyadh", locationAr: "الرياض" },
  { id: "e3", timeEn: "Yesterday 22:00", timeAr: "أمس ٢٢:٠٠", icon: "expired", descEn: "Session expired", descAr: "انتهت صلاحية الجلسة", deviceEn: "Windows PC", deviceAr: "ويندوز PC", locationEn: "Dubai", locationAr: "دبي" },
  { id: "e4", timeEn: "Yesterday 18:00", timeAr: "أمس ١٨:٠٠", icon: "success", descEn: "Login success", descAr: "تسجيل دخول ناجح", deviceEn: "iPad", deviceAr: "آيباد", locationEn: "Jeddah", locationAr: "جدة" },
  { id: "e5", timeEn: "2 days ago", timeAr: "منذ يومين", icon: "failed", descEn: "Failed login attempt", descAr: "محاولة دخول فاشلة", deviceEn: "Unknown", deviceAr: "غير معروف", locationEn: "Istanbul, TR", locationAr: "إسطنبول، تركيا", blocked: true },
  { id: "e6", timeEn: "2 days ago", timeAr: "منذ يومين", icon: "success", descEn: "Login success", descAr: "تسجيل دخول ناجح", deviceEn: "Windows PC", deviceAr: "ويندوز PC", locationEn: "Dubai", locationAr: "دبي" },
  { id: "e7", timeEn: "3 days ago", timeAr: "منذ ٣ أيام", icon: "password", descEn: "Password changed", descAr: "تم تغيير كلمة المرور", deviceEn: "MacBook Pro", deviceAr: "ماك بوك برو" },
  { id: "e8", timeEn: "4 days ago", timeAr: "منذ ٤ أيام", icon: "2fa", descEn: "2FA enabled", descAr: "تفعيل المصادقة الثنائية", deviceEn: "MacBook Pro", deviceAr: "ماك بوك برو" },
  { id: "e9", timeEn: "5 days ago", timeAr: "منذ ٥ أيام", icon: "api", descEn: "API token created — \"Treasury API\"", descAr: "إنشاء رمز API — \"واجهة الخزينة\"" },
  { id: "e10", timeEn: "7 days ago", timeAr: "منذ ٧ أيام", icon: "success", descEn: "Login success", descAr: "تسجيل دخول ناجح", deviceEn: "MacBook Pro", deviceAr: "ماك بوك برو", locationEn: "Riyadh", locationAr: "الرياض" },
];

const TRUSTED_DEVICES: TrustedDevice[] = [
  { id: "d1", nameEn: "MacBook Pro", nameAr: "ماك بوك برو", trusted: true },
  { id: "d2", nameEn: "iPhone 15 Pro", nameAr: "آيفون ١٥ برو", trusted: true },
  { id: "d3", nameEn: "iPad Air", nameAr: "آيباد إير", trusted: true },
  { id: "d4", nameEn: "Windows PC", nameAr: "ويندوز PC", trusted: false },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function DeviceIcon({ device, className }: { device: string; className?: string }) {
  const lower = device.toLowerCase();
  if (lower.includes("iphone") || lower.includes("آيفون")) return <Smartphone className={className} />;
  if (lower.includes("ipad") || lower.includes("آيباد")) return <Tablet className={className} />;
  if (lower.includes("api") || lower.includes("رمز")) return <Plug className={className} />;
  if (lower.includes("macbook") || lower.includes("ماك")) return <Laptop className={className} />;
  return <Monitor className={className} />;
}

function EventIcon({ type }: { type: SecurityEvent["icon"] }) {
  switch (type) {
    case "success":
      return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
    case "expired":
      return <Lock className="h-4 w-4 text-muted-foreground" />;
    case "failed":
      return <XCircle className="h-4 w-4 text-red-500" />;
    case "password":
      return <Key className="h-4 w-4 text-blue-500" />;
    case "2fa":
      return <Fingerprint className="h-4 w-4 text-indigo-500" />;
    case "api":
      return <Plug className="h-4 w-4 text-purple-500" />;
  }
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SessionsPage() {
  const { locale, dir } = useI18n();
  const isAr = locale === "ar";
  useCompany();

  const [terminated, setTerminated] = useState<Set<string>>(new Set());

  const currentSession = SESSIONS.find((s) => s.isCurrent)!;
  const otherSessions = SESSIONS.filter((s) => !s.isCurrent);

  return (
    <div dir={dir} className="flex flex-col h-full overflow-y-auto bg-background">
      <div className="max-w-6xl w-full mx-auto px-4 py-8 space-y-6">

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
              <Monitor className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">
                {isAr ? "إدارة الجلسات" : "Session Management"}
              </h1>
              <p className="text-sm text-muted-foreground">
                {isAr
                  ? "مراقبة الجلسات النشطة وإدارة الوصول من الأجهزة"
                  : "Monitor active sessions and manage device access"}
              </p>
            </div>
          </div>
          <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-sm px-4 py-1.5 gap-2">
            <ShieldCheck className="h-4 w-4" />
            SOC 2 {isAr ? "متوافق" : "Compliant"}
          </Badge>
        </div>

        {/* ── Current Session ── */}
        <Card className="border-primary/30 bg-gradient-to-br from-primary/5 via-background to-background">
          <CardContent className="p-5">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 shrink-0">
                <DeviceIcon device={currentSession.deviceEn} className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base font-semibold">
                    {isAr ? currentSession.deviceAr : currentSession.deviceEn}
                  </h2>
                  <Badge className="bg-primary/10 text-primary border-primary/30 text-xs">
                    {isAr ? "الجلسة الحالية" : "Current Session"}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 mt-1.5 flex-wrap text-sm text-muted-foreground">
                  <span>{currentSession.browser}</span>
                  <span>·</span>
                  <span className="flex items-center gap-1">
                    <Globe className="h-3.5 w-3.5" />
                    {isAr ? currentSession.locationAr : currentSession.locationEn}
                  </span>
                  <span>·</span>
                  <span>IP: {currentSession.ip}</span>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    {isAr ? currentSession.loginTimeAr : currentSession.loginTimeEn}
                  </span>
                  <span className="relative flex h-2 w-2 ms-1">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                  </span>
                  <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                    {isAr ? "نشطة" : "Active"}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Active Sessions ── */}
        <div>
          <h2 className="text-sm font-semibold mb-3">
            {isAr ? "الجلسات النشطة" : "Active Sessions"}
            <span className="text-muted-foreground font-normal ms-2">({otherSessions.length})</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {otherSessions.map((session) => (
              <Card
                key={session.id}
                className={cn(
                  "transition-all",
                  terminated.has(session.id) && "opacity-40",
                  session.warn && !terminated.has(session.id) && "border-amber-500/30",
                )}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-lg shrink-0",
                      session.warn ? "bg-amber-500/10" : session.isApi ? "bg-purple-500/10" : "bg-muted",
                    )}>
                      <DeviceIcon
                        device={session.deviceEn}
                        className={cn(
                          "h-5 w-5",
                          session.warn ? "text-amber-500" : session.isApi ? "text-purple-500" : "text-muted-foreground",
                        )}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold truncate">
                          {isAr ? session.deviceAr : session.deviceEn}
                        </p>
                        {session.warn && (
                          <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {session.browser} · {isAr ? session.locationAr : session.locationEn}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        IP: {session.ip} · {isAr ? session.loginTimeAr : session.loginTimeEn}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className={cn(
                        "h-8 text-xs shrink-0",
                        terminated.has(session.id)
                          ? "border-muted text-muted-foreground"
                          : "border-red-500/30 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/20",
                      )}
                      disabled={terminated.has(session.id)}
                      onClick={() => setTerminated((prev) => new Set(prev).add(session.id))}
                    >
                      {terminated.has(session.id)
                        ? isAr ? "تم الإنهاء" : "Terminated"
                        : session.isApi
                          ? isAr ? "إلغاء" : "Revoke"
                          : isAr ? "إنهاء" : "Terminate"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* ── Security Events Timeline ── */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-sm font-semibold">
                {isAr ? "أحداث الأمان" : "Security Events Timeline"}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <div className="absolute top-0 bottom-0 start-[19px] w-px bg-border" />
              <div className="space-y-0">
                {SECURITY_EVENTS.map((event) => (
                  <div key={event.id} className="relative flex items-start gap-4 py-2.5">
                    <div className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full bg-background border border-border shrink-0">
                      <EventIcon type={event.icon} />
                    </div>
                    <div className="flex-1 min-w-0 pt-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium">{isAr ? event.descAr : event.descEn}</p>
                        {event.blocked && (
                          <Badge className="bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30 text-[10px]">
                            {isAr ? "محظور" : "Blocked"}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5 flex-wrap">
                        <span>{isAr ? event.timeAr : event.timeEn}</span>
                        {event.deviceEn && (
                          <>
                            <span>·</span>
                            <span>{isAr ? event.deviceAr : event.deviceEn}</span>
                          </>
                        )}
                        {event.locationEn && (
                          <>
                            <span>·</span>
                            <span>{isAr ? event.locationAr : event.locationEn}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Security Settings ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500/10">
                    <Fingerprint className="h-4.5 w-4.5 text-indigo-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      {isAr ? "المصادقة الثنائية" : "Two-Factor Auth"}
                    </p>
                    <p className="text-xs text-muted-foreground">TOTP</p>
                  </div>
                </div>
                <Switch defaultChecked />
              </div>
              <Badge className="mt-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px]">
                <CheckCircle2 className="h-3 w-3 me-1" />
                {isAr ? "مفعّل" : "Enabled"}
              </Badge>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10">
                    <Clock className="h-4.5 w-4.5 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      {isAr ? "مهلة الجلسة" : "Session Timeout"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {isAr ? "٤ ساعات" : "4 hours"}
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-3 h-1.5 rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full bg-amber-500 transition-all" style={{ width: "50%" }} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10">
                    <Bell className="h-4.5 w-4.5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      {isAr ? "إشعارات الدخول" : "Login Notifications"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {isAr ? "بريد + إشعار" : "Email + Push"}
                    </p>
                  </div>
                </div>
                <Switch defaultChecked />
              </div>
              <Badge className="mt-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px]">
                <CheckCircle2 className="h-3 w-3 me-1" />
                {isAr ? "مفعّل" : "Enabled"}
              </Badge>
            </CardContent>
          </Card>
        </div>

        {/* ── Device Trust ── */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-sm font-semibold">
                {isAr ? "ثقة الأجهزة" : "Device Trust"}
              </CardTitle>
            </div>
            <p className="text-xs text-muted-foreground">
              {isAr
                ? `${TRUSTED_DEVICES.filter((d) => d.trusted).length} أجهزة موثوقة · ${TRUSTED_DEVICES.filter((d) => !d.trusted).length} غير موثوق`
                : `${TRUSTED_DEVICES.filter((d) => d.trusted).length} Trusted · ${TRUSTED_DEVICES.filter((d) => !d.trusted).length} Untrusted`}
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {TRUSTED_DEVICES.map((device) => (
                <div key={device.id} className="flex items-center gap-3 rounded-lg border border-border/50 px-4 py-3">
                  <DeviceIcon device={device.nameEn} className="h-4.5 w-4.5 text-muted-foreground" />
                  <span className="text-sm font-medium flex-1">{isAr ? device.nameAr : device.nameEn}</span>
                  {device.trusted ? (
                    <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-xs gap-1">
                      <ShieldCheck className="h-3 w-3" />
                      {isAr ? "موثوق" : "Trusted"}
                    </Badge>
                  ) : (
                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1">
                      <ShieldAlert className="h-3 w-3" />
                      {isAr ? "توثيق هذا الجهاز" : "Trust this device"}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* ── AI Security Alert ── */}
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background">
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 ring-2 ring-primary/20 shrink-0 mt-0.5">
                <Bot className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold">
                  {isAr ? "تنبيه أمني من رقيب" : "Security Alert from Raqib"}
                </p>
                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                  {isAr
                    ? "تم حظر محاولة تسجيل دخول من إسطنبول. إذا لم تكن أنت، ننصحك بتغيير كلمة المرور. جميع الجلسات الأخرى من مواقعك المعتادة."
                    : "Login attempt from Istanbul was blocked. If this wasn't you, consider changing your password. All other sessions are from your usual locations."}
                </p>
                <div className="flex items-center gap-2 mt-3">
                  <Button size="sm" className="h-7 text-xs gap-1">
                    <Key className="h-3 w-3" />
                    {isAr ? "تغيير كلمة المرور" : "Change Password"}
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1">
                    <LogOut className="h-3 w-3" />
                    {isAr ? "إنهاء جميع الجلسات" : "Terminate All Sessions"}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
