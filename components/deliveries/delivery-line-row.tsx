"use client";

import { useEffect, useState } from "react";
import { Controller, useWatch, type Control, type FieldErrors } from "react-hook-form";
import type { z } from "zod";
import { Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { deliverySchema, type DeliveryInput } from "@/lib/validations/deliveries";

/** Matches the `z.input` form-values type used by useForm in delivery-form.tsx
 * (quantity is a coercible input there, not yet the coerced `number` output). */
type DeliveryFormValues = z.input<typeof deliverySchema>;
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TableCell, TableRow } from "@/components/ui/table";
import { FieldError } from "@/components/ui/field";
import { ProductPicker, type PickableProduct } from "@/components/operations/product-picker";

/**
 * Live on-hand quantity for one product at the delivery's source location,
 * read from `stock_by_location` (browser client) so it reacts as the user
 * changes the product, quantity, or location. This is purely a UI heads-up —
 * the backend `confirm_delivery` RPC is the source of truth for Draft ->
 * Waiting transitions when stock is short at validation time.
 */
function useAvailableQuantity(productId: string, locationId: string) {
  const key = `${productId}:${locationId}`;
  const [result, setResult] = useState<{ key: string; qty: number | null } | null>(null);

  useEffect(() => {
    if (!productId || !locationId) return;
    let active = true;
    const supabase = createClient();
    supabase
      .from("stock_by_location")
      .select("quantity_on_hand")
      .eq("product_id", productId)
      .eq("location_id", locationId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!active) return;
        if (error) console.error("[delivery-line] available quantity fetch failed", error);
        setResult({ key, qty: error ? null : data ? Number(data.quantity_on_hand) : 0 });
      });
    return () => {
      active = false;
    };
  }, [productId, locationId, key]);

  if (!productId || !locationId) return { qty: null, loading: false };
  if (result?.key !== key) return { qty: null, loading: true };
  return { qty: result.qty, loading: false };
}

export function DeliveryLineRow({
  index,
  control,
  errors,
  products,
  excludeIds,
  locationId,
  canRemove,
  onRemove,
  onProductPicked,
}: {
  index: number;
  control: Control<DeliveryFormValues, unknown, DeliveryInput>;
  errors: FieldErrors<DeliveryFormValues>;
  products: PickableProduct[];
  excludeIds: string[];
  locationId: string;
  canRemove: boolean;
  onRemove: () => void;
  onProductPicked?: (productId: string) => void;
}) {
  const productId = useWatch({ control, name: `items.${index}.product_id` }) || "";
  const quantity = useWatch({ control, name: `items.${index}.quantity` });
  const selectedProduct = products.find((p) => p.id === productId);

  const { qty: available, loading } = useAvailableQuantity(productId, locationId);
  const requested = Number(quantity) || 0;
  const insufficient = available != null && !loading && requested > available;

  return (
    <TableRow data-insufficient={insufficient || undefined} className={cn(insufficient && "bg-destructive/5")}>
      <TableCell className="align-top">
        <Controller
          control={control}
          name={`items.${index}.product_id`}
          render={({ field: f }) => (
            <ProductPicker
              products={products}
              excludeIds={excludeIds}
              value={f.value}
              onChange={(id) => {
                f.onChange(id);
                onProductPicked?.(id);
              }}
            />
          )}
        />
        <FieldError errors={[errors.items?.[index]?.product_id]} />
      </TableCell>
      <TableCell className="align-top">
        <Controller
          control={control}
          name={`items.${index}.quantity`}
          render={({ field: f }) => (
            <Input
              type="number"
              step="0.001"
              min="0"
              aria-invalid={!!errors.items?.[index]?.quantity || insufficient}
              className={cn(insufficient && "border-destructive text-destructive focus-visible:ring-destructive/40")}
              value={(f.value ?? "") as string | number}
              onChange={(e) => f.onChange(e.target.value === "" ? "" : Number(e.target.value))}
              onBlur={f.onBlur}
              name={f.name}
            />
          )}
        />
        {selectedProduct && !insufficient && (
          <span className="mt-1 block text-xs text-muted-foreground">{selectedProduct.unit_of_measure}</span>
        )}
        {locationId && productId && !loading && insufficient && (
          <span className="mt-1 block text-xs font-medium text-destructive">
            Only {available} {selectedProduct?.unit_of_measure ?? ""} available — will go to Waiting
          </span>
        )}
        <FieldError errors={[errors.items?.[index]?.quantity]} />
      </TableCell>
      <TableCell className="align-top">
        <Button type="button" variant="ghost" size="icon-sm" disabled={!canRemove} onClick={onRemove} aria-label="Remove row">
          <Trash2 className="text-destructive" />
        </Button>
      </TableCell>
    </TableRow>
  );
}
