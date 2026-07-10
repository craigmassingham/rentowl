import { test, expect, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

/**
 * Tenancy CRUD (M1-W2-03 acceptance): create on a property, DD/MM/YYYY dates,
 * S$ currency, overlapping active tenancies blocked with a clear error.
 * Runs against local Supabase (`supabase start`).
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

test.skip(
  !supabaseUrl || !serviceRoleKey,
  "Supabase env vars not configured — see .env.example"
);

const landlordEmail = `e2e-tenancy+${Date.now()}@example.com`;
const password = "e2e-Passw0rd!";

function adminClient() {
  return createClient(supabaseUrl!, serviceRoleKey!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// Tenancy dates picked via the calendar: 15th of this month to the 14th two
// months later (both always reachable with two "next month" clicks).
const now = new Date();
const startDate = new Date(now.getFullYear(), now.getMonth(), 15);
const endDate = new Date(now.getFullYear(), now.getMonth() + 2, 14);

function ddmmyyyy(date: Date): string {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${date.getFullYear()}`;
}

let propertyId: string;
let tenancyId: string;

test.beforeAll(async () => {
  const admin = adminClient();
  const { data: user, error: uErr } = await admin.auth.admin.createUser({
    email: landlordEmail,
    password,
    email_confirm: true,
    user_metadata: { full_name: "E2E Tenancy Landlord" },
  });
  expect(uErr).toBeNull();

  const { data: prop, error: pErr } = await admin
    .from("properties")
    .insert({
      owner_id: user!.user!.id,
      address_line_1: "Blk 77 Toa Payoh Lorong 4",
      address_line_2: "#05-77",
      postal_code: "310077",
      property_type: "hdb",
    })
    .select("id")
    .single();
  expect(pErr).toBeNull();
  propertyId = prop!.id;
});

test.afterAll(async () => {
  const admin = adminClient();
  const { data } = await admin.auth.admin.listUsers();
  const user = data.users.find((u) => u.email === landlordEmail);
  if (user) {
    // FK restrict chain: tenancies → properties → users_profile.
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

/** react-day-picker labels day buttons like "Wednesday, July 15th, 2026". */
function dayAriaLabel(date: Date): RegExp {
  const month = date.toLocaleString("en-US", { month: "long" });
  const d = date.getDate();
  const suffix =
    d % 10 === 1 && d !== 11
      ? "st"
      : d % 10 === 2 && d !== 12
        ? "nd"
        : d % 10 === 3 && d !== 13
          ? "rd"
          : "th";
  return new RegExp(`${month} ${d}${suffix}, ${date.getFullYear()}`);
}

async function pickDate(page: Page, triggerName: string, date: Date, monthsAhead: number) {
  await page.getByRole("button", { name: triggerName }).click();
  // Closed popovers can linger in the DOM — scope to the one just opened.
  const calendar = page.locator('[data-slot="popover-content"]').last();
  const nextMonth = calendar.getByRole("button", { name: /next month/i });
  for (let i = 0; i < monthsAhead; i++) {
    await nextMonth.click();
  }
  await calendar.getByRole("button", { name: dayAriaLabel(date) }).click();
}

async function fillTenancyForm(page: Page, rent: string) {
  await page.getByLabel("Tenant name").fill("Priya Raman");
  await page.getByLabel("Tenant email").fill("priya.raman@example.com");
  await page.getByLabel("Tenant phone").fill("9123 4567");
  await pickDate(page, "Start date", startDate, 0);
  await pickDate(page, "End date", endDate, 2);
  await page.getByLabel("Monthly rent (S$)").fill(rent);
  // Deposit left blank on purpose — records as S$0
  await page.getByLabel("Rent due on day").click();
  await page.getByRole("option", { name: "1", exact: true }).click();
}

test.describe.configure({ mode: "serial" });

test("create tenancy → detail shows DD/MM/YYYY and S$ formats", async ({ page }) => {
  await logIn(page);

  await page.goto(`/app/properties/${propertyId}`);
  await expect(page.getByText("No tenancy recorded yet.")).toBeVisible();
  await page.getByRole("link", { name: "Add tenancy" }).click();
  await expect(page).toHaveURL(new RegExp(`/app/properties/${propertyId}/tenancies/new`));

  await fillTenancyForm(page, "3200");
  await page.getByRole("button", { name: "Add tenancy" }).click();

  await expect(page).toHaveURL(/\/app\/tenancies\/[0-9a-f-]{36}$/);
  tenancyId = page.url().split("/").pop()!;
  await expect(page.getByRole("heading", { name: "Tenancy — Priya Raman" })).toBeVisible();
  await expect(page.getByText(ddmmyyyy(startDate))).toBeVisible();
  await expect(page.getByText(ddmmyyyy(endDate))).toBeVisible();
  await expect(page.getByText("S$3,200")).toBeVisible();
  await expect(page.getByText("S$0", { exact: true })).toBeVisible(); // blank deposit
  await expect(page.getByText("Day 1 of each month")).toBeVisible();
  await expect(page.getByText("+6591234567")).toBeVisible(); // normalized phone

  // Listed on the property page too
  await page.goto(`/app/properties/${propertyId}`);
  await expect(page.getByText("Priya Raman")).toBeVisible();
  await expect(
    page.getByText(`${ddmmyyyy(startDate)} – ${ddmmyyyy(endDate)} · S$3,200/mo`)
  ).toBeVisible();
});

test("overlapping active tenancy is blocked with a clear error", async ({ page }) => {
  await logIn(page);

  await page.goto(`/app/properties/${propertyId}/tenancies/new`);
  await fillTenancyForm(page, "2800");
  await page.getByRole("button", { name: "Add tenancy" }).click();

  await expect(
    page.getByText(
      "This property already has an active tenancy overlapping those dates. " +
        "End the current tenancy first, or adjust the dates."
    )
  ).toBeVisible();
  // Still on the form — nothing was created
  await expect(page).toHaveURL(new RegExp(`/app/properties/${propertyId}/tenancies/new`));
});

test("edit tenancy updates rent and status", async ({ page }) => {
  await logIn(page);

  await page.goto(`/app/tenancies/${tenancyId}/edit`);
  await expect(page.getByRole("heading", { name: "Edit tenancy" })).toBeVisible();

  await page.getByLabel("Monthly rent (S$)").fill("3500");
  await page.getByLabel("Status").click();
  await page.getByRole("option", { name: "Ended" }).click();
  await page.getByRole("button", { name: "Save changes" }).click();

  await expect(page).toHaveURL(/\/app\/tenancies\/[0-9a-f-]{36}$/);
  await expect(page.getByText("S$3,500")).toBeVisible();
  await expect(page.getByText("Ended")).toBeVisible();
});
