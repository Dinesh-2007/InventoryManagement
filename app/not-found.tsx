import Link from "next/link";
import { Compass } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-6 text-center">
      <Logo />
      <div className="rounded-full bg-accent p-4 text-primary">
        <Compass className="size-8" aria-hidden="true" />
      </div>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Page not found</h1>
        <p className="mt-1 text-sm text-muted-foreground">The page you&apos;re looking for doesn&apos;t exist or has moved.</p>
      </div>
      <Button render={<Link href="/dashboard" />}>Back to Dashboard</Button>
    </div>
  );
}
