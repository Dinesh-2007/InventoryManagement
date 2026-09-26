import Link from "next/link";
import { SignInButton, SignUpButton, Show, UserButton } from "@clerk/nextjs";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { LegalFooterLinks } from "@/components/shared/legal-links";

/**
 * Layout for the public, unauthenticated informational/legal route group:
 * /about, /terms, /privacy, /disclaimer, /contact.
 */
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/" aria-label="StockSense home">
            <Logo />
          </Link>
          <div className="flex items-center gap-2">
            <Show when="signed-out">
              <Button variant="ghost" size="sm" render={<Link href="/sign-in" />} nativeButton={false}>
                Sign In
              </Button>
              <Button size="sm" render={<Link href="/signup" />} nativeButton={false}>
                Sign Up
              </Button>
            </Show>
            <Show when="signed-in">
              <UserButton />
            </Show>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-14">{children}</div>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-3 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:justify-between sm:px-6">
          <LegalFooterLinks />
          <p>© {new Date().getFullYear()} StockSense</p>
        </div>
      </footer>
    </div>
  );
}
