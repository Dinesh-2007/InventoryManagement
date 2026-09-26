"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Triggers the browser print dialog. Hides itself via the `.no-print` utility
 * class (defined in app/globals.css) so it never appears on the printed page.
 */
export function PrintButton({ label = "Print" }: { label?: string }) {
  return (
    <Button type="button" variant="outline" className="no-print" onClick={() => window.print()}>
      <Printer /> {label}
    </Button>
  );
}
