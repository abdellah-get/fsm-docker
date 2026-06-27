import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: "", ...options });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({ name, value: "", ...options });
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const currentPath = request.nextUrl.pathname;

  // PROTECTION 1 : Utilisateur NON connecté
  if (!user && currentPath.startsWith("/dashboard")) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // PROTECTION 2 : Utilisateur CONNECTÉ (Gestion des rôles)
  if (user) {
    const { data: profile } = await supabase
      .from("utilisateurs")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    const role = profile?.role; // 'GERANT' ou 'TECHNICIEN'

    if (!role) {
      return response;
    }

    // Redirection intelligente depuis le login
    if (currentPath === "/login") {
      const url = request.nextUrl.clone();
      url.pathname =
        role === "TECHNICIEN" ? "/dashboard/mes-interventions" : "/dashboard";
      return NextResponse.redirect(url);
    }

    // 🌟 LA LOGIQUE EXPERT : WHITELIST STRICTE POUR LE TECHNICIEN
    if (role === "TECHNICIEN" && currentPath.startsWith("/dashboard")) {
      // 1. Les seules routes exactes auxquelles le technicien a le droit d'accéder
      const routesAutorisees = [
        "/dashboard/mes-interventions",
        "/dashboard/work",
        "/dashboard/parametres",
      ];

      // 2. Règle spéciale : On autorise si l'URL contient le segment "bon-intervention"
      const isBonIntervention = currentPath
        .split("/")
        .includes("bon-intervention");

      // 3. Si la route demandée n'est PAS dans la liste ET n'est PAS un bon d'intervention -> BANNI
      if (!routesAutorisees.includes(currentPath) && !isBonIntervention) {
        const url = request.nextUrl.clone();
        url.pathname = "/dashboard/mes-interventions";
        return NextResponse.redirect(url);
      }
    }
  }

  return response;
}
