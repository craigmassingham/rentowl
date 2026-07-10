import type { AuthError } from "@supabase/supabase-js";

// Per product principle #7 (CLAUDE.md §3): every error message tells the
// user what to do next. Map Supabase auth error codes to actionable copy.
const messagesByCode: Record<string, string> = {
  over_email_send_rate_limit:
    "Too many emails have been sent in the past hour. Wait a while, then try again.",
  email_address_invalid:
    "That email address was rejected. Check for typos, or use a different address.",
  user_already_exists:
    "An account with this email already exists. Log in instead.",
  email_exists: "An account with this email already exists. Log in instead.",
  weak_password: "Password is too weak. Use at least 8 characters.",
  invalid_credentials: "Email or password is incorrect. Try again.",
  email_not_confirmed:
    "Verify your email first — look for the confirmation link in your inbox.",
};

export function authErrorMessage(
  error: AuthError,
  fallback: string
): string {
  return (error.code && messagesByCode[error.code]) ?? fallback;
}
