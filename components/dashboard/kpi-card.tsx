import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function KpiCard({
  label,
  value,
  href,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: number | string;
  href: string;
  icon: LucideIcon;
  tone?: "default" | "warning" | "destructive";
}) {
  return (
    <Link href={href} className="block">
      <Card className="h-full transition-shadow hover:shadow-sm">
        <CardContent className="flex items-center justify-between gap-2">
          <div>
            <div className="text-xs font-medium text-muted-foreground">{label}</div>
            <div
              className={cn(
                "mt-1 text-2xl font-semibold",
                tone === "warning" && "text-amber-600",
                tone === "destructive" && "text-rose-600",
              )}
            >
              {value}
            </div>
          </div>
          <div
            className={cn(
              "rounded-full bg-accent p-2.5 text-primary",
              tone === "warning" && "bg-amber-50 text-amber-600",
              tone === "destructive" && "bg-rose-50 text-rose-600",
            )}
          >
            <Icon className="size-5" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
