"use client";

import type { ReactNode } from "react";
import { useViewMode, ViewToggle } from "@/components/shared/view-toggle";

/** Toggles between the (default) list table and a Kanban-by-status board. Both are
 * rendered server-side and passed in as already-built nodes; this component only
 * switches which one is visible, persisting the choice per useViewMode's contract. */
export function ReceiptsView({ list, kanban }: { list: ReactNode; kanban: ReactNode }) {
  const [mode, setMode] = useViewMode("receipts");
  return (
    <div>
      <div className="mb-3 flex justify-end">
        <ViewToggle mode={mode} onChange={setMode} />
      </div>
      {mode === "list" ? list : kanban}
    </div>
  );
}
