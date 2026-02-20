"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";

// ── Country → Financial Ecosystem mapping ─────────────────────────────────────

export type CountryCode = "QA" | "SA" | "AE";

export interface CountryProfile {
  currency: string;
  currencySymbol: string;
  taxAuthority: string;
  taxAuthorityAr: string;
  flag: string;
  nameEn: string;
  nameAr: string;
}

export const COUNTRY_PROFILES: Record<CountryCode, CountryProfile> = {
  QA: {
    currency: "QAR",
    currencySymbol: "ر.ق",
    taxAuthority: "GTA",
    taxAuthorityAr: "الهيئة العامة للضرائب",
    flag: "🇶🇦",
    nameEn: "Qatar",
    nameAr: "قطر",
  },
  SA: {
    currency: "SAR",
    currencySymbol: "ر.س",
    taxAuthority: "ZATCA",
    taxAuthorityAr: "هيئة الزكاة والضريبة والجمارك",
    flag: "🇸🇦",
    nameEn: "Saudi Arabia",
    nameAr: "السعودية",
  },
  AE: {
    currency: "AED",
    currencySymbol: "د.إ",
    taxAuthority: "FTA",
    taxAuthorityAr: "الهيئة الاتحادية للضرائب",
    flag: "🇦🇪",
    nameEn: "UAE",
    nameAr: "الإمارات",
  },
};

// ── Types ─────────────────────────────────────────────────────────────────────

export type CompanySize = "startup" | "sme" | "enterprise";

export interface CompanyProfile {
  companyName: string;
  country: CountryCode | "";
  currency: string;
  currencySymbol: string;
  taxAuthority: string;
  taxAuthorityAr: string;
  companySize: CompanySize | "";
  isConfigured: boolean;
}

interface CompanyContextValue {
  profile: CompanyProfile;
  isHydrated: boolean;
  updateCompanyProfile: (updates: Partial<CompanyProfile>) => void;
  setCountry: (code: CountryCode) => void;
  resetProfile: () => void;
}

// ── Defaults ──────────────────────────────────────────────────────────────────

const DEFAULT_PROFILE: CompanyProfile = {
  companyName: "",
  country: "",
  currency: "SAR",
  currencySymbol: "ر.س",
  taxAuthority: "ZATCA",
  taxAuthorityAr: "هيئة الزكاة والضريبة والجمارك",
  companySize: "",
  isConfigured: false,
};

const STORAGE_KEY = "cashflow_company_profile";

function loadFromStorage(): CompanyProfile {
  if (typeof window === "undefined") return DEFAULT_PROFILE;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PROFILE;
    return { ...DEFAULT_PROFILE, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_PROFILE;
  }
}

function saveToStorage(profile: CompanyProfile) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch {
    // ignore quota errors
  }
}

// ── Context ───────────────────────────────────────────────────────────────────

const CompanyContext = createContext<CompanyContextValue | null>(null);

export function CompanyProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<CompanyProfile>(DEFAULT_PROFILE);
  const [isHydrated, setIsHydrated] = useState(false);

  // Hydrate from localStorage on mount (client-only)
  useEffect(() => {
    setProfile(loadFromStorage());
    setIsHydrated(true);
  }, []);

  const updateCompanyProfile = useCallback((updates: Partial<CompanyProfile>) => {
    setProfile((prev) => {
      const next = { ...prev, ...updates };
      saveToStorage(next);
      return next;
    });
  }, []);

  const setCountry = useCallback((code: CountryCode) => {
    const cp = COUNTRY_PROFILES[code];
    setProfile((prev) => {
      const next: CompanyProfile = {
        ...prev,
        country: code,
        currency: cp.currency,
        currencySymbol: cp.currencySymbol,
        taxAuthority: cp.taxAuthority,
        taxAuthorityAr: cp.taxAuthorityAr,
      };
      saveToStorage(next);
      return next;
    });
  }, []);

  const resetProfile = useCallback(() => {
    setProfile(DEFAULT_PROFILE);
    if (typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  return (
    <CompanyContext.Provider
      value={{ profile, isHydrated, updateCompanyProfile, setCountry, resetProfile }}
    >
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompany() {
  const ctx = useContext(CompanyContext);
  if (!ctx) throw new Error("useCompany must be used within CompanyProvider");
  return ctx;
}
