"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cancelTransferAction, completeTransferAction, confirmTransferAction } from "@/actions/transfers";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";

export function TransferActions({ id, status }: { id: string; status: "draft" | "ready" | "done" | "canceled" }) {
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

  if (status === "draft") {
    return (
      <div className="flex gap-2">
        <ConfirmDialog
          trigger={<Button>Validate</Button>}
          title="Validate this transfer?"
          description="The transfer moves to Ready and is queued to move stock once completed."
          confirmLabel="Validate"
          onConfirm={() => run(() => confirmTransferAction(id))}
        />
        <ConfirmDialog
          trigger={<Button variant="destructive">Cancel</Button>}
          title="Cancel this transfer?"
          description="This draft transfer will be canceled. This cannot be undone."
          confirmLabel="Cancel Transfer"
          destructive
          onConfirm={() => run(() => cancelTransferAction(id))}
        />
      </div>
    );
  }

  if (status === "ready") {
    return (
      <div className="flex gap-2">
        <ConfirmDialog
          trigger={<Button>Complete Transfer</Button>}
          title="Complete this transfer?"
          description="Both locations will update atomically. Total company stock is unchanged."
          confirmLabel="Complete Transfer"
          onConfirm={() => run(() => completeTransferAction(id))}
        />
        <ConfirmDialog
          trigger={<Button variant="destructive">Cancel</Button>}
          title="Cancel this transfer?"
          description="This transfer will be canceled before any stock moves. This cannot be undone."
          confirmLabel="Cancel Transfer"
          destructive
          onConfirm={() => run(() => cancelTransferAction(id))}
        />
      </div>
    );
  }

  return null;
}
