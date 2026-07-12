"use server";

import { Pool } from "pg"; // On importe Pool directement de 'pg'

export async function getUserRoleSQL(userId: string) {
  // --- OUTIL DE DIAGNOSTIC ---
  console.log("=== DIAGNOSTIC CONNEXION ===");
  console.log("DATABASE_URL présente ?", !!process.env.DATABASE_URL);
  console.log("DATABASE_URL valeur :", process.env.DATABASE_URL);
  // ---------------------------

  // On force la connexion avec une valeur de secours si le .env n'est pas lu
  const clientPool = new Pool({
    connectionString:
      process.env.DATABASE_URL ||
      "postgresql://admin:admin@localhost:5432/fsm_db",
  });

  try {
    const query = "SELECT role FROM utilisateurs WHERE id = $1";
    const { rows } = await clientPool.query(query, [userId]);

    // On ferme proprement la connexion après l'avoir utilisée
    await clientPool.end();

    if (rows.length === 0) {
      return {
        success: false,
        error: "Profil utilisateur introuvable en base.",
      };
    }

    return { success: true, role: rows[0].role };
  } catch (error: any) {
    // En cas d'erreur, on ferme aussi la connexion
    await clientPool.end();
    console.error("Erreur SQL [getUserRoleSQL]:", error);
    return { success: false, error: error.message };
  }
}
