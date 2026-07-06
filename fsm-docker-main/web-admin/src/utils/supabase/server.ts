import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  // CORRECTION 1 : Résout l'erreur sur .get() et .set() en attendant la promesse des cookies
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        // CORRECTION 2 : Remplacement de 'any' par le type strict 'CookieOptions'
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // CORRECTION 3 : Suppression de la variable 'error' inutilisée pour effacer la ligne jaune
            // Géré par le middleware pour le rafraîchissement des tokens
          }
        },
        // CORRECTION 2 : Remplacement de 'any' par le type strict 'CookieOptions'
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: "", ...options });
          } catch {
            // CORRECTION 3 : Suppression de la variable 'error' inutilisée
            // Géré par le middleware
          }
        },
      },
    },
  );
}
