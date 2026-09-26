import type { Metadata } from "next";
import Link from "next/link";
import { ShieldX } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Access Denied" };

export default function ForbiddenPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <div className="mx-auto max-w-md text-center">
        <div className="mb-6 inline-flex rounded-full bg-destructive/10 p-5 text-destructive">
          <ShieldX className="size-10" />
        </div>
        <h1 className="mb-2 text-3xl font-bold tracking-tight">Access Denied</h1>
        <p className="mb-8 text-muted-foreground">
          You don&apos;t have permission to access this page. Contact your administrator if you believe this is a mistake.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button render={<Link href="/dashboard" />} nativeButton={false}>
            Go to Dashboard
          </Button>
          <Button variant="outline" render={<Link href="/profile" />} nativeButton={false}>
            My Profile
          </Button>
        </div>
      </div>
    </main>
  );
}
