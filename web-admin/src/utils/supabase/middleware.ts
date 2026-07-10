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

  // Si l'utilisateur n'est pas connecté et essaie d'accéder au dashboard
  if (!user && currentPath.startsWith("/dashboard")) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user) {
    try {
      // 📍 NOUVEAU : On fait appel à notre Route API locale au lieu de Supabase Base de données
      const roleRes = await fetch(
        `${request.nextUrl.origin}/api/role?userId=${user.id}`,
      );
      const { role } = await roleRes.json();

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
    } catch (error) {
      console.error("Erreur Middleware - Fetch role :", error);
    }
  }

  return response;
}
