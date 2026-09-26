"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { ActionResult } from "@/lib/action-result";
import {
  forgotSchema, loginSchema, resetSchema, signupSchema,
  type ForgotInput, type LoginInput, type ResetInput, type SignupInput,
} from "@/lib/validations/auth";

const NOT_CONFIGURED: ActionResult = {
  ok: false,
  error: "The server is not connected to Supabase yet. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
};

function safeNext(next: unknown) {
  return typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
}

async function resolveEmail(identifier: string): Promise<string | null> {
  if (identifier.includes("@")) return identifier.toLowerCase();
  const admin = createAdminClient();
  if (!admin) return null;
  const { data, error } = await admin
    .from("profiles")
    .select("email")
    .ilike("login_id", identifier.replace(/[%_\\]/g, "\\$&"))
    .maybeSingle();
  if (error) console.error("[auth] login id lookup failed", error);
  return data?.email ?? null;
}

export async function signIn(input: LoginInput, next?: string): Promise<ActionResult> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  if (!isSupabaseConfigured) return NOT_CONFIGURED;

  // Same message for unknown login IDs and wrong passwords (no account enumeration).
  const invalid: ActionResult = { ok: false, error: "Invalid login ID/email or password." };
  const email = await resolveEmail(parsed.data.identifier);
  if (!email) return invalid;

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password: parsed.data.password });
  if (error) {
    if (error.code === "email_not_confirmed") return { ok: false, error: "Please confirm your email address before signing in." };
    if (error.status === 429) return { ok: false, error: "Too many attempts. Please wait a minute and try again." };
    return invalid;
  }
  redirect(safeNext(next));
}

export async function signUp(input: SignupInput): Promise<ActionResult> {
  const parsed = signupSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  if (!isSupabaseConfigured) return NOT_CONFIGURED;
  const { fullName, email, loginId, password } = parsed.data;

  const supabase = await createClient();
  const { data: available, error: checkError } = await supabase.rpc("is_login_id_available", { p_login_id: loginId });
  if (checkError) console.error("[auth] login id availability check failed", checkError);
  if (available === false) return { ok: false, error: `Login ID "${loginId}" is already taken.`, fieldErrors: { loginId: "Already taken" } };

  const origin = (await headers()).get("origin") ?? "";
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName, login_id: loginId },
      emailRedirectTo: `${origin}/auth/callback`,
    },
  });
  if (error) {
    if (error.code === "user_already_exists") return { ok: false, error: "An account with this email already exists." };
    if (error.code === "weak_password") return { ok: false, error: error.message };
    console.error("[auth] sign up failed", error);
    return { ok: false, error: "Could not create the account. Please try again." };
  }
  if (!data.session) {
    return { ok: true, message: "Account created. Check your inbox to confirm your email, then sign in." };
  }
  redirect("/dashboard");
}

export async function requestPasswordReset(input: ForgotInput): Promise<ActionResult> {
  const parsed = forgotSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  if (!isSupabaseConfigured) return NOT_CONFIGURED;
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email);
  if (error) {
    if (error.status === 429) return { ok: false, error: "Too many requests. Please wait before requesting another code." };
    console.error("[auth] reset request failed", error);
  }
  // Always the same response, whether or not the account exists.
  return { ok: true, message: "If an account exists for this email, a one-time code has been sent." };
}

export async function resetPasswordWithOtp(input: ResetInput): Promise<ActionResult> {
  const parsed = resetSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  if (!isSupabaseConfigured) return NOT_CONFIGURED;
  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ email: parsed.data.email, token: parsed.data.otp, type: "recovery" });
  if (error) return { ok: false, error: "The code is invalid or has expired. Request a new one." };
  const { error: updateError } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (updateError) return { ok: false, error: updateError.message };
  redirect("/dashboard");
}

export async function signOut() {
  if (isSupabaseConfigured) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect("/login");
}
