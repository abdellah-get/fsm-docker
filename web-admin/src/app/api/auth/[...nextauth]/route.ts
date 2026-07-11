import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { Pool } from "pg";

// Instanciation de ton client PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Connexion",
      credentials: {
        email: {
          label: "Email",
          type: "email",
          placeholder: "contact@wilance.com",
        },
        password: { label: "Mot de passe", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email et mot de passe requis");
        }

        // 1. Chercher l'utilisateur dans ta base PostgreSQL
        // 1. Chercher l'utilisateur dans ta base PostgreSQL (Insensible à la casse)

        console.log("🔍 Email tapé par l'utilisateur :", credentials.email);

        const result = await pool.query(
          `SELECT id, email, password_hash, nom_complet, role, entreprise_id 
           FROM utilisateurs WHERE LOWER(email) = LOWER($1)`,
          [credentials.email.trim()],
        );

        console.log("📊 Ce que PostgreSQL a trouvé :", result.rows);

        const user = result.rows[0];

        if (!user || !user.password_hash) {
          throw new Error("Aucun utilisateur trouvé avec cet email");
        }
        // --- LIGNES À AJOUTER TEMPORAIREMENT ---
        const vraiHash = await bcrypt.hash("123456", 10);
        console.log("🔥 LE VRAI HASH POUR 123456 EST :", vraiHash);
        // ---------------------------------------

        // 2. Vérifier le mot de passe crypté
        const isValid = await bcrypt.compare(
          credentials.password,
          user.password_hash,
        );

        if (!isValid) {
          throw new Error("Mot de passe incorrect");
        }

        // 3. Renvoyer les infos qui seront stockées dans le token JWT
        return {
          id: user.id,
          email: user.email,
          name: user.nom_complet,
          role: user.role,
          entreprise_id: user.entreprise_id,
        };
      },
    }),
  ],
  callbacks: {
    // Injecter les données personnalisées dans le jeton sécurisé
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.entreprise_id = (user as any).entreprise_id;
      }
      return token;
    },
    // Transmettre ces données à la session utilisable côté client (React)
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
        (session.user as any).entreprise_id = token.entreprise_id;
      }
      return session;
    },
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // Expiration après 30 jours
  },
  pages: {
    signIn: "/login", // Ton application redirigera ici si l'utilisateur n'est pas connecté
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
