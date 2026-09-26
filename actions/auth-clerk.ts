"use server";

import { redirect } from "next/navigation";
import { clerkClient, currentUser } from "@clerk/nextjs/server";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/action-result";
import { signupSchema, type SignupInput } from "@/lib/validations/auth";

/**
 * Clerk-native signup action.
 * 1. Creates Clerk user
 * 2. Stores role in Clerk publicMetadata (server-side only — never trust client)
 * 3. Creates/syncs profile in Supabase profiles table
 */
export async function clerkSignUp(input: SignupInput): Promise<ActionResult> {
  const parsed = signupSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const { fullName, email, loginId, role, password } = parsed.data;

  // Validate role is one of the allowed values (double-check server-side)
  if (role !== "inventory_manager" && role !== "warehouse_staff") {
    return { ok: false, error: "Invalid role selected." };
  }

  const clerk = await clerkClient();

  // Check if email is already taken
  const existingByEmail = await clerk.users.getUserList({ emailAddress: [email] });
  if (existingByEmail.totalCount > 0) {
    return {
      ok: false,
      error: "An account with this email already exists.",
      fieldErrors: { email: "Already in use" },
    };
  }

  // Check if loginId (username) is already taken in Supabase profiles
  const supabase = createClient();
  const { data: loginIdTaken } = await supabase
    .from("profiles")
    .select("id")
    .ilike("login_id", loginId)
    .maybeSingle();
  if (loginIdTaken) {
    return {
      ok: false,
      error: `Login ID "${loginId}" is already taken.`,
      fieldErrors: { loginId: "Already taken" },
    };
  }

  let clerkUserId: string;
  try {
    // Create the Clerk user
    const newUser = await clerk.users.createUser({
      emailAddress: [email],
      password,
      firstName: fullName.split(" ")[0],
      lastName: fullName.split(" ").slice(1).join(" ") || undefined,
      // publicMetadata is server-only; clients cannot read or forge it
      publicMetadata: {
        role,
        onboarding_complete: false,
      },
    });
    clerkUserId = newUser.id;
  } catch (err: unknown) {
    const clerkErr = err as { errors?: Array<{ code: string; message: string }> };
    const firstError = clerkErr?.errors?.[0];
    if (firstError?.code === "form_password_pwned") {
      return { ok: false, error: "This password has appeared in a data breach. Choose a different password." };
    }
    if (firstError?.code === "form_identifier_exists") {
      return { ok: false, error: "An account with this email already exists.", fieldErrors: { email: "Already in use" } };
    }
    console.error("[clerk-signup] createUser failed", err);
    return { ok: false, error: "Could not create the account. Please try again." };
  }

  // Create the Supabase profile (service_role bypasses RLS)
  const { error: profileError } = await supabase.from("profiles").insert({
    clerk_user_id: clerkUserId,
    email,
    full_name: fullName,
    login_id: loginId,
    role,
    status: "active",
  });

  if (profileError) {
    // Rollback: delete the Clerk user to avoid orphaned accounts
    try {
      await clerk.users.deleteUser(clerkUserId);
    } catch {
      console.error("[clerk-signup] failed to rollback Clerk user", clerkUserId);
    }
    console.error("[clerk-signup] profile insert failed", profileError);
    return { ok: false, error: "Could not create the account profile. Please try again." };
  }

  // 4. If Warehouse Staff, assign warehouse/location access (single warehouse, not all)
  if (role === "warehouse_staff") {
    try {
      const { data: defaultWh } = await supabase
        .from("warehouses")
        .select("id")
        .eq("active", true)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (defaultWh) {
        await supabase.from("user_warehouse_access").insert({
          clerk_user_id: clerkUserId,
          warehouse_id: defaultWh.id,
          granted_by: "system_signup",
        });

        const { data: defaultLocs } = await supabase
          .from("locations")
          .select("id")
          .eq("warehouse_id", defaultWh.id)
          .eq("active", true)
          .limit(2);

        if (defaultLocs && defaultLocs.length > 0) {
          await supabase.from("user_location_access").insert(
            defaultLocs.map((loc) => ({
              clerk_user_id: clerkUserId,
              location_id: loc.id,
              granted_by: "system_signup",
            }))
          );
        }
      }
    } catch (err) {
      console.error("[clerk-signup] failed to assign initial warehouse access", err);
    }
  }

  // Redirect based on role after successful signup
  // They will need to sign in to get a session
  return {
    ok: true,
    message: "Account created! Sign in to access your dashboard.",
  };
}

/**
 * Sets or updates the role for the currently authenticated Clerk user.
 * Used during onboarding or whenever an account is missing role metadata.
 */
export async function setAccountRole(
  role: "inventory_manager" | "warehouse_staff"
): Promise<ActionResult<{ redirectUrl: string }>> {
  if (role !== "inventory_manager" && role !== "warehouse_staff") {
    return { ok: false, error: "Invalid role selected." };
  }

  const clerkUser = await currentUser();
  if (!clerkUser) {
    return { ok: false, error: "You must be signed in to select a role." };
  }

  const clerk = await clerkClient();
  await clerk.users.updateUserMetadata(clerkUser.id, {
    publicMetadata: {
      role,
      onboarding_complete: true,
    },
  });

  const email = clerkUser.emailAddresses[0]?.emailAddress ?? "";
  const fullName =
    clerkUser.fullName ||
    clerkUser.firstName ||
    email.split("@")[0] ||
    "User";

  const supabase = createClient();

  // Find if profile exists by clerk_user_id or email
  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("id, clerk_user_id")
    .or(`clerk_user_id.eq.${clerkUser.id},email.ilike.${email}`)
    .maybeSingle();

  if (existingProfile) {
    await supabase
      .from("profiles")
      .update({
        clerk_user_id: clerkUser.id,
        role,
        full_name: fullName,
      })
      .eq("id", existingProfile.id);
  } else {
    await supabase.from("profiles").insert({
      clerk_user_id: clerkUser.id,
      email,
      full_name: fullName,
      role,
      status: "active",
    });
  }

  if (role === "warehouse_staff") {
    try {
      const { data: defaultWh } = await supabase
        .from("warehouses")
        .select("id")
        .eq("active", true)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (defaultWh) {
        await supabase.from("user_warehouse_access").upsert(
          {
            clerk_user_id: clerkUser.id,
            warehouse_id: defaultWh.id,
            granted_by: "onboarding",
          },
          { onConflict: "clerk_user_id,warehouse_id" }
        );

        const { data: defaultLocs } = await supabase
          .from("locations")
          .select("id")
          .eq("warehouse_id", defaultWh.id)
          .eq("active", true)
          .limit(2);

        if (defaultLocs && defaultLocs.length > 0) {
          await supabase.from("user_location_access").upsert(
            defaultLocs.map((loc) => ({
              clerk_user_id: clerkUser.id,
              location_id: loc.id,
              granted_by: "onboarding",
            })),
            { onConflict: "clerk_user_id,location_id" }
          );
        }
      }
    } catch (err) {
      console.error("[setAccountRole] warehouse assignment error", err);
    }
  }

  const redirectUrl =
    role === "inventory_manager" ? "/dashboard/manager" : "/dashboard/warehouse";

  return { ok: true, data: { redirectUrl } };
}
