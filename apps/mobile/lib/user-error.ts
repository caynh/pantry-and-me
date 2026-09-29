/** Map thrown values to short copy that matches the rest of the app. */
export function toUserError(err: unknown, fallback: string): string {
  const message = err instanceof Error ? err.message.trim() : '';
  if (!message) return fallback;

  if (isInternalError(message)) return fallback;

  return message;
}

function isInternalError(message: string): boolean {
  return /JWT|row-level|RLS|PGRST|postgres|supabase|status \d+|ECONNREFUSED|network request failed|https?:\/\/|localhost|npm run|TypeError|AbortError/i.test(
    message,
  );
}
