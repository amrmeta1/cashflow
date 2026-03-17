"use client";

import { useState } from "react";
import {
  ShieldCheck, Monitor, Globe, Key, LogOut,
  Plus, Trash2, AlertTriangle, ExternalLink, ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/shared/ui/button";
import { Switch } from "@/components/shared/ui/switch";
import { Input } from "@/components/shared/ui/input";
import { Skeleton } from "@/components/shared/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  useSecurity,
  useRevokeSession,
  useRevokeAllSessions,
  useToggleMfa,
  useUpdateDomains,
} from "./hooks";
import Link from "next/link";

function relativeTime(iso: string, isAr: boolean): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d > 0) return isAr ? `منذ ${d} يوم` : `${d}d ago`;
  if (h > 0) return isAr ? `منذ ${h} ساعة` : `${h}h ago`;
  if (m > 0) return isAr ? `منذ ${m} دقيقة` : `${m}m ago`;
  return isAr ? "الآن" : "now";
}

interface SecurityPageContentProps {
  tenantId?: string;
  isAr: boolean;
  /** Whether the current user has the tenant_admin role */
  isAdmin: boolean;
}

export function SecurityPageContent({
  tenantId,
  isAr,
  isAdmin,
}: SecurityPageContentProps) {
  const { data: security, isLoading } = useSecurity(tenantId);
  const { mutate: revokeSession, isPending: isRevoking, variables: revokingId } =
    useRevokeSession(tenantId);
  const { mutate: revokeAll, isPending: isRevokingAll } = useRevokeAllSessions(tenantId);
  const { mutate: toggleMfa } = useToggleMfa(tenantId);
  const { mutate: updateDomains } = useUpdateDomains(tenantId);

  const [newDomain, setNewDomain] = useState("");

  // ── RBAC gate ──────────────────────────────────────────────────────────
  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-muted-foreground p-6">
        <ShieldAlert className="h-8 w-8 opacity-40" />
        <p className="text-sm font-medium">
          {isAr
            ? "هذه الصفحة مخصصة لمسؤولي المستأجر فقط."
            : "This page is restricted to tenant admins."}
        </p>
        <p className="text-xs text-center max-w-xs">
          {isAr
            ? "تواصل مع مسؤول حسابك للحصول على الصلاحيات اللازمة."
            : "Contact your account administrator to request access."}
        </p>
      </div>
    );
  }

  const addDomain = () => {
    const trimmed = newDomain.trim().toLowerCase();
    if (!trimmed || security?.allowed_domains.includes(trimmed)) return;
    updateDomains([...(security?.allowed_domains ?? []), trimmed]);
    setNewDomain("");
  };

  const removeDomain = (domain: string) => {
    updateDomains((security?.allowed_domains ?? []).filter((d) => d !== domain));
  };

  return (
    <div className="p-6 space-y-8 max-w-3xl">
      {/* ── Active Sessions ── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {isAr ? "الجلسات النشطة" : "Active Sessions"}
          </p>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
            disabled={isRevokingAll}
            onClick={() => revokeAll()}
          >
            {isAr ? "إلغاء جميع الجلسات الأخرى" : "Revoke all other sessions"}
          </Button>
        </div>

        <div className="rounded-md border overflow-hidden">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : (
            <div className="divide-y">
              {security?.sessions.map((session) => (
                <div key={session.id} className="flex items-center gap-4 px-4 py-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted">
                    <Monitor className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium">{session.device}</p>
                      {session.current && (
                        <span className="inline-flex items-center rounded bg-primary/10 text-primary px-1.5 py-0.5 text-xs font-medium">
                          {isAr ? "الجلسة الحالية" : "Current"}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {session.browser} · {session.ip} · {session.location} ·{" "}
                      {relativeTime(session.last_active_at, isAr)}
                    </p>
                  </div>
                  {!session.current && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs gap-1 text-destructive hover:bg-destructive/10 shrink-0"
                      disabled={isRevoking && revokingId === session.id}
                      onClick={() => revokeSession(session.id)}
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      {isAr ? "إلغاء" : "Revoke"}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Two-Factor Authentication ── */}
      <section>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          {isAr ? "المصادقة الثنائية" : "Two-Factor Authentication"}
        </p>
        <div className="rounded-md border bg-card p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted mt-0.5">
                <Key className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium">
                  {isAr ? "المصادقة الثنائية (2FA)" : "Two-Factor Authentication (2FA)"}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {isAr
                    ? "إضافة طبقة أمان إضافية باستخدام تطبيق المصادقة أو الرسائل النصية."
                    : "Add an extra layer of security using an authenticator app or SMS."}
                </p>
                {!security?.mfa_enabled && (
                  <div className="flex items-center gap-1.5 mt-2 text-xs text-amber-600">
                    <AlertTriangle className="h-3 w-3" />
                    {isAr
                      ? "يُوصى بتفعيل المصادقة الثنائية"
                      : "2FA is recommended for your account"}
                  </div>
                )}
              </div>
            </div>
            {isLoading ? (
              <Skeleton className="h-5 w-9 rounded-full" />
            ) : (
              <Switch
                checked={security?.mfa_enabled ?? false}
                onCheckedChange={(v) => toggleMfa(v)}
                aria-label={isAr ? "تفعيل/تعطيل المصادقة الثنائية" : "Toggle 2FA"}
              />
            )}
          </div>
        </div>
      </section>

      {/* ── Allowed Email Domains ── */}
      <section>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          {isAr ? "النطاقات المسموح بها" : "Allowed Email Domains"}
        </p>
        <div className="rounded-md border bg-card p-4 space-y-3">
          <p className="text-xs text-muted-foreground">
            {isAr
              ? "يمكن فقط للمستخدمين الذين لديهم عناوين بريد إلكتروني من هذه النطاقات الانضمام إلى مؤسستك."
              : "Only users with email addresses from these domains can join your organization."}
          </p>

          {/* Domain chips */}
          <div className="flex flex-wrap gap-2 min-h-[2rem]">
            {isLoading ? (
              <Skeleton className="h-7 w-32 rounded-md" />
            ) : (
              security?.allowed_domains.map((domain) => (
                <div
                  key={domain}
                  className="flex items-center gap-1.5 rounded-md border bg-muted px-2.5 py-1 text-xs"
                >
                  <Globe className="h-3 w-3 text-muted-foreground" />
                  {domain}
                  <button
                    onClick={() => removeDomain(domain)}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                    aria-label={`Remove ${domain}`}
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Add domain */}
          <div className="flex gap-2">
            <Input
              className="h-8 text-xs flex-1"
              placeholder={
                isAr ? "أضف نطاقًا (مثال: company.com)" : "Add domain (e.g. company.com)"
              }
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.preventDefault(); addDomain(); }
              }}
            />
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs gap-1"
              disabled={!newDomain.trim()}
              onClick={addDomain}
            >
              <Plus className="h-3.5 w-3.5" />
              {isAr ? "إضافة" : "Add"}
            </Button>
          </div>
        </div>
      </section>

      {/* ── Audit log link ── */}
      <section>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          {isAr ? "سجل المراجعة" : "Audit Log"}
        </p>
        <div className="rounded-md border bg-card p-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium">
              {isAr ? "عرض سجل الأحداث الأمنية" : "View security event log"}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isAr
                ? "تتبع جميع إجراءات المستخدمين والأحداث الأمنية في مؤسستك."
                : "Track all user actions and security events across your organization."}
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs gap-1 shrink-0"
            asChild
          >
            <Link href="/settings/audit-logs">
              <ExternalLink className="h-3.5 w-3.5" />
              {isAr ? "فتح السجل" : "Open Log"}
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
