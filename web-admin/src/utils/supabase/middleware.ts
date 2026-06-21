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

    // Si on n'arrive pas a determiner le role, on laisse passer sans bloquer
    // plutot que de risquer une redirection incorrecte basee sur une donnee absente.
    if (!role) {
      return response;
    }

    // Redirection intelligente depuis le login UNIQUEMENT
    if (currentPath === "/login") {
      const url = request.nextUrl.clone();
      url.pathname =
        role === "TECHNICIEN" ? "/dashboard/mes-interventions" : "/dashboard";
      return NextResponse.redirect(url);
    }

    if (role === "TECHNICIEN") {
      // Sécurité supplémentaire : Si le technicien tente d'aller sur l'accueil global
      if (currentPath === "/dashboard") {
        const url = request.nextUrl.clone();
        url.pathname = "/dashboard/mes-interventions";
        return NextResponse.redirect(url);
      }

      // MUR DE SÉCURITÉ : on bloque le technicien sur la gestion des interventions,
      // SAUF sur n'importe quelle route bon-intervention, peu importe sa profondeur.
      const isBonIntervention = currentPath
        .split("/")
        .includes("bon-intervention");

      if (
        currentPath.startsWith("/dashboard/interventions") &&
        !isBonIntervention
      ) {
        const url = request.nextUrl.clone();
        url.pathname = "/dashboard/mes-interventions";
        return NextResponse.redirect(url);
      }

      // Bloquer l'accès à la gestion de l'équipe
      if (currentPath.startsWith("/dashboard/equipe")) {
        const url = request.nextUrl.clone();
        url.pathname = "/dashboard/mes-interventions";
        return NextResponse.redirect(url);
      }
    }
  }

  return response;
}
