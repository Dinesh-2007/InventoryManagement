import type { PostgrestError } from "@supabase/supabase-js";

/**
 * Turn a Supabase/PostgREST error into a user-facing message.
 * Our database functions raise with hint = 'stocksense' and human-readable
 * messages; anything else is logged server-side and replaced with a generic one.
 */
export function friendlyDbError(error: Partial<PostgrestError> | null | undefined, context = "database"): string {
  if (!error) return "Something went wrong.";
  if (error.hint === "stocksense" && error.message) return error.message;
  switch (error.code) {
    case "23505": {
      const m = /Key \((?:lower\()?(?:upper\()?(\w+)\)*\)=\((.+?)\)/.exec(error.details ?? "");
      return m ? `${m[1].replace(/_/g, " ")} "${m[2]}" already exists.` : "A record with these details already exists.";
    }
    case "23503": return "This record is linked to other data and cannot be changed that way.";
    case "23514": return "Some values are invalid. Please check the form.";
    case "42501": return "You do not have permission to perform this action.";
    case "28000": return "Your session has expired. Please sign in again.";
    case "PGRST116": return "Record not found.";
  }
  console.error(`[${context}]`, error);
  return "Something went wrong while saving. Please try again.";
}
