import Link from "next/link";
import { cn } from "@/lib/utils";

export const LEGAL_LINKS = [
  { href: "/about", label: "About" },
  { href: "/terms", label: "Terms" },
  { href: "/privacy", label: "Privacy" },
  { href: "/disclaimer", label: "Disclaimer" },
  { href: "/contact", label: "Contact" },
] as const;

/**
 * Shared row of links to the public informational/legal pages
 * (app/(public)/*). Reused in the public layout footer, the auth
 * shell footer, and the authenticated app shell.
 */
export function LegalFooterLinks({ className }: { className?: string }) {
  return (
    <nav aria-label="Legal" className={cn("flex flex-wrap items-center gap-x-4 gap-y-1", className)}>
      {LEGAL_LINKS.map((link) => (
        <Link key={link.href} href={link.href} className="transition-colors hover:text-foreground hover:underline underline-offset-4">
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
