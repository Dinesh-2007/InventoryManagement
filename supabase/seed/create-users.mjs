// Creates the two demo auth users for StockSense and sets the manager role.
// auth.users can't be populated safely from raw SQL (password hashing goes
// through Supabase Auth), so this uses the service-role admin client
// instead. Run with:
//   node --env-file=.env.local supabase/seed/create-users.mjs
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Run with --env-file=.env.local."
  );
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const demoUsers = [
  {
    email: "manager@stocksense.app",
    password: "Manager@123",
    login_id: "manager",
    full_name: "Arun Suresh",
    role: "inventory_manager",
  },
  {
    email: "staff@stocksense.app",
    password: "Staff@123",
    login_id: "warehouse.staff",
    full_name: "Priya Kumar",
    role: "warehouse_staff",
  },
];

async function findExistingUser(email) {
  // listUsers doesn't support filtering by email server-side in all SDK
  // versions, so page through (there are only ever a handful of users here).
  let page = 1;
  const perPage = 200;
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const found = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (found) return found;
    if (data.users.length < perPage) return null;
    page += 1;
  }
}

async function ensureUser(spec) {
  const existing = await findExistingUser(spec.email);

  let userId;
  if (existing) {
    userId = existing.id;
    console.log(`User already exists: ${spec.email} (${userId})`);
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email: spec.email,
      password: spec.password,
      email_confirm: true,
      user_metadata: { full_name: spec.full_name, login_id: spec.login_id },
    });
    if (error) throw error;
    userId = data.user.id;
    console.log(`Created user: ${spec.email} (${userId})`);
  }

  if (spec.role === "inventory_manager") {
    const { error: updErr } = await admin
      .from("profiles")
      .update({ role: "inventory_manager" })
      .eq("id", userId);
    if (updErr) throw updErr;
    console.log(`  -> role set to inventory_manager`);
  }

  return { ...spec, id: userId };
}

async function main() {
  const results = [];
  for (const spec of demoUsers) {
    results.push(await ensureUser(spec));
  }

  console.log("\n=== Demo credentials ===");
  for (const r of results) {
    console.log(
      `${r.role.padEnd(18)} email: ${r.email.padEnd(28)} password: ${r.password.padEnd(14)} login_id: ${r.login_id}`
    );
  }
}

main().catch((err) => {
  console.error("Failed to seed demo users:", err);
  process.exit(1);
});
