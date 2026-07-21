import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const BUCKET = "tenancy-agreements";

/**
 * Streams a generated agreement PDF.
 *
 * Authorization is the RLS SELECT on tenancy_agreements: the request runs as
 * the signed-in user, so a non-party gets no row and a 404 — indistinguishable
 * from "doesn't exist". Only after that check do we pull the file from the
 * private bucket with the service-role client.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; agreementId: string }> }
) {
  const { id, agreementId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { data: agreement } = await supabase
    .from("tenancy_agreements")
    .select("version, pdf_storage_path")
    .eq("id", agreementId)
    .eq("tenancy_id", id)
    .maybeSingle();

  if (!agreement?.pdf_storage_path) {
    return new Response("Not found", { status: 404 });
  }

  const admin = createAdminClient();
  const { data: file, error } = await admin.storage
    .from(BUCKET)
    .download(agreement.pdf_storage_path);

  if (error || !file) {
    return new Response("The PDF could not be retrieved.", { status: 502 });
  }

  return new Response(file, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="tenancy-agreement-v${agreement.version}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
