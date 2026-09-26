import Link from "next/link";
import { CalendarClock } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { businessToday, formatDate } from "@/lib/format";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";

type Op = { id: string; reference: string; scheduled_date: string; status: "draft" | "waiting" | "ready" | "done" | "canceled"; type: "receipt" | "delivery" };

export async function UpcomingOperations() {
  const supabase = createClient();
  const today = businessToday();

  const [{ data: receipts, error: rErr }, { data: deliveries, error: dErr }] = await Promise.all([
    supabase.from("receipts").select("id,reference,scheduled_date,status").gte("scheduled_date", today).not("status", "in", "(done,canceled)").order("scheduled_date").limit(5),
    supabase.from("deliveries").select("id,reference,scheduled_date,status").gte("scheduled_date", today).not("status", "in", "(done,canceled)").order("scheduled_date").limit(5),
  ]);
  if (rErr) console.error("[dashboard] upcoming receipts failed", rErr);
  if (dErr) console.error("[dashboard] upcoming deliveries failed", dErr);

  const merged: Op[] = [
    ...(receipts ?? []).map((r) => ({ ...r, type: "receipt" as const })),
    ...(deliveries ?? []).map((d) => ({ ...d, type: "delivery" as const })),
  ]
    .sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date))
    .slice(0, 5);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upcoming Operations</CardTitle>
      </CardHeader>
      <CardContent>
        {merged.length === 0 ? (
          <EmptyState icon={CalendarClock} title="Nothing scheduled" description="Upcoming receipts and deliveries will show up here." />
        ) : (
          <ul className="divide-y">
            {merged.map((op) => (
              <li key={`${op.type}-${op.id}`} className="flex items-center justify-between gap-3 py-2 text-sm">
                <div className="min-w-0">
                  <Link
                    href={op.type === "receipt" ? `/operations/receipts/${op.id}` : `/operations/deliveries/${op.id}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {op.reference}
                  </Link>
                  <div className="text-xs text-muted-foreground">
                    {op.type === "receipt" ? "Receipt" : "Delivery"} · {formatDate(op.scheduled_date)}
                  </div>
                </div>
                <StatusBadge status={op.status} />
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
