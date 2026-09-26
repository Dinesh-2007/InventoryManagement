/** Resolves a Supabase count query, logging and defaulting to 0 instead of throwing. */
export async function safeCount(p: PromiseLike<{ count: number | null; error: { message?: string } | null }>) {
  const { count, error } = await p;
  if (error) {
    console.error("[dashboard] count query failed", error);
    return 0;
  }
  return count ?? 0;
}
