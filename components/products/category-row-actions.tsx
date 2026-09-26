"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Power, PowerOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { CategoryDialog } from "@/components/products/category-dialog";
import { setCategoryActive } from "@/actions/categories";

export function CategoryRowActions({ category }: { category: { id: string; name: string; description: string | null; active: boolean } }) {
  const router = useRouter();
  return (
    <div className="flex items-center justify-end gap-1">
      <CategoryDialog mode="edit" category={category} />
      <ConfirmDialog
        trigger={
          <Button variant="ghost" size="icon-sm" aria-label={category.active ? "Deactivate category" : "Activate category"}>
            {category.active ? <PowerOff className="size-4" /> : <Power className="size-4" />}
          </Button>
        }
        title={category.active ? "Deactivate category?" : "Activate category?"}
        description={
          category.active
            ? "Existing products keep this category; it will no longer be selectable for new products."
            : "This category will become selectable again for new products."
        }
        confirmLabel={category.active ? "Deactivate" : "Activate"}
        destructive={category.active}
        onConfirm={async () => {
          const result = await setCategoryActive(category.id, !category.active);
          if (!result.ok) {
            toast.error(result.error);
            return false;
          }
          toast.success(category.active ? "Category deactivated." : "Category activated.");
          router.refresh();
        }}
      />
    </div>
  );
}
