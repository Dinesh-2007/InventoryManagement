"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { confirmReceiptAction, completeReceiptAction, cancelReceiptAction } from "@/actions/receipts";
import type { ActionResult } from "@/lib/action-result";

/** Status-transition buttons for the receipt detail page. Client component so it
 * can wire ConfirmDialog + server actions + toasts + router.refresh(). */
export function ReceiptActions({ receiptId, status }: { receiptId: string; status: "draft" | "ready" | "done" | "canceled" }) {
  const router = useRouter();

  async function run(action: () => Promise<ActionResult>, successMessage: string) {
    const result = await action();
    if (!result.ok) {
      toast.error(result.error);
      return false;
    }
    toast.success(successMessage);
    router.refresh();
  }

  if (status === "draft") {
    return (
      <>
        <ConfirmDialog
          trigger={<Button>Validate</Button>}
          title="Confirm this receipt?"
          description="It will move to Ready and can then be completed to receive stock."
          confirmLabel="Confirm"
          onConfirm={() => run(() => confirmReceiptAction(receiptId), "Receipt confirmed — now Ready.")}
        />
        <ConfirmDialog
          trigger={<Button variant="destructive">Cancel</Button>}
          title="Cancel this receipt?"
          description="This receipt will be marked canceled and cannot be actioned further."
          confirmLabel="Cancel Receipt"
          destructive
          onConfirm={() => run(() => cancelReceiptAction(receiptId), "Receipt canceled.")}
        />
      </>
    );
  }

  if (status === "ready") {
    return (
      <>
        <ConfirmDialog
          trigger={<Button>Mark as Done</Button>}
          title="Complete this receipt?"
          description="This will increase stock by the listed quantities. This cannot be undone from here."
          confirmLabel="Complete Receipt"
          onConfirm={() => run(() => completeReceiptAction(receiptId), "Receipt completed — stock updated.")}
        />
        <ConfirmDialog
          trigger={<Button variant="destructive">Cancel</Button>}
          title="Cancel this receipt?"
          description="This receipt will be marked canceled and cannot be actioned further."
          confirmLabel="Cancel Receipt"
          destructive
          onConfirm={() => run(() => cancelReceiptAction(receiptId), "Receipt canceled.")}
        />
      </>
    );
  }

  return null;
}
