// src/lib/auth.ts
import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import pool from "./db";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = credentials.email.trim().toLowerCase();

        const { rows } = await pool.query(
          `SELECT id, email, nom_complet, role, entreprise_id, password_hash, is_active
           FROM utilisateurs
           WHERE lower(email) = $1
           LIMIT 1`,
          [email],
        );

        const user = rows[0];
        if (!user || !user.password_hash) {
          return null;
        }

        if (user.is_active === false) {
          return null;
        }

        const passwordOk = await bcrypt.compare(
          credentials.password,
          user.password_hash,
        );
        if (!passwordOk) {
          return null;
        }

        return {
          id: String(user.id),
          name: user.nom_complet || user.email,
          email: user.email,
          role: user.role,
          entreprise_id: String(user.entreprise_id),
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.entreprise_id = user.entreprise_id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.entreprise_id = token.entreprise_id as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
};
