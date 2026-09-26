"use client";

import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatQty } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TableCell, TableRow } from "@/components/ui/table";

export type AdjustmentProductOption = { id: string; name: string; sku: string; unit_of_measure: string };

/**
 * Live system quantity for one product at one location, read straight from
 * the `stock_by_location` view (browser client) so it reacts as the user
 * changes the location or adds/removes product rows.
 */
function useSystemQuantity(productId: string, locationId: string) {
  const key = `${productId}:${locationId}`;
  // Keyed result so "loading" is derived (result for a stale key) rather than
  // set synchronously in the effect body, which avoids extra cascading renders.
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
        if (error) console.error("[adjustment-line] system quantity fetch failed", error);
        setResult({ key, qty: error ? null : data ? Number(data.quantity_on_hand) : 0 });
      });
    return () => {
      active = false;
    };
  }, [productId, locationId, key]);

  // No location selected yet, or the fetch for the current key hasn't resolved: no stale value.
  if (!productId || !locationId) return { qty: null, loading: false };
  if (result?.key !== key) return { qty: null, loading: true };
  return { qty: result.qty, loading: false };
}

export function AdjustmentLineRow({
  product,
  locationId,
  countedQuantity,
  onCountedChange,
  onRemove,
}: {
  product: AdjustmentProductOption;
  locationId: string;
  countedQuantity: number;
  onCountedChange: (v: number) => void;
  onRemove: () => void;
}) {
  const { qty: systemQuantity, loading } = useSystemQuantity(product.id, locationId);
  const difference = systemQuantity == null ? null : countedQuantity - systemQuantity;

  return (
    <TableRow>
      <TableCell>
        <div>{product.name}</div>
        <div className="text-xs text-muted-foreground">{product.sku}</div>
      </TableCell>
      <TableCell className="text-muted-foreground">
        {!locationId ? "Select a location" : loading ? "…" : systemQuantity == null ? "—" : formatQty(systemQuantity, product.unit_of_measure)}
      </TableCell>
      <TableCell>
        <Input
          type="number"
          min={0}
          step="any"
          value={countedQuantity}
          onChange={(e) => onCountedChange(Number(e.target.value))}
          className="h-8 w-28"
        />
      </TableCell>
      <TableCell
        className={cn(
          "font-medium",
          difference == null || difference === 0 ? "text-muted-foreground" : difference > 0 ? "text-emerald-600" : "text-rose-600",
        )}
      >
        {difference == null ? "—" : `${difference > 0 ? "+" : ""}${formatQty(difference, product.unit_of_measure)}`}
      </TableCell>
      <TableCell>
        <Button type="button" variant="ghost" size="icon-sm" aria-label="Remove line" onClick={onRemove}>
          <Trash2 />
        </Button>
      </TableCell>
    </TableRow>
  );
}
