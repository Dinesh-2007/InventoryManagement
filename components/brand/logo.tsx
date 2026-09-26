import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("size-8", className)} aria-hidden="true">
      <path d="M16 2 29 9.5v13L16 30 3 22.5v-13L16 2Z" fill="var(--primary)" />
      <path d="M16 9 23 13v8l-7 4-7-4v-8l7-4Z" fill="white" />
      <path d="M16 9v16M9 13l7 4 7-4" stroke="var(--primary)" strokeWidth="1.6" fill="none" />
    </svg>
  );
}

export function Logo({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <LogoMark />
      <div className="leading-tight">
        <div className="text-[15px] font-bold tracking-tight text-foreground">StockSense</div>
        {!compact && <div className="text-[11px] text-muted-foreground">Inventory Management</div>}
      </div>
    </div>
  );
}
