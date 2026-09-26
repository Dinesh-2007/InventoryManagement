"use server";

import { revalidatePath } from "next/cache";
import { currentUser } from "@clerk/nextjs/server";
import { createClient } from "@/lib/supabase/server";
import { friendlyDbError } from "@/lib/errors";
import type { ActionResult } from "@/lib/action-result";
import { updateProfileSchema, type UpdateProfileInput } from "@/lib/validations/profile";

export async function updateProfile(input: UpdateProfileInput): Promise<ActionResult> {
  const parsed = updateProfileSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const clerkUser = await currentUser();
  if (!clerkUser) return { ok: false, error: "Your session has expired. Please sign in again." };

  const supabase = createClient();
  const { fullName, phone, avatarUrl } = parsed.data;
  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: fullName,
      phone: phone ? phone : null,
      avatar_url: avatarUrl ? avatarUrl : null,
    })
    .eq("clerk_user_id", clerkUser.id);

  if (error) return { ok: false, error: friendlyDbError(error, "profile update") };

  revalidatePath("/profile");
  return { ok: true, message: "Profile updated." };
}
