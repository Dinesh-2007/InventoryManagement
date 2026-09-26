"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import type { ActionResult } from "@/lib/action-result";

/** Shared activate/deactivate control for the settings CRUD lists (warehouses, locations, suppliers, customers). */
export function ToggleActiveButton({
  active,
  label,
  onToggle,
}: {
  active: boolean;
  label: string;
  onToggle: (nextActive: boolean) => Promise<ActionResult>;
}) {
  const router = useRouter();
  return (
    <ConfirmDialog
      trigger={
        <Button variant="ghost" size="sm">
          {active ? "Deactivate" : "Activate"}
        </Button>
      }
      title={active ? `Deactivate ${label}?` : `Activate ${label}?`}
      description={
        active
          ? `${label} will be hidden from new operations. Existing records are not affected.`
          : `${label} will become available again for new operations.`
      }
      confirmLabel={active ? "Deactivate" : "Activate"}
      destructive={active}
      onConfirm={async () => {
        const result = await onToggle(!active);
        if (!result.ok) {
          toast.error(result.error);
          return false;
        }
        toast.success(result.message ?? "Saved.");
        router.refresh();
      }}
    />
  );
}
