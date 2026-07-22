import NextAuth, { NextAuthOptions } from "next-auth";
import { authOptions } from "../../../../lib/auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { Pool } from "pg";

// Instanciation de ton client PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
