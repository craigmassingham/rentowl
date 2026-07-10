import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@rentowl/db";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createSupabaseServerClient({
    getAll() {
      return request.cookies.getAll();
    },
    setAll(cookiesToSet) {
      cookiesToSet.forEach(({ name, value }) =>
        request.cookies.set(name, value)
      );
      response = NextResponse.next({ request });
      cookiesToSet.forEach(({ name, value, options }) =>
        response.cookies.set(name, value, options)
      );
    },
  });

  // Refreshes the session if expired. Do not run other logic between
  // client creation and getUser() — see Supabase SSR docs.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  if (!user && path.startsWith("/app")) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  if (user && (path === "/login" || path === "/signup")) {
    const url = request.nextUrl.clone();
    url.pathname = "/app/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/app/:path*", "/login", "/signup"],
};
