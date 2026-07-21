-- M1-W3-03: private Storage bucket for generated TA PDFs.
--
-- No storage RLS policies: the browser never touches Storage directly.
-- Uploads and downloads both go through Next.js server code using the
-- service-role key, which authorizes the caller against tenancy_agreements
-- RLS first (a party of the tenancy) and only then streams the file. This
-- keeps signed URLs and public access off entirely — the PDF contains
-- personal data (parties, rent, address) and must stay private (SECURITY.md).

insert into storage.buckets (id, name, public)
values ('tenancy-agreements', 'tenancy-agreements', false)
on conflict (id) do nothing;
