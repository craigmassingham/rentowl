/**
 * RLS integration tests (M1-W2-01 acceptance).
 *
 * Runs against the local Supabase stack: `supabase start && supabase db reset`
 * first, then `pnpm --filter @rentowl/db test:rls`. Uses the two landlords
 * from supabase/seed/seed.sql.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { beforeAll, describe, expect, it } from "vitest";

import type { Database } from "./database.types";

const SUPABASE_URL = process.env.SUPABASE_URL ?? "http://127.0.0.1:54321";
// Well-known local-dev demo anon key issued by `supabase start`. Not a secret.
const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";

const SEED_PASSWORD = "rentowl-dev-password";
const ALICIA = { id: "11111111-1111-1111-1111-111111111111", email: "alicia.landlord@rentowl.test" };
const BEN = { id: "22222222-2222-2222-2222-222222222222", email: "ben.landlord@rentowl.test" };
const BENS_PROPERTY_ID = "bbbbbbbb-0000-0000-0000-000000000001";
const ALICIAS_TENANCY_ID = "cccccccc-0000-0000-0000-000000000001";

function anonClient(): SupabaseClient<Database> {
  return createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
  });
}

async function signIn(email: string): Promise<SupabaseClient<Database>> {
  const client = anonClient();
  const { error } = await client.auth.signInWithPassword({
    email,
    password: SEED_PASSWORD,
  });
  if (error) throw new Error(`Sign-in failed for ${email}: ${error.message}`);
  return client;
}

let alicia: SupabaseClient<Database>;
let ben: SupabaseClient<Database>;

beforeAll(async () => {
  alicia = await signIn(ALICIA.email);
  ben = await signIn(BEN.email);
});

describe("properties RLS", () => {
  it("landlords see only their own properties", async () => {
    const { data: aliciaRows, error: aliciaErr } = await alicia.from("properties").select("id, owner_id");
    expect(aliciaErr).toBeNull();
    expect(aliciaRows).toHaveLength(2);
    expect(aliciaRows!.every((p) => p.owner_id === ALICIA.id)).toBe(true);

    const { data: benRows, error: benErr } = await ben.from("properties").select("id, owner_id");
    expect(benErr).toBeNull();
    expect(benRows).toHaveLength(1);
    expect(benRows![0]!.owner_id).toBe(BEN.id);
  });

  it("user A cannot read user B's property by id", async () => {
    const { data, error } = await alicia.from("properties").select("*").eq("id", BENS_PROPERTY_ID);
    expect(error).toBeNull();
    expect(data).toHaveLength(0);
  });

  it("user A cannot update user B's property", async () => {
    const { data, error } = await alicia
      .from("properties")
      .update({ notes: "hijacked" })
      .eq("id", BENS_PROPERTY_ID)
      .select();
    expect(error).toBeNull(); // RLS filters silently — zero rows touched
    expect(data).toHaveLength(0);
  });

  it("user A cannot insert a property owned by user B", async () => {
    const { error } = await alicia.from("properties").insert({
      owner_id: BEN.id,
      address_line_1: "Blk 1 Fake Street",
      postal_code: "123456",
      property_type: "hdb",
    });
    expect(error).not.toBeNull();
    expect(error!.code).toBe("42501"); // insufficient_privilege (RLS violation)
  });

  it("unauthenticated clients are denied outright (no anon grant)", async () => {
    const { data, error } = await anonClient().from("properties").select("*");
    expect(error).not.toBeNull();
    expect(error!.code).toBe("42501"); // permission denied — anon has no table grant
    expect(data).toBeNull();
  });
});

describe("tenancies RLS", () => {
  it("owner sees the tenancy on their property", async () => {
    const { data, error } = await alicia.from("tenancies").select("id");
    expect(error).toBeNull();
    expect(data!.map((t) => t.id)).toContain(ALICIAS_TENANCY_ID);
  });

  it("another landlord cannot see it", async () => {
    const { data, error } = await ben.from("tenancies").select("*");
    expect(error).toBeNull();
    expect(data).toHaveLength(0);
  });
});

describe("users_profile RLS", () => {
  it("users read only their own profile", async () => {
    const { data, error } = await alicia.from("users_profile").select("id");
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data![0]!.id).toBe(ALICIA.id);
  });
});
