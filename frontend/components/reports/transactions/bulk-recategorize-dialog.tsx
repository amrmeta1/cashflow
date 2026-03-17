"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/shared/ui/dialog";
import { Button } from "@/components/shared/ui/button";
import { Label } from "@/components/shared/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/shared/ui/select";
import { CATEGORIES } from "./types";
import type { Category } from "./types";

interface BulkRecategorizeDialogProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  selectedCount: number;
  onConfirm: (category: Category) => void;
  isPending: boolean;
  isAr: boolean;
}

export function BulkRecategorizeDialog({
  open,
  onOpenChange,
  selectedCount,
  onConfirm,
  isPending,
  isAr,
}: BulkRecategorizeDialogProps) {
  const [category, setCategory] = useState<Category | "">("");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base">
            {isAr ? "إعادة تصنيف المعاملات" : "Re-categorize Transactions"}
          </DialogTitle>
        </DialogHeader>

        <div className="py-3 space-y-3">
          <p className="text-sm text-muted-foreground">
            {isAr
              ? `سيتم تغيير فئة ${selectedCount} معاملة إلى:`
              : `Change category for ${selectedCount} transaction${selectedCount !== 1 ? "s" : ""} to:`}
          </p>
          <div className="space-y-1.5">
            <Label className="text-xs">{isAr ? "الفئة الجديدة" : "New Category"}</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as Category)}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder={isAr ? "اختر فئة" : "Select category"} />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            {isAr ? "إلغاء" : "Cancel"}
          </Button>
          <Button
            size="sm"
            disabled={!category || isPending}
            onClick={() => category && onConfirm(category as Category)}
          >
            {isPending
              ? isAr ? "جارٍ التطبيق..." : "Applying…"
              : isAr ? "تطبيق" : "Apply"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
