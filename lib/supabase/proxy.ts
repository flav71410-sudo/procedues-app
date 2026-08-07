import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },

        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          response = NextResponse.next({
            request,
          });

          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  const routesPubliques = [
    "/",
    "/register",
    "/mot-de-passe-oublie",
    "/auth/callback",
  ];

  const routePublique = routesPubliques.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  /*
   * Utilisateur non connecté :
   * toutes les pages privées redirigent vers la connexion.
   */
  if (!user && !routePublique) {
    const url = request.nextUrl.clone();

    url.pathname = "/";
    url.searchParams.set("redirectTo", pathname);

    return NextResponse.redirect(url);
  }

  /*
   * Utilisateur déjà connecté :
   * la page de connexion redirige vers le dashboard.
   */
  if (user && pathname === "/") {
    const destinationDemandee = request.nextUrl.searchParams.get("redirectTo");

    const url = request.nextUrl.clone();
    url.pathname =
      destinationDemandee?.startsWith("/") ? destinationDemandee : "/dashboard";
    url.search = "";

    return NextResponse.redirect(url);
  }

  return response;
}