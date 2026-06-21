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

  console.log("\n========== [MIDDLEWARE] ==========");
  console.log("PATH:", currentPath);
  console.log("USER:", user?.id || "AUCUN");

  // PROTECTION 1 : Utilisateur NON connecté
  if (!user && currentPath.startsWith("/dashboard")) {
    console.log("-> REDIRECTION /login (pas de user)");
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // PROTECTION 2 : Utilisateur CONNECTÉ (Gestion des rôles)
  if (user) {
    const { data: profile, error: profileError } = await supabase
      .from("utilisateurs")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    const role = profile?.role;

    console.log("ROLE:", role || "AUCUN");
    console.log("PROFILE ERROR:", profileError?.message || "aucune");

    if (!role) {
      console.log("-> Pas de role determine, on laisse passer");
      console.log("===================================\n");
      return response;
    }

    if (currentPath === "/login") {
      const url = request.nextUrl.clone();
      url.pathname =
        role === "TECHNICIEN" ? "/dashboard/mes-interventions" : "/dashboard";
      console.log("-> REDIRECTION depuis /login vers", url.pathname);
      console.log("===================================\n");
      return NextResponse.redirect(url);
    }

    if (role === "TECHNICIEN") {
      if (currentPath === "/dashboard") {
        const url = request.nextUrl.clone();
        url.pathname = "/dashboard/mes-interventions";
        console.log("-> REDIRECTION /dashboard vers", url.pathname);
        console.log("===================================\n");
        return NextResponse.redirect(url);
      }

      const segments = currentPath.split("/");
      const isBonIntervention = segments.includes("bon-intervention");

      console.log("SEGMENTS:", segments);
      console.log("isBonIntervention:", isBonIntervention);
      console.log(
        "startsWith /dashboard/interventions:",
        currentPath.startsWith("/dashboard/interventions"),
      );

      if (
        currentPath.startsWith("/dashboard/interventions") &&
        !isBonIntervention
      ) {
        const url = request.nextUrl.clone();
        url.pathname = "/dashboard/mes-interventions";
        console.log("-> REDIRECTION ejection interventions vers", url.pathname);
        console.log("===================================\n");
        return NextResponse.redirect(url);
      }

      if (currentPath.startsWith("/dashboard/equipe")) {
        const url = request.nextUrl.clone();
        url.pathname = "/dashboard/mes-interventions";
        console.log("-> REDIRECTION ejection equipe vers", url.pathname);
        console.log("===================================\n");
        return NextResponse.redirect(url);
      }
    }
  }

  console.log("-> Aucune redirection, requete autorisee");
  console.log("===================================\n");
  return response;
}
