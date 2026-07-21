import { test, expect, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { toISODate } from "@rentowl/shared";

/**
 * Basic dashboard (M1-W4-02): count + upcoming cards and per-property
 * quick actions. No AI — agreement rows are seeded via the admin client, so
 * this runs without ANTHROPIC_API_KEY. Against local Supabase.
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

test.skip(
  !supabaseUrl || !serviceRoleKey,
  "Supabase env vars not configured — see .env.example"
);

const email = `e2e-dashboard+${Date.now()}@example.com`;
const password = "e2e-Passw0rd!";

function adminClient() {
  return createClient(supabaseUrl!, serviceRoleKey!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function isoOffsetMonths(months: number): string {
  const d = new Date();
  return toISODate(new Date(d.getFullYear(), d.getMonth() + months, 15));
}

let propertyIds: string[] = [];

test.beforeAll(async () => {
  const admin = adminClient();
  const { data: user, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: "Dara Menon" },
  });
  expect(error).toBeNull();
  const ownerId = user!.user!.id;

  // Three properties exercising the three quick-action states:
  //  A — active tenancy WITH an agreement  → "View tenancy"
  //  B — active tenancy WITHOUT an agreement → "Generate agreement"
  //  C — no tenancy                          → "Add tenancy"
  const { data: props } = await admin
    .from("properties")
    .insert([
      { owner_id: ownerId, address_line_1: "Blk 1 Serangoon Central", postal_code: "550001", property_type: "hdb" },
      { owner_id: ownerId, address_line_1: "2 Orchard Turn", postal_code: "238801", property_type: "condo" },
      { owner_id: ownerId, address_line_1: "3 Sixth Avenue", postal_code: "276472", property_type: "landed" },
    ])
    .select("id");
  propertyIds = (props ?? []).map((p) => p.id);

  const { data: tenancies } = await admin
    .from("tenancies")
    .insert([
      {
        property_id: propertyIds[0],
        prospective_tenant: { full_name: "Amir Khan", email: "amir@example.com", phone: "+6591110000" },
        start_date: isoOffsetMonths(-2),
        end_date: isoOffsetMonths(9),
        monthly_rent_sgd: 3000,
        deposit_sgd: 3000,
        payment_day: 15,
        status: "active",
      },
      {
        property_id: propertyIds[1],
        prospective_tenant: { full_name: "Beatrice Ong", email: "bea@example.com", phone: "+6592220000" },
        start_date: isoOffsetMonths(-1),
        end_date: isoOffsetMonths(11),
        monthly_rent_sgd: 5200,
        deposit_sgd: 5200,
        payment_day: 1,
        status: "active",
      },
    ])
    .select("id, property_id");

  const tenancyA = tenancies!.find((t) => t.property_id === propertyIds[0])!;
  await admin.from("tenancy_agreements").insert({
    tenancy_id: tenancyA.id,
    version: 1,
    status: "draft",
    clauses: {},
    pdf_storage_path: `${tenancyA.id}/v1.pdf`,
  });
});

test.afterAll(async () => {
  const admin = adminClient();
  const { data } = await admin.auth.admin.listUsers();
  const user = data.users.find((u) => u.email === email);
  if (!user) return;
  const { data: props } = await admin.from("properties").select("id").eq("owner_id", user.id);
  for (const p of props ?? []) {
    const { data: tens } = await admin.from("tenancies").select("id").eq("property_id", p.id);
    for (const t of tens ?? []) {
      await admin.from("tenancy_agreements").delete().eq("tenancy_id", t.id);
    }
    await admin.from("tenancies").delete().eq("property_id", p.id);
  }
  await admin.from("properties").delete().eq("owner_id", user.id);
  await admin.auth.admin.deleteUser(user.id);
});

async function logIn(page: Page) {
  await page.goto("/login");
  await page.getByRole("tab", { name: "Password" }).click();
  await page.getByRole("textbox", { name: "Email" }).fill(email);
  await page.getByRole("textbox", { name: "Password" }).fill(password);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/app\/dashboard/);
}

test("shows counts, upcoming cards, and per-property quick actions", async ({ page }) => {
  await logIn(page);

  // Count + list cards ("Properties" alone collides with the nav link)
  await expect(page.getByText("Active tenancies")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Your properties" })).toBeVisible();

  // Upcoming cards render with the seeded specifics
  await expect(page.getByText("Next rent due")).toBeVisible();
  await expect(page.getByText("Next renewal")).toBeVisible();
  // Beatrice pays on day 1 (soonest); Amir's tenancy renews first (9 months)
  await expect(page.getByText("Beatrice", { exact: false })).toBeVisible();
  await expect(page.getByText(/Serangoon Central · in \d+ days/)).toBeVisible();

  // The three quick-action states are each present
  await expect(page.getByRole("link", { name: "View tenancy" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Generate agreement" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Add tenancy" })).toBeVisible();

  // Quick action routes to the right place
  await page.getByRole("link", { name: "Add tenancy" }).click();
  await expect(page).toHaveURL(new RegExp(`/app/properties/${propertyIds[2]}/tenancies/new`));
});
