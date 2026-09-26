import type { Metadata } from "next";
import Link from "next/link";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ProfileForm } from "@/components/profile/profile-form";

export const metadata: Metadata = { title: "My Profile" };

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}

export default async function ProfilePage() {
  const clerkUser = await currentUser();
  if (!clerkUser) redirect("/sign-in");

  const supabase = createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, email, login_id, role, avatar_url, phone")
    .eq("clerk_user_id", clerkUser.id)
    .maybeSingle();

  const fullName =
    profile?.full_name ||
    profile?.email ||
    clerkUser.fullName ||
    clerkUser.primaryEmailAddress?.emailAddress ||
    "User";
  const roleLabel = profile?.role === "inventory_manager" ? "Inventory Manager" : "Warehouse Staff";

  return (
    <div>
      <PageHeader title="My Profile" description="View and update your account details" />

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <Card>
          <CardContent className="flex flex-col items-center gap-3 pt-2 text-center">
            <Avatar size="lg" className="size-20">
              {profile?.avatar_url && <AvatarImage src={profile.avatar_url} alt={fullName} />}
              <AvatarFallback className="text-xl">{initials(fullName)}</AvatarFallback>
            </Avatar>
            <div>
              <div className="text-base font-semibold">{fullName}</div>
              <div className="text-sm text-muted-foreground">{profile?.email ?? clerkUser.primaryEmailAddress?.emailAddress}</div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{roleLabel}</Badge>
              <Button variant="outline" size="xs" render={<Link href="/choose-role" />} nativeButton={false}>
                Switch Role
              </Button>
            </div>
            {profile?.login_id && (
              <>
                <Separator className="my-1" />
                <div className="w-full text-left text-sm">
                  <div className="text-xs text-muted-foreground">Login ID</div>
                  <div className="font-medium">{profile.login_id}</div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Edit Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <ProfileForm
              defaultValues={{
                fullName: profile?.full_name ?? "",
                phone: profile?.phone ?? "",
                avatarUrl: profile?.avatar_url ?? "",
              }}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
