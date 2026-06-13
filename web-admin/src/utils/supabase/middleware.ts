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

  // Récupération de l'utilisateur
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
    // On va chercher le rôle exact dans la table utilisateurs
    const { data: profile } = await supabase
      .from("utilisateurs")
      .select("role")
      .eq("id", user.id)
      .single();

    const role = profile?.role; // 'GERANT' ou 'TECHNICIEN'

    // Redirection intelligente depuis le login ou la racine du dashboard
    if (currentPath === "/login" || currentPath === "/dashboard") {
      const url = request.nextUrl.clone();
      // Le gérant va sur ses interventions, le technicien va sur ses missions
      url.pathname =
        role === "TECHNICIEN"
          ? "/dashboard/mes-interventions"
          : "/dashboard/interventions";
      return NextResponse.redirect(url);
    }

    // MUR DE SÉCURITÉ : On bloque le Technicien s'il essaie d'aller sur l'espace Gérant
    if (role === "TECHNICIEN") {
      // Si le technicien tente d'afficher la liste complète des interventions du gérant
      // (Mais on ne le bloque PAS s'il va sur un bon d'intervention spécifique)
      if (currentPath === "/dashboard/interventions") {
        const url = request.nextUrl.clone();
        url.pathname = "/dashboard/mes-interventions";
        return NextResponse.redirect(url);
      }

      // Optionnel : Tu peux ajouter d'autres routes interdites au technicien ici
      // if (currentPath.startsWith("/dashboard/clients")) { ... }
    }
  }

  return response;
}
