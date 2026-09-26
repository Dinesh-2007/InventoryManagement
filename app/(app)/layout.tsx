import Link from "next/link";
import { redirect } from "next/navigation";
import { Bell, LogOut, User } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/actions/auth";
import { Logo } from "@/components/brand/logo";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { MobileNav } from "@/components/layout/mobile-nav";
import { TopbarSearch } from "@/components/layout/topbar-search";

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email, role, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  const fullName = profile?.full_name || profile?.email || user.email || "User";
  const roleLabel = profile?.role === "inventory_manager" ? "Inventory Manager" : "Warehouse Staff";

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

          <DropdownMenu>
            <DropdownMenuTrigger className="flex shrink-0 items-center gap-2 rounded-lg px-1.5 py-1 text-left outline-none hover:bg-muted">
              <Avatar size="sm">
                {profile?.avatar_url && <AvatarImage src={profile.avatar_url} alt={fullName} />}
                <AvatarFallback>{initials(fullName)}</AvatarFallback>
              </Avatar>
              <div className="hidden leading-tight sm:block">
                <div className="text-sm font-medium">{fullName}</div>
                <div className="text-xs text-muted-foreground">{roleLabel}</div>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuGroup>
                <DropdownMenuLabel>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium text-foreground">{fullName}</span>
                    <span className="text-xs font-normal text-muted-foreground">{profile?.email ?? user.email}</span>
                  </div>
                </DropdownMenuLabel>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem render={<Link href="/profile" />}>
                <User className="size-4" />
                My Profile
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" render={<form action={signOut} />}>
                <button type="submit" className="flex w-full items-center gap-1.5">
                  <LogOut className="size-4" />
                  Logout
                </button>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <main className="mx-auto max-w-[1400px] p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
