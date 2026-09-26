import type { Metadata } from "next";
import { Logo } from "@/components/brand/logo";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <div className="flex flex-col gap-6">
      <Logo />
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Welcome Back</h1>
        <p className="mt-1 text-sm text-muted-foreground">Sign in to manage your inventory</p>
      </div>
      <LoginForm next={next} />
    </div>
  );
}
