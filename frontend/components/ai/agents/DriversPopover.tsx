"use client";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/shared/ui/popover";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useI18n } from "@/lib/i18n/context";

export interface DriverItem {
  label: string;
  amount: number;
}

const MOCK_DRIVERS: DriverItem[] = [
  { label: "تأخر تحصيل الفاتورة #INV-2847", amount: 28_000 },
  { label: "زيادة مصروف المرافق الشهري", amount: 4_200 },
  { label: "تأثير سعر الصرف USD/SAR", amount: 1_100 },
];

interface DriversPopoverProps {
  children: React.ReactNode;
  drivers?: DriverItem[];
}

export function DriversPopover({ children, drivers = MOCK_DRIVERS }: DriversPopoverProps) {
  const { fmt } = useCurrency();
  const { locale } = useI18n();
  const isAr = locale === "ar";
  const title = isAr ? "أهم المحركات" : "Top drivers";

  return (
    <Popover>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent align={isAr ? "start" : "end"} className="w-72">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          {title}
        </p>
        <ul className="space-y-2">
          {drivers.slice(0, 3).map((d, i) => (
            <li key={i} className="flex items-center justify-between gap-2 text-sm">
              <span className="text-foreground/90">{d.label}</span>
              <span className="tabular-nums font-medium shrink-0" dir="ltr">
                {fmt(d.amount)}
              </span>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
