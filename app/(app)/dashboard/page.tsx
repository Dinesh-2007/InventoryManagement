import { redirect } from "next/navigation";
import { getAuthRole } from "@/lib/auth/server";

/**
 * /dashboard — redirects to the correct role-specific dashboard.
 * The proxy.ts also handles this redirect for performance, but this page
 * handles any cases the proxy misses (e.g., direct server rendering).
 */
export default async function DashboardRedirectPage() {
  const role = await getAuthRole();
  if (role === "inventory_manager") {
    redirect("/dashboard/manager");
  } else {
    redirect("/dashboard/warehouse");
  }
}
