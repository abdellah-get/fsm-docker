export { default } from "next-auth/middleware";

export const config = {
  matcher: [
    /*
     * Matcher pour intercepter toutes les routes SAUF :
     * - Les fichiers statiques et images
     * - La page de login (/login) pour ne pas bloquer les utilisateurs non connectés
     * - Les routes API (/api/...) pour laisser passer les requêtes d'authentification
     */
    "/((?!_next/static|_next/image|favicon.ico|login|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
