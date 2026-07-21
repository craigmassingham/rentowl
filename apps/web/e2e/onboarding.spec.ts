import { test, expect, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

/**
 * Guided onboarding flow (M1-W4-01): empty dashboard → property → tenancy →
 * agreement, resumable. The property→tenancy portion needs no AI; the final
 * agreement step makes a live Opus call, so that test is key-gated.
 * Runs against local Supabase (`supabase start`).
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const hasAnthropicKey = Boolean(process.env.ANTHROPIC_API_KEY);

test.skip(
  !supabaseUrl || !serviceRoleKey,
  "Supabase env vars not configured — see .env.example"
);

const password = "e2e-Passw0rd!";

function adminClient() {
  return createClient(supabaseUrl!, serviceRoleKey!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// Tenancy dates for the calendar: 15th of this month to the 14th two months on.
const now = new Date();
const startDate = new Date(now.getFullYear(), now.getMonth(), 15);
const endDate = new Date(now.getFullYear(), now.getMonth() + 2, 14);

function dayAriaLabel(date: Date): RegExp {
  const d = date.getDate();
  const month = date.toLocaleString("en-US", { month: "long" });
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
  const calendar = page.locator('[data-slot="popover-content"]').last();
  const nextMonth = calendar.getByRole("button", { name: /next month/i });
  for (let i = 0; i < monthsAhead; i++) await nextMonth.click();
  await calendar.getByRole("button", { name: dayAriaLabel(date) }).click();
}

async function newLandlord(fullName: string): Promise<string> {
  const admin = adminClient();
  const email = `e2e-onboard+${Date.now()}-${Math.random().toString(36).slice(2, 7)}@example.com`;
  const { error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  expect(error).toBeNull();
  return email;
}

async function cleanUp(email: string) {
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
}

async function logIn(page: Page, email: string) {
  await page.goto("/login");
  await page.getByRole("tab", { name: "Password" }).click();
  await page.getByRole("textbox", { name: "Email" }).fill(email);
  await page.getByRole("textbox", { name: "Password" }).fill(password);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/app\/dashboard/);
}

async function fillPropertyStep(page: Page) {
  await page.getByLabel("Block and street").fill("Blk 12 Ang Mo Kio Avenue 3");
  await page.getByLabel("Postal code").fill("560012");
  await page.getByLabel("Property type").click();
  await page.getByRole("option", { name: "HDB" }).click();
  await page.getByRole("button", { name: "Save & continue" }).click();
}

async function fillTenancyStep(page: Page) {
  await page.getByLabel("Tenant name").fill("Nadia Rahim");
  await page.getByLabel("Tenant email").fill("nadia.rahim@example.com");
  await page.getByLabel("Tenant phone").fill("9123 4567");
  await pickDate(page, "Start date", startDate, 0);
  await pickDate(page, "End date", endDate, 2);
  await page.getByLabel("Monthly rent (S$)").fill("2600");
  await page.getByLabel("Rent due on day").click();
  await page.getByRole("option", { name: "1", exact: true }).click();
  await page.getByRole("button", { name: "Save & continue" }).click();
}

test("empty dashboard guides into onboarding; property advances to tenancy and resumes", async ({
  page,
}) => {
  const email = await newLandlord("Tessa Lim");
  try {
    await logIn(page, email);

    // Empty-state dashboard offers guided setup
    await expect(page.getByText("Let's get you set up")).toBeVisible();
    await page.getByRole("link", { name: "Start setup" }).click();
    await expect(page).toHaveURL(/\/app\/onboarding/);
    await expect(page.getByRole("heading", { name: "Add your property" })).toBeVisible();

    // Property step → advances to tenancy step at the same URL
    await fillPropertyStep(page);
    await expect(page).toHaveURL(/\/app\/onboarding/);
    await expect(page.getByRole("heading", { name: "Add the tenancy" })).toBeVisible();

    // Save-and-come-back: leaving and returning resumes at the tenancy step
    await page.goto("/app/dashboard");
    await page.goto("/app/onboarding");
    await expect(page.getByRole("heading", { name: "Add the tenancy" })).toBeVisible();
  } finally {
    await cleanUp(email);
  }
});

test("completes onboarding through agreement generation", async ({ page }) => {
  test.skip(!hasAnthropicKey, "ANTHROPIC_API_KEY not set — TA generation is live");
  test.setTimeout(120_000);

  const email = await newLandlord("Gerald Teo");
  try {
    await logIn(page, email);
    await page.getByRole("link", { name: "Start setup" }).click();

    await fillPropertyStep(page);
    await expect(page.getByRole("heading", { name: "Add the tenancy" })).toBeVisible();

    await fillTenancyStep(page);
    await expect(page.getByRole("heading", { name: "Generate the agreement" })).toBeVisible();

    // Final step generates the TA (live Opus) and lands on the agreement page
    await page.getByRole("button", { name: "Generate agreement" }).click();
    await expect(page).toHaveURL(/\/agreement\/[0-9a-f-]{36}$/, { timeout: 60_000 });
    await expect(page.getByText("Version 1 ·")).toBeVisible();

    // Onboarding is complete → returning to /app/onboarding sends to dashboard,
    // which now shows the set-up summary
    await page.goto("/app/onboarding");
    await expect(page).toHaveURL(/\/app\/dashboard/);
    await expect(page.getByText("Active tenancies")).toBeVisible();
    await expect(page.getByRole("link", { name: /Ang Mo Kio/ })).toBeVisible();
  } finally {
    await cleanUp(email);
  }
});
