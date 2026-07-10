import { test, expect, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

/**
 * Property CRUD happy path + RLS isolation (M1-W2-02 acceptance).
 * Runs against local Supabase (`supabase start`); users are created via the
 * admin API and cleaned up afterwards.
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

test.skip(
  !supabaseUrl || !serviceRoleKey,
  "Supabase env vars not configured — see .env.example"
);

const landlordEmail = `e2e-props-a+${Date.now()}@example.com`;
const otherEmail = `e2e-props-b+${Date.now()}@example.com`;
const password = "e2e-Passw0rd!";

function adminClient() {
  return createClient(supabaseUrl!, serviceRoleKey!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

let otherPropertyId: string;

test.beforeAll(async () => {
  const admin = adminClient();
  const { error: aErr } = await admin.auth.admin.createUser({
    email: landlordEmail,
    password,
    email_confirm: true,
    user_metadata: { full_name: "E2E Landlord A" },
  });
  expect(aErr).toBeNull();

  const { data: b, error: bErr } = await admin.auth.admin.createUser({
    email: otherEmail,
    password,
    email_confirm: true,
    user_metadata: { full_name: "E2E Landlord B" },
  });
  expect(bErr).toBeNull();

  // A property owned by landlord B — landlord A must never see it.
  const { data: prop, error: pErr } = await admin
    .from("properties")
    .insert({
      owner_id: b!.user!.id,
      address_line_1: "Blk 999 Yishun Ring Road",
      postal_code: "760999",
      property_type: "hdb",
    })
    .select("id")
    .single();
  expect(pErr).toBeNull();
  otherPropertyId = prop!.id;
});

test.afterAll(async () => {
  const admin = adminClient();
  // Properties block user deletion (FK restrict — no cascades on user data),
  // so remove them first.
  const { data } = await admin.auth.admin.listUsers();
  for (const email of [landlordEmail, otherEmail]) {
    const user = data.users.find((u) => u.email === email);
    if (user) {
      await admin.from("properties").delete().eq("owner_id", user.id);
      await admin.auth.admin.deleteUser(user.id);
    }
  }
});

async function logIn(page: Page) {
  await page.goto("/login");
  await page.getByRole("tab", { name: "Password" }).click();
  await page.getByRole("textbox", { name: "Email" }).fill(landlordEmail);
  await page.getByRole("textbox", { name: "Password" }).fill(password);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/app\/dashboard/);
}

test.describe.configure({ mode: "serial" });

test("add → list → edit → delete, with postal validation", async ({ page }) => {
  await logIn(page);

  // Empty state
  await page.goto("/app/properties");
  await expect(page.getByText("Add your first property")).toBeVisible();
  await page.getByRole("link", { name: "Add property" }).click();
  await expect(page).toHaveURL(/\/app\/properties\/new/);

  // Invalid postal shows an inline error and stays on the form
  await page.getByLabel("Block and street").fill("Blk 123 Bishan Street 13");
  await page.getByLabel("Unit").fill("#08-123");
  await page.getByLabel("Postal code").fill("123");
  await page.getByLabel("Property type").click();
  await page.getByRole("option", { name: "HDB" }).click();
  await page.getByRole("button", { name: "Add property" }).click();
  await expect(
    page.getByText("Postal code must be exactly 6 digits.")
  ).toBeVisible();
  await expect(page).toHaveURL(/\/app\/properties\/new/);

  // Valid postal creates the property and lands on its detail page
  await page.getByLabel("Postal code").fill("570123");
  await page.getByLabel("Bedrooms").fill("3");
  await page.getByRole("button", { name: "Add property" }).click();
  await expect(page).toHaveURL(/\/app\/properties\/[0-9a-f-]{36}$/);
  await expect(
    page.getByRole("heading", { name: /Blk 123 Bishan Street 13, #08-123/ })
  ).toBeVisible();

  // Appears in the list
  await page.getByRole("link", { name: "← Properties" }).click();
  await expect(page.getByText("Blk 123 Bishan Street 13, #08-123")).toBeVisible();
  await expect(page.getByText("Singapore 570123 · 3 bed")).toBeVisible();

  // Edit
  await page.getByText("Blk 123 Bishan Street 13, #08-123").click();
  await page.getByRole("link", { name: "Edit" }).click();
  await expect(page).toHaveURL(/\/edit$/);
  await page.getByLabel("Unit").fill("#09-456");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(
    page.getByRole("heading", { name: /Blk 123 Bishan Street 13, #09-456/ })
  ).toBeVisible();

  // Delete, with confirm dialog
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(page.getByText("Delete this property?")).toBeVisible();
  await page.getByRole("button", { name: "Delete property" }).click();
  await expect(page).toHaveURL(/\/app\/properties$/);
  await expect(page.getByText("Add your first property")).toBeVisible();
});

test("cannot see another landlord's property", async ({ page }) => {
  await logIn(page);

  // Not in the list
  await page.goto("/app/properties");
  await expect(page.getByText("Blk 999 Yishun Ring Road")).not.toBeVisible();

  // Direct URL access reads as not-found — RLS makes it indistinguishable
  // from a property that doesn't exist
  await page.goto(`/app/properties/${otherPropertyId}`);
  await expect(page.getByText("Property not found")).toBeVisible();

  // Edit URL is blocked the same way
  await page.goto(`/app/properties/${otherPropertyId}/edit`);
  await expect(page.getByText("Property not found")).toBeVisible();
});
