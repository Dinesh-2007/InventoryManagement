"use client";

import type { ReactNode } from "react";
import { useViewMode, ViewToggle } from "@/components/shared/view-toggle";

/** Same list/Kanban toggle pattern as receipts-view.tsx. */
export function DeliveriesView({ list, kanban }: { list: ReactNode; kanban: ReactNode }) {
  const [mode, setMode] = useViewMode("deliveries");
  return (
    <div>
      <div className="mb-3 flex justify-end">
        <ViewToggle mode={mode} onChange={setMode} />
      </div>
      {mode === "list" ? list : kanban}
    </div>
  );
}
