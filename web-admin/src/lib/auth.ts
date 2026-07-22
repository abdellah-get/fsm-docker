// src/lib/auth.ts
import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (credentials?.email && credentials?.password) {
          // 💡 On inclut role et entreprise_id exigés par ton typage personnalisé
          return {
            id: "1",
            name: "Admin",
            email: credentials.email,
            role: "ADMIN", // <-- Champ requis ajouté
            entreprise_id: "emp-123", // <-- Champ requis ajouté
          };
        }
        return null;
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
};
