import { redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import { SignInButton, SignUpButton, Show, UserButton } from "@clerk/nextjs";
import { Bell } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { MobileNav } from "@/components/layout/mobile-nav";
import { TopbarSearch } from "@/components/layout/topbar-search";
import { LegalFooterLinks } from "@/components/shared/legal-links";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const clerkUser = await currentUser();
  if (!clerkUser) redirect("/sign-in");

  const fullName =
    clerkUser.fullName ||
    clerkUser.firstName ||
    clerkUser.primaryEmailAddress?.emailAddress ||
    "User";
  const roleLabel = "Inventory Manager";

  return (
    <div className="min-h-screen bg-muted/30">
      <aside className="hidden lg:fixed lg:inset-y-0 lg:z-40 lg:flex lg:w-60 lg:flex-col lg:border-r lg:bg-card">
        <div className="flex h-14 shrink-0 items-center border-b px-4">
          <Logo compact />
        </div>
        <SidebarNav />
      </aside>

      <div className="lg:pl-60">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur sm:px-6">
          <MobileNav />
          <div className="lg:hidden">
            <Logo compact />
          </div>

          <TopbarSearch className="ml-auto max-w-md flex-1 lg:ml-0" />

          <Button variant="ghost" size="icon" className="shrink-0" aria-label="Notifications">
            <Bell className="size-4" />
          </Button>

          <Show when="signed-out">
            <SignInButton mode="modal">
              <Button variant="ghost" size="sm">Sign In</Button>
            </SignInButton>
            <SignUpButton mode="modal">
              <Button size="sm">Sign Up</Button>
            </SignUpButton>
          </Show>

          <Show when="signed-in">
            <div className="flex items-center gap-3">
              <div className="hidden leading-tight text-right sm:block">
                <div className="text-sm font-medium">{fullName}</div>
                <div className="text-xs text-muted-foreground">{roleLabel}</div>
              </div>
              <UserButton />
            </div>
          </Show>
        </header>

        <main className="mx-auto max-w-[1400px] p-4 sm:p-6">{children}</main>

        <footer className="mx-auto flex max-w-[1400px] flex-col items-center gap-2 px-4 pb-6 text-xs text-muted-foreground no-print sm:flex-row sm:justify-between sm:px-6">
          <LegalFooterLinks className="text-xs" />
          <p>© {new Date().getFullYear()} StockSense</p>
        </footer>
      </div>
    </div>
  );
}
