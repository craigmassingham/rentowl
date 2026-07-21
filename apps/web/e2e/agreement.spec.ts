import { readFileSync } from "node:fs";
import { test, expect, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

/**
 * TA generation UI + PDF (M1-W3-03 acceptance): select clauses → generate →
 * preview → download PDF → regenerate as v2 (v1 kept).
 *
 * Makes real Opus calls (~S$0.07 each, two per run), so it skips without
 * ANTHROPIC_API_KEY in addition to the Supabase env. Runs against local
 * Supabase (`supabase start`).
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const hasAnthropicKey = Boolean(process.env.ANTHROPIC_API_KEY);

test.skip(
  !supabaseUrl || !serviceRoleKey,
  "Supabase env vars not configured — see .env.example"
);
test.skip(!hasAnthropicKey, "ANTHROPIC_API_KEY not set — TA generation is live");

const landlordEmail = `e2e-agreement+${Date.now()}@example.com`;
const password = "e2e-Passw0rd!";

function adminClient() {
  return createClient(supabaseUrl!, serviceRoleKey!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

let propertyId: string;
let tenancyId: string;

test.beforeAll(async () => {
  const admin = adminClient();
  const { data: user, error: uErr } = await admin.auth.admin.createUser({
    email: landlordEmail,
    password,
    email_confirm: true,
    user_metadata: { full_name: "Evelyn Ong" },
  });
  expect(uErr).toBeNull();

  const { data: prop, error: pErr } = await admin
    .from("properties")
    .insert({
      owner_id: user!.user!.id,
      address_line_1: "Blk 88 Clementi Avenue 3",
      address_line_2: "#14-88",
      postal_code: "120088",
      property_type: "hdb",
    })
    .select("id")
    .single();
  expect(pErr).toBeNull();
  propertyId = prop!.id;

  const { data: tenancy, error: tErr } = await admin
    .from("tenancies")
    .insert({
      property_id: propertyId,
      prospective_tenant: {
        full_name: "Marcus Lee",
        email: "marcus.lee@example.com",
        phone: "+6598765432",
      },
      start_date: "2026-09-01",
      end_date: "2027-08-31",
      monthly_rent_sgd: 2800,
      deposit_sgd: 2800,
      payment_day: 1,
      status: "active",
    })
    .select("id")
    .single();
  expect(tErr).toBeNull();
  tenancyId = tenancy!.id;
});

test.afterAll(async () => {
  const admin = adminClient();
  const { data } = await admin.auth.admin.listUsers();
  const user = data.users.find((u) => u.email === landlordEmail);
  if (user) {
    // FK restrict chain: agreements → tenancies → properties → users_profile.
    await admin.from("tenancy_agreements").delete().eq("tenancy_id", tenancyId);
    await admin.from("tenancies").delete().eq("property_id", propertyId);
    await admin.from("properties").delete().eq("owner_id", user.id);
    await admin.auth.admin.deleteUser(user.id);
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

test("generate → preview → download → regenerate keeps v1", async ({ page }) => {
  test.setTimeout(120_000); // two live Opus generations
  await logIn(page);

  // Empty state on the tenancy
  await page.goto(`/app/tenancies/${tenancyId}`);
  await expect(page.getByText("No agreement generated yet.")).toBeVisible();

  // Generate v1
  await page.getByRole("link", { name: "Generate agreement" }).click();
  await expect(page).toHaveURL(new RegExp(`/agreement/new`));
  await expect(page.getByText("Parties and Property")).toBeVisible(); // included-clause list
  await page.getByRole("button", { name: "Generate agreement" }).click();

  // Lands on the v1 detail page with the assembled preview
  await expect(page).toHaveURL(/\/agreement\/[0-9a-f-]{36}$/, { timeout: 60_000 });
  await expect(page.getByText("Version 1 ·")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Rent and Payment" })
  ).toBeVisible();
  await expect(page.getByText("S$2,800", { exact: false }).first()).toBeVisible();
  const v1Url = page.url();

  // Download the PDF and confirm it's a real PDF
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("link", { name: "Download PDF" }).click(),
  ]);
  expect(download.suggestedFilename()).toBe("tenancy-agreement-v1.pdf");
  const path = await download.path();
  const bytes = readFileSync(path);
  expect(bytes.subarray(0, 5).toString("latin1")).toBe("%PDF-");
  expect(bytes.length).toBeGreaterThan(2000);

  // Regenerate → v2
  await page.getByRole("link", { name: "Generate new version" }).click();
  await expect(page).toHaveURL(new RegExp(`/agreement/new`));
  await page.getByRole("button", { name: "Generate agreement" }).click();
  await expect(page).toHaveURL(/\/agreement\/[0-9a-f-]{36}$/, { timeout: 60_000 });
  await expect(page.getByText("Version 2 ·")).toBeVisible();
  const v2Url = page.url();
  expect(v2Url).not.toBe(v1Url);

  // Both versions listed on the tenancy, and v1 still opens
  await page.goto(`/app/tenancies/${tenancyId}`);
  await expect(page.getByRole("link", { name: /Version 1/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Version 2/ })).toBeVisible();
  await page.goto(v1Url);
  await expect(page.getByText("Version 1 ·")).toBeVisible();
});

test("another landlord cannot open or download the agreement", async ({ browser }) => {
  // Grab v1's id from the first landlord's session-independent list via admin.
  const admin = adminClient();
  const { data: agreements } = await admin
    .from("tenancy_agreements")
    .select("id")
    .eq("tenancy_id", tenancyId)
    .order("version");
  const agreementId = agreements![0]!.id;

  // A second landlord with no relation to this tenancy
  const otherEmail = `e2e-agreement-other+${Date.now()}@example.com`;
  await admin.auth.admin.createUser({
    email: otherEmail,
    password,
    email_confirm: true,
    user_metadata: { full_name: "Intruder" },
  });

  const ctx = await browser.newContext();
  const otherPage = await ctx.newPage();
  await otherPage.goto("/login");
  await otherPage.getByRole("tab", { name: "Password" }).click();
  await otherPage.getByRole("textbox", { name: "Email" }).fill(otherEmail);
  await otherPage.getByRole("textbox", { name: "Password" }).fill(password);
  await otherPage.getByRole("button", { name: "Log in" }).click();
  await expect(otherPage).toHaveURL(/\/app\/dashboard/);

  // Detail page 404s (RLS hides the row) — notFound() renders the tenancy
  // route's not-found boundary
  await otherPage.goto(`/app/tenancies/${tenancyId}/agreement/${agreementId}`);
  await expect(otherPage.getByText(/not found/i)).toBeVisible();
  await expect(otherPage.getByText("Version 1 ·")).toHaveCount(0);

  // Download route refuses (404, not the PDF)
  const resp = await otherPage.request.get(
    `/app/tenancies/${tenancyId}/agreement/${agreementId}/download`
  );
  expect(resp.status()).toBe(404);

  await ctx.close();
  const { data } = await admin.auth.admin.listUsers();
  const intruder = data.users.find((u) => u.email === otherEmail);
  if (intruder) await admin.auth.admin.deleteUser(intruder.id);
});
