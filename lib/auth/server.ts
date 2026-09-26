import "server-only";
import { currentUser } from "@clerk/nextjs/server";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export type AppRole = "inventory_manager" | "warehouse_staff";

export interface UserProfile {
  id: string; // Supabase UUID (legacy, may be null if Clerk-only user)
  clerk_user_id: string;
  full_name: string;
  email: string;
  role: AppRole;
  employee_id: string | null;
  status: string;
  login_id: string | null;
  phone: string | null;
  avatar_url: string | null;
}

export interface AuthenticatedUser {
  clerkId: string;
  email: string;
  fullName: string;
  profile: UserProfile | null;
  role: AppRole;
}

/**
 * Returns the authenticated Clerk user and their Supabase profile.
 * Redirects to /sign-in if not authenticated.
 * The role is sourced from Clerk publicMetadata (set during signup) and
 * verified against the Supabase profile — Clerk is authoritative.
 */
export async function getAuthenticatedUser(): Promise<AuthenticatedUser> {
  const clerkUser = await currentUser();
  if (!clerkUser) redirect("/sign-in");

  const clerkId = clerkUser.id;
  const email = clerkUser.emailAddresses[0]?.emailAddress ?? "";
  const fullName =
    clerkUser.fullName ||
    clerkUser.firstName ||
    email.split("@")[0] ||
    "User";

  // Role from Clerk publicMetadata (set during signup, never from client)
  const clerkRole = (clerkUser.publicMetadata?.role as AppRole | undefined) ?? "warehouse_staff";

  const supabase = createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("clerk_user_id", clerkId)
    .maybeSingle();

  // If profile doesn't exist yet (e.g., just signed up), create it
  if (!profile) {
    await supabase.from("profiles").upsert(
      {
        clerk_user_id: clerkId,
        email,
        full_name: fullName,
        role: clerkRole,
        status: "active",
      },
      { onConflict: "clerk_user_id", ignoreDuplicates: false }
    );

    const { data: newProfile } = await supabase
      .from("profiles")
      .select("*")
      .eq("clerk_user_id", clerkId)
      .maybeSingle();

    return {
      clerkId,
      email,
      fullName,
      profile: newProfile as UserProfile | null,
      role: clerkRole,
    };
  }

  // Always use Clerk's role as authoritative (not the DB profile role)
  return {
    clerkId,
    email,
    fullName,
    profile: profile as UserProfile,
    role: clerkRole,
  };
}

/**
 * Gets only the role of the current user without fetching the full profile.
 * Redirects to /sign-in if not authenticated.
 */
export async function getAuthRole(): Promise<AppRole> {
  const clerkUser = await currentUser();
  if (!clerkUser) redirect("/sign-in");
  return ((clerkUser.publicMetadata?.role as AppRole | undefined) ?? "warehouse_staff");
}

/**
 * Asserts the current user is an inventory_manager.
 * Redirects to /403 if not.
 */
export async function requireManager(): Promise<AuthenticatedUser> {
  const user = await getAuthenticatedUser();
  if (user.role !== "inventory_manager") redirect("/403");
  return user;
}

/**
 * Asserts the current user is warehouse_staff.
 * Redirects to /403 if not.
 */
export async function requireWarehouseStaff(): Promise<AuthenticatedUser> {
  const user = await getAuthenticatedUser();
  if (user.role !== "warehouse_staff") redirect("/403");
  return user;
}

export interface UserWarehouseAccess {
  isManager: boolean;
  warehouseIds: string[];
  locationIds: string[];
}

/**
 * Returns the warehouses and locations accessible to the current user.
 * Inventory managers have full company-wide visibility (isManager = true, all IDs).
 * Warehouse staff have access restricted only to their assigned warehouses/locations.
 */
export async function getCurrentUserAccess(): Promise<UserWarehouseAccess> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();

  if (user.role === "inventory_manager") {
    const [{ data: whs }, { data: locs }] = await Promise.all([
      supabase.from("warehouses").select("id").eq("active", true),
      supabase.from("locations").select("id").eq("active", true),
    ]);
    return {
      isManager: true,
      warehouseIds: (whs ?? []).map((w) => w.id),
      locationIds: (locs ?? []).map((l) => l.id),
    };
  }

  // Warehouse staff: assigned only
  const [{ data: whAccess }, { data: locAccess }] = await Promise.all([
    supabase.from("user_warehouse_access").select("warehouse_id").eq("clerk_user_id", user.clerkId),
    supabase.from("user_location_access").select("location_id").eq("clerk_user_id", user.clerkId),
  ]);

  let warehouseIds = (whAccess ?? []).map((w) => w.warehouse_id);
  let locationIds = (locAccess ?? []).map((l) => l.location_id);

  // Self-heal: If warehouse staff has no assignment yet, assign the primary warehouse
  if (warehouseIds.length === 0) {
    const { data: defaultWh } = await supabase
      .from("warehouses")
      .select("id")
      .eq("active", true)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (defaultWh) {
      await supabase.from("user_warehouse_access").insert({
        clerk_user_id: user.clerkId,
        warehouse_id: defaultWh.id,
        granted_by: "system_auto",
      });
      warehouseIds = [defaultWh.id];

      const { data: defaultLocs } = await supabase
        .from("locations")
        .select("id")
        .eq("warehouse_id", defaultWh.id)
        .eq("active", true)
        .limit(2);

      if (defaultLocs && defaultLocs.length > 0) {
        await supabase.from("user_location_access").insert(
          defaultLocs.map((loc) => ({
            clerk_user_id: user.clerkId,
            location_id: loc.id,
            granted_by: "system_auto",
          }))
        );
        locationIds = defaultLocs.map((l) => l.id);
      }
    }
  }

  return {
    isManager: false,
    warehouseIds,
    locationIds,
  };
}
