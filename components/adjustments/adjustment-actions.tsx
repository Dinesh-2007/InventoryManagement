"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { applyAdjustmentAction, cancelAdjustmentAction } from "@/actions/adjustments";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";

export function AdjustmentActions({ id, status }: { id: string; status: "draft" | "done" | "canceled" }) {
  const router = useRouter();

  async function run(action: () => Promise<{ ok: boolean; error?: string; message?: string }>) {
    const result = await action();
    if (!result.ok) {
      toast.error(result.error);
      return false;
    }
    toast.success(result.message ?? "Saved.");
    router.refresh();
  }

  if (status !== "draft") return null;

  return (
    <div className="flex gap-2">
      <ConfirmDialog
        trigger={<Button>Apply Adjustment</Button>}
        title="Apply this adjustment?"
        description="This will update system stock to match the counted quantities. This cannot be undone."
        confirmLabel="Apply Adjustment"
        onConfirm={() => run(() => applyAdjustmentAction(id))}
      />
      <ConfirmDialog
        trigger={<Button variant="destructive">Cancel</Button>}
        title="Cancel this adjustment?"
        description="This draft adjustment will be canceled. This cannot be undone."
        confirmLabel="Cancel Adjustment"
        destructive
        onConfirm={() => run(() => cancelAdjustmentAction(id))}
      />
    </div>
  );
}
