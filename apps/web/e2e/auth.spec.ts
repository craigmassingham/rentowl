import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

/**
 * Auth happy path against the hosted Supabase project.
 * Requires NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and
 * SUPABASE_SERVICE_ROLE_KEY in apps/web/.env.local.
 *
 * Magic-link login is tested manually until local Supabase (with email
 * capture) is set up — see DECISIONS.md ADR-003.
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

test.skip(
  !supabaseUrl || !serviceRoleKey,
  "Supabase env vars not configured — see .env.example"
);

const testEmail = `e2e+${Date.now()}@rentowl.test`;
const testPassword = "e2e-Passw0rd!";
const testName = "E2E Landlord";

function adminClient() {
  return createClient(supabaseUrl!, serviceRoleKey!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

test.afterAll(async () => {
  // Clean up the test user so runs stay idempotent.
  const admin = adminClient();
  const { data } = await admin.auth.admin.listUsers();
  const user = data.users.find((u) => u.email === testEmail);
  if (user) {
    await admin.auth.admin.deleteUser(user.id);
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
  await page.getByLabel("Email").fill(testEmail);
  await page.getByLabel("Password").fill(testPassword);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/auth\/verify/);
  await expect(page.getByText("Check your email")).toBeVisible();
});

test("login → dashboard → session persists → logout", async ({ page }) => {
  // Confirm the user's email via the admin API — hosted Supabase can't
  // intercept confirmation emails in tests. Real users still verify by email.
  const admin = adminClient();
  const { data } = await admin.auth.admin.listUsers();
  const user = data.users.find((u) => u.email === testEmail);
  expect(user).toBeTruthy();
  await admin.auth.admin.updateUserById(user!.id, { email_confirm: true });

  await page.goto("/login");
  await page.getByRole("tab", { name: "Password" }).click();
  await page.getByLabel("Email").fill(testEmail);
  await page.getByLabel("Password").fill(testPassword);
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
