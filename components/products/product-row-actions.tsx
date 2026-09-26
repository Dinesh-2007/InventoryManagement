"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, Power, PowerOff } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { cn } from "@/lib/utils";
import { setProductActive } from "@/actions/products";

export function ProductRowActions({ id, active }: { id: string; active: boolean }) {
  const router = useRouter();
  return (
    <div className="flex items-center justify-end gap-1">
      <Link
        href={`/products/${id}/edit`}
        aria-label="Edit product"
        className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }))}
      >
        <Pencil className="size-4" />
      </Link>
      <ConfirmDialog
        trigger={
          <Button variant="ghost" size="icon-sm" aria-label={active ? "Deactivate product" : "Activate product"}>
            {active ? <PowerOff className="size-4" /> : <Power className="size-4" />}
          </Button>
        }
        title={active ? "Deactivate product?" : "Activate product?"}
        description={
          active
            ? "Existing stock records are preserved; it will no longer be selectable in new operations."
            : "This product will become selectable again in new operations."
        }
        confirmLabel={active ? "Deactivate" : "Activate"}
        destructive={active}
        onConfirm={async () => {
          const result = await setProductActive(id, !active);
          if (!result.ok) {
            toast.error(result.error);
            return false;
          }
          toast.success(active ? "Product deactivated." : "Product activated.");
          router.refresh();
        }}
      />
    </div>
  );
}
