import { Truck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { businessToday } from "@/lib/format";
import { safeCount } from "./safe-count";
import { OperationCard } from "./operation-card";

export async function DeliveriesCard() {
  const supabase = await createClient();
  const today = businessToday();

  const [toDeliver, late, waiting, total] = await Promise.all([
    safeCount(supabase.from("deliveries").select("id", { count: "exact", head: true }).in("status", ["draft", "ready"])),
    safeCount(
      supabase.from("deliveries").select("id", { count: "exact", head: true }).lt("scheduled_date", today).not("status", "in", "(done,canceled)"),
    ),
    safeCount(supabase.from("deliveries").select("id", { count: "exact", head: true }).eq("status", "waiting")),
    safeCount(supabase.from("deliveries").select("id", { count: "exact", head: true }).neq("status", "canceled")),
  ]);

  return (
    <OperationCard
      title="Deliveries"
      icon={Truck}
      stats={[
        { label: "To Deliver", value: toDeliver },
        { label: "Late", value: late },
        { label: "Waiting", value: waiting },
        { label: "Total Operations", value: total },
      ]}
      href="/operations/deliveries"
      buttonLabel="View Deliveries"
    />
  );
}
