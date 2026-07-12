import { withAuth } from "next-auth/middleware";

// On exporte explicitement la fonction générée par withAuth
export default withAuth(
  function middleware(req) {
    // Tu peux laisser cette fonction vide, NextAuth s'occupe de la vérification
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token, // Vérifie qu'un token (session) existe
    },
  },
);

export const config = {
  matcher: ["/dashboard/:path*"],
};
