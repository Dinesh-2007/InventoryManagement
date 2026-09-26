import { redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import { Logo } from "@/components/brand/logo";
import { RoleSelectionForm } from "@/components/auth/role-selection-form";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = { title: "Choose Your Role — StockSense" };

export default async function OnboardingPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const currentRole = (user.publicMetadata?.role as string | undefined) ?? null;

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 p-4 sm:p-6">
      <div className="w-full max-w-2xl space-y-6">
        <div className="text-center">
          <div className="inline-flex justify-center mb-2">
            <Logo />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Choose Your Role
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            StockSense tailors your interface, permissions, and tools according to your job responsibilities.
          </p>
        </div>

        <Card className="border-border shadow-sm">
          <CardContent className="p-6">
            <RoleSelectionForm currentRole={currentRole} />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
