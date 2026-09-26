"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import {
  confirmDeliveryAction,
  completeDeliveryAction,
  cancelDeliveryAction,
  recheckDeliveryAvailabilityAction,
} from "@/actions/deliveries";
import type { ActionResult } from "@/lib/action-result";

/** Status-transition buttons for the delivery detail page. */
export function DeliveryActions({ deliveryId, status }: { deliveryId: string; status: "draft" | "waiting" | "ready" | "done" | "canceled" }) {
  const router = useRouter();
  const [rechecking, setRechecking] = useState(false);

  async function run(action: () => Promise<ActionResult>, successMessage: string) {
    const result = await action();
    if (!result.ok) {
      toast.error(result.error);
      return false;
    }
    toast.success(successMessage);
    router.refresh();
  }

  async function recheck() {
    setRechecking(true);
    const result = await recheckDeliveryAvailabilityAction(deliveryId);
    setRechecking(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Availability rechecked.");
    router.refresh();
  }

  if (status === "draft") {
    return (
      <>
        <ConfirmDialog
          trigger={<Button>Validate</Button>}
          title="Confirm this delivery?"
          description="Stock availability will be checked automatically — the delivery moves to Ready if enough stock is free, or Waiting otherwise."
          confirmLabel="Confirm"
          onConfirm={() => run(() => confirmDeliveryAction(deliveryId), "Delivery confirmed.")}
        />
        <ConfirmDialog
          trigger={<Button variant="destructive">Cancel</Button>}
          title="Cancel this delivery?"
          description="This delivery will be marked canceled and cannot be actioned further."
          confirmLabel="Cancel Delivery"
          destructive
          onConfirm={() => run(() => cancelDeliveryAction(deliveryId), "Delivery canceled.")}
        />
      </>
    );
  }

  if (status === "waiting") {
    return (
      <>
        <Button variant="outline" onClick={recheck} disabled={rechecking}>
          {rechecking ? <Loader2 className="animate-spin" /> : <RefreshCw />}
          Recheck Availability
        </Button>
        <ConfirmDialog
          trigger={<Button variant="destructive">Cancel</Button>}
          title="Cancel this delivery?"
          description="This delivery will be marked canceled and cannot be actioned further."
          confirmLabel="Cancel Delivery"
          destructive
          onConfirm={() => run(() => cancelDeliveryAction(deliveryId), "Delivery canceled.")}
        />
      </>
    );
  }

  if (status === "ready") {
    return (
      <>
        <ConfirmDialog
          trigger={<Button>Mark as Delivered</Button>}
          title="Complete this delivery?"
          description="This will decrease stock by the listed quantities. This cannot be undone from here."
          confirmLabel="Complete Delivery"
          onConfirm={() => run(() => completeDeliveryAction(deliveryId), "Delivery completed — stock updated.")}
        />
        <ConfirmDialog
          trigger={<Button variant="destructive">Cancel</Button>}
          title="Cancel this delivery?"
          description="This delivery will be marked canceled and cannot be actioned further."
          confirmLabel="Cancel Delivery"
          destructive
          onConfirm={() => run(() => cancelDeliveryAction(deliveryId), "Delivery canceled.")}
        />
      </>
    );
  }

  return null;
}
