"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BarChart3, Warehouse, Loader2, ArrowRight, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { setAccountRole } from "@/actions/auth-clerk";

const ROLES = [
  {
    value: "inventory_manager" as const,
    title: "Inventory Manager",
    badge: "Full Control",
    description:
      "Company-wide inventory oversight. Manage products, categories, stock adjustments, warehouses, suppliers, and customer orders.",
    features: [
      "Access to full Management Dashboard",
      "Product & Category management",
      "Stock adjustment approvals",
      "Warehouse & location configuration",
      "Company-wide inventory analytics",
    ],
    icon: BarChart3,
  },
  {
    value: "warehouse_staff" as const,
    title: "Warehouse Staff",
    badge: "Operational Floor",
    description:
      "Floor-level operational execution. Perform picking, shelving, internal material transfers, and physical stock cycle counting.",
    features: [
      "Access to Warehouse Operations Dashboard",
      "My Tasks queue (Picking & Shelving)",
      "Internal transfer execution",
      "Physical stock counting submission",
      "Assigned warehouse & rack scoping",
    ],
    icon: Warehouse,
  },
];

export function RoleSelectionForm({ currentRole }: { currentRole?: string | null }) {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<"inventory_manager" | "warehouse_staff" | null>(
    (currentRole as any) || null
  );
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    if (!selectedRole) {
      toast.error("Please select a role to continue.");
      return;
    }

    startTransition(async () => {
      const result = await setAccountRole(selectedRole);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      toast.success(
        selectedRole === "inventory_manager"
          ? "Role set: Inventory Manager"
          : "Role set: Warehouse Staff"
      );

      // Force a full refresh/navigation to the designated dashboard
      window.location.href = result.data?.redirectUrl || "/dashboard";
    });
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        {ROLES.map((r) => {
          const isSelected = selectedRole === r.value;
          return (
            <div
              key={r.value}
              onClick={() => setSelectedRole(r.value)}
              className={cn(
                "relative flex cursor-pointer flex-col justify-between rounded-xl border-2 p-5 transition-all duration-200",
                isSelected
                  ? "border-primary bg-primary/5 shadow-md ring-1 ring-primary"
                  : "border-border bg-card hover:border-primary/40 hover:bg-muted/30"
              )}
            >
              <div>
                <div className="flex items-center justify-between">
                  <div
                    className={cn(
                      "rounded-lg p-2.5",
                      isSelected
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    <r.icon className="size-6" />
                  </div>
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                      isSelected
                        ? "bg-primary/10 text-primary"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {r.badge}
                  </span>
                </div>

                <div className="mt-4">
                  <h3 className="text-lg font-bold text-foreground">{r.title}</h3>
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                    {r.description}
                  </p>
                </div>

                <ul className="mt-4 space-y-2 border-t pt-3 text-xs text-muted-foreground">
                  {r.features.map((feat, i) => (
                    <li key={i} className="flex items-center gap-1.5">
                      <ShieldCheck className="size-3.5 shrink-0 text-primary" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-5 border-t pt-3">
                <div
                  className={cn(
                    "flex items-center justify-center rounded-lg py-2 text-xs font-semibold transition-colors",
                    isSelected
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground"
                  )}
                >
                  {isSelected ? "Selected Role" : "Select this Role"}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-col items-center gap-3 pt-2">
        <Button
          size="lg"
          className="w-full sm:w-auto sm:min-w-[240px]"
          disabled={!selectedRole || isPending}
          onClick={handleSubmit}
        >
          {isPending ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" /> Setting up your dashboard...
            </>
          ) : (
            <>
              Confirm & Continue <ArrowRight className="ml-2 size-4" />
            </>
          )}
        </Button>
        <p className="text-xs text-muted-foreground">
          Your role configures your dashboard, operational permissions, and facility scope.
        </p>
      </div>
    </div>
  );
}
