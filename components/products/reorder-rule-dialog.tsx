"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel, FieldGroup } from "@/components/ui/field";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { updateReorderRule } from "@/actions/products";

export function ReorderRuleDialog({
  productId,
  productName,
  reorderPoint,
  reorderQuantity,
  unitOfMeasure,
}: {
  productId: string;
  productName: string;
  reorderPoint: number;
  reorderQuantity: number;
  unitOfMeasure: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [point, setPoint] = useState(String(reorderPoint));
  const [qty, setQty] = useState(String(reorderQuantity));
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await updateReorderRule(productId, {
        reorder_point: Number(point || 0),
        reorder_quantity: Number(qty || 0),
      });
      if (!result.ok) {
        setError(result.error);
        toast.error(result.error);
        return;
      }
      toast.success("Reorder rule updated.");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) {
          setPoint(String(reorderPoint));
          setQty(String(reorderQuantity));
          setError(null);
        }
      }}
    >
      <DialogTrigger
        render={
          <Button variant="outline" size="sm">
            <Pencil className="size-3.5" /> Edit Rule
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Reorder Rule</DialogTitle>
        </DialogHeader>
        <p className="-mt-2 text-sm text-muted-foreground">{productName}</p>
        <form onSubmit={onSubmit} className="space-y-4">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="reorder-point">Reorder Point ({unitOfMeasure})</FieldLabel>
              <Input id="reorder-point" type="number" min="0" step="0.001" value={point} onChange={(e) => setPoint(e.target.value)} required />
            </Field>
            <Field>
              <FieldLabel htmlFor="reorder-qty">Reorder Quantity ({unitOfMeasure})</FieldLabel>
              <Input id="reorder-qty" type="number" min="0" step="0.001" value={qty} onChange={(e) => setQty(e.target.value)} required />
            </Field>
          </FieldGroup>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <DialogClose
              render={
                <Button type="button" variant="outline" disabled={pending}>
                  Cancel
                </Button>
              }
            />
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
