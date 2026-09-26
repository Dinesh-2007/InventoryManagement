"use client";

import { useEffect, useState } from "react";
import { LayoutGrid, List } from "lucide-react";
import { cn } from "@/lib/utils";

export type ViewMode = "list" | "kanban";

/** List/Kanban preference persisted per page in localStorage. Default is List (wireframe). */
export function useViewMode(storageKey: string): [ViewMode, (v: ViewMode) => void] {
  const [mode, setMode] = useState<ViewMode>("list");
  useEffect(() => {
    try {
      const v = localStorage.getItem(`view:${storageKey}`);
      if (v === "list" || v === "kanban") setMode(v);
    } catch {}
  }, [storageKey]);
  const update = (v: ViewMode) => {
    setMode(v);
    try { localStorage.setItem(`view:${storageKey}`, v); } catch {}
  };
  return [mode, update];
}

export function ViewToggle({ mode, onChange }: { mode: ViewMode; onChange: (v: ViewMode) => void }) {
  const item = (v: ViewMode, Icon: typeof List, label: string) => (
    <button type="button" aria-label={label} aria-pressed={mode === v} onClick={() => onChange(v)}
      className={cn("inline-flex size-8 items-center justify-center rounded-md transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 outline-none",
        mode === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}>
      <Icon className="size-4" />
    </button>
  );
  return (
    <div className="inline-flex items-center gap-0.5 rounded-lg border bg-card p-0.5">
      {item("list", List, "List view")}
      {item("kanban", LayoutGrid, "Kanban view")}
    </div>
  );
}
