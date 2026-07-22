import { test, expect, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

/**
 * In-product feedback button (M1-W4-03). The dialog builds a mailto on
 * submit; the E2E covers the observable UI (opens, captures text, enables
 * send) without invoking the mail client. Against local Supabase.
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

test.skip(
  !supabaseUrl || !serviceRoleKey,
  "Supabase env vars not configured — see .env.example"
);

const email = `e2e-feedback+${Date.now()}@example.com`;
const password = "e2e-Passw0rd!";

function adminClient() {
  return createClient(supabaseUrl!, serviceRoleKey!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

test.beforeAll(async () => {
  const { error } = await adminClient().auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: "Fiona Goh" },
  });
  expect(error).toBeNull();
});

test.afterAll(async () => {
  const admin = adminClient();
  const { data } = await admin.auth.admin.listUsers();
  const user = data.users.find((u) => u.email === email);
  if (user) await admin.auth.admin.deleteUser(user.id);
});

async function logIn(page: Page) {
  await page.goto("/login");
  await page.getByRole("tab", { name: "Password" }).click();
  await page.getByRole("textbox", { name: "Email" }).fill(email);
  await page.getByRole("textbox", { name: "Password" }).fill(password);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/app\/dashboard/);
}

test("feedback button opens a dialog and enables send once text is entered", async ({
  page,
}) => {
  await logIn(page);

  // Present in the app header on every /app page
  await page.getByRole("button", { name: "Feedback" }).click();
  await expect(page.getByRole("heading", { name: "Send feedback" })).toBeVisible();

  const send = page.getByRole("button", { name: "Open email" });
  await expect(send).toBeDisabled();

  await page.getByRole("textbox", { name: "Your feedback" }).fill("Looks great so far.");
  await expect(send).toBeEnabled();

  await page.getByRole("button", { name: "Cancel" }).click();
  await expect(page.getByRole("heading", { name: "Send feedback" })).toHaveCount(0);
});
