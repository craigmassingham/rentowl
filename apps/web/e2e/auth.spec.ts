import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

/**
 * Auth happy path against the hosted Supabase project.
 * Requires NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and
 * SUPABASE_SERVICE_ROLE_KEY in apps/web/.env.local.
 *
 * Magic-link login is tested manually until local Supabase (with email
 * capture) is set up — see DECISIONS.md ADR-003.
 *
 * Hosted Supabase constraints (until local Supabase / custom SMTP):
 * - Reserved TLDs like .test are rejected as undeliverable, so test users
 *   use @example.com.
 * - The built-in mailer allows only a few emails per hour, so the UI signup
 *   test skips itself when rate-limited, and the login test creates its user
 *   via the admin API (sends no email) rather than depending on UI signup.
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

test.skip(
  !supabaseUrl || !serviceRoleKey,
  "Supabase env vars not configured — see .env.example"
);

const signupEmail = `e2e-signup+${Date.now()}@example.com`;
const loginEmail = `e2e-login+${Date.now()}@example.com`;
const testPassword = "e2e-Passw0rd!";
const testName = "E2E Landlord";

function adminClient() {
  return createClient(supabaseUrl!, serviceRoleKey!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

test.afterAll(async () => {
  // Clean up test users so runs stay idempotent.
  const admin = adminClient();
  const { data } = await admin.auth.admin.listUsers();
  for (const email of [signupEmail, loginEmail]) {
    const user = data.users.find((u) => u.email === email);
    if (user) {
      await admin.auth.admin.deleteUser(user.id);
    }
  }
});

test.describe.configure({ mode: "serial" });

test("logged-out visit to /app/dashboard redirects to /login", async ({
  page,
}) => {
  await page.goto("/app/dashboard");
  await expect(page).toHaveURL(/\/login/);
});

test("signup lands on the verify-email page", async ({ page }) => {
  await page.goto("/signup");
  await page.getByLabel("Full name").fill(testName);
  await page.getByLabel("Email").fill(signupEmail);
  await page.getByLabel("Password").fill(testPassword);

  const signupResponse = page.waitForResponse((res) =>
    res.url().includes("/auth/v1/signup")
  );
  await page.getByRole("button", { name: "Create account" }).click();
  const status = (await signupResponse).status();

  // The hosted Supabase built-in mailer allows only a few emails per hour.
  // A rate-limited signup is an environment constraint, not an app bug.
  test.skip(status === 429, "Supabase email rate limit reached — rerun later");

  await expect(page).toHaveURL(/\/auth\/verify/);
  await expect(page.getByText("Check your email")).toBeVisible();
});

test("login → dashboard → session persists → logout", async ({ page }) => {
  // Create a confirmed user via the admin API — sends no email, so this test
  // is immune to the hosted mailer's rate limit. Real users verify by email.
  const admin = adminClient();
  const { error } = await admin.auth.admin.createUser({
    email: loginEmail,
    password: testPassword,
    email_confirm: true,
    user_metadata: { full_name: testName },
  });
  expect(error).toBeNull();

  await page.goto("/login");
  await page.getByRole("tab", { name: "Password" }).click();
  await page.getByRole("textbox", { name: "Email" }).fill(loginEmail);
  await page.getByRole("textbox", { name: "Password" }).fill(testPassword);
  await page.getByRole("button", { name: "Log in" }).click();

  await expect(page).toHaveURL(/\/app\/dashboard/);
  await expect(page.getByText(`Hello, ${testName}`)).toBeVisible();

  // Session persists on reload.
  await page.reload();
  await expect(page.getByText(`Hello, ${testName}`)).toBeVisible();

  // Logout returns to /login and the dashboard is locked again.
  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page).toHaveURL(/\/login/);
  await page.goto("/app/dashboard");
  await expect(page).toHaveURL(/\/login/);
});
