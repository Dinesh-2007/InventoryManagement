import { Inbox } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { businessToday } from "@/lib/format";
import { safeCount } from "./safe-count";
import { OperationCard } from "./operation-card";

export async function ReceiptsCard() {
  const supabase = await createClient();
  const today = businessToday();

  const [toReceive, late, total] = await Promise.all([
    safeCount(supabase.from("receipts").select("id", { count: "exact", head: true }).in("status", ["draft", "ready"])),
    safeCount(
      supabase.from("receipts").select("id", { count: "exact", head: true }).lt("scheduled_date", today).not("status", "in", "(done,canceled)"),
    ),
    safeCount(supabase.from("receipts").select("id", { count: "exact", head: true }).neq("status", "canceled")),
  ]);

  return (
    <OperationCard
      title="Receipts"
      icon={Inbox}
      stats={[
        { label: "To Receive", value: toReceive },
        { label: "Late", value: late },
        { label: "Total Operations", value: total },
      ]}
      href="/operations/receipts"
      buttonLabel="View Receipts"
    />
  );
}
