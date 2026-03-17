"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/shared/ui/dialog";
import { Button } from "@/components/shared/ui/button";
import { Input } from "@/components/shared/ui/input";
import { Label } from "@/components/shared/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/shared/ui/select";
import { CATEGORIES } from "./types";
import type { Transaction, UpdateTransactionPayload, Category, TransactionStatus } from "./types";

interface EditDialogProps {
  txn: Transaction | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSave: (id: string, payload: UpdateTransactionPayload) => void;
  isPending: boolean;
  isAr: boolean;
}

interface FormValues {
  description: string;
  category: Category;
  status: TransactionStatus;
  notes: string;
}

export function EditDialog({
  txn,
  open,
  onOpenChange,
  onSave,
  isPending,
  isAr,
}: EditDialogProps) {
  const { register, handleSubmit, reset, setValue, watch } = useForm<FormValues>();

  useEffect(() => {
    if (txn) {
      reset({
        description: txn.description,
        category: txn.category,
        status: txn.status,
        notes: txn.notes ?? "",
      });
    }
  }, [txn, reset]);

  const onSubmit = (values: FormValues) => {
    if (!txn) return;
    onSave(txn.id, {
      description: values.description,
      category: values.category,
      status: values.status,
      notes: values.notes || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">
            {isAr ? "تعديل المعاملة" : "Edit Transaction"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs">{isAr ? "الوصف" : "Description"}</Label>
            <Input {...register("description")} className="h-8 text-sm" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">{isAr ? "الفئة" : "Category"}</Label>
              <Select
                value={watch("category")}
                onValueChange={(v) => setValue("category", v as Category)}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">{isAr ? "الحالة" : "Status"}</Label>
              <Select
                value={watch("status")}
                onValueChange={(v) => setValue("status", v as TransactionStatus)}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cleared" className="text-xs">{isAr ? "مُسوَّى" : "Cleared"}</SelectItem>
                  <SelectItem value="pending" className="text-xs">{isAr ? "معلق" : "Pending"}</SelectItem>
                  <SelectItem value="reconciled" className="text-xs">{isAr ? "مُطابَق" : "Reconciled"}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">{isAr ? "ملاحظات" : "Notes"}</Label>
            <Input {...register("notes")} className="h-8 text-sm" placeholder={isAr ? "اختياري" : "Optional"} />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              {isAr ? "إلغاء" : "Cancel"}
            </Button>
            <Button type="submit" size="sm" disabled={isPending}>
              {isPending ? (isAr ? "جارٍ الحفظ..." : "Saving…") : (isAr ? "حفظ" : "Save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
