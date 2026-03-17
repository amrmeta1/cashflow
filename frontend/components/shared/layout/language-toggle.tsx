"use client";

import { Globe } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";
import { Button } from "@/components/shared/ui/button";

export function LanguageToggle() {
  const { locale, setLocale } = useI18n();

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setLocale(locale === "en" ? "ar" : "en")}
      className="gap-1.5"
    >
      <Globe className="h-4 w-4" />
      <span className="text-xs font-medium">
        {locale === "en" ? "العربية" : "English"}
      </span>
    </Button>
  );
}
