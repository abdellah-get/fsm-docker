"use server";

import pool from "../../lib/db"; // 👈 Ajuste le chemin vers ton lib/db.ts si nécessaire
import bcrypt from "bcryptjs"; // 👈 On importe bcryptjs pour sécuriser le mot de passe

interface CreateTechnicianPayload {
  email: string;
  mot_de_passe: string;
  nom_complet: string;
  telephone: string;
  entreprise_id: string;
}

export async function createTechnicianAction(payload: CreateTechnicianPayload) {
  try {
    // 1. Hasher le mot de passe pour la sécurité (le fameux format $2a$...)
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(payload.mot_de_passe, saltRounds);

    // 2. Insertion du profil COMPLET dans TA table publique "utilisateurs"
    // L'ID sera généré automatiquement par PostgreSQL (grâce à uuid_generate_v4() par exemple)
    const query = `
      INSERT INTO utilisateurs (entreprise_id, email, mot_de_passe, nom_complet, telephone, role)
      VALUES ($1, $2, $3, $4, $5, $6)
    `;
    const values = [
      payload.entreprise_id,
      payload.email,
      hashedPassword, // 👈 On insère le mot de passe crypté
      payload.nom_complet,
      payload.telephone,
      "TECHNICIEN",
    ];

    await pool.query(query, values);

    return { success: true };
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Erreur Serveur [createTechnicianAction]:", err.message);

    // Si l'erreur est liée à un email déjà existant (violation de contrainte UNIQUE)
    if (
      err.message.includes("unique constraint") ||
      err.message.includes("duplicate key")
    ) {
      return {
        success: false,
        error: "Cet email est déjà utilisé par un autre compte.",
      };
    }

    return { success: false, error: err.message };
  }
}

export async function getEquipeDataAction(userId: string) {
  try {
    // 1. Récupérer l'entreprise_id du gérant
    const managerQuery = `SELECT entreprise_id FROM utilisateurs WHERE id = $1`;
    const managerRes = await pool.query(managerQuery, [userId]);

    if (managerRes.rows.length === 0) {
      return {
        success: false,
        error: "Profil utilisateur introuvable en base de données.",
      };
    }

    const entrepriseId = managerRes.rows[0].entreprise_id;

    // 2. Récupérer les techniciens de cette entreprise
    const techniciensQuery = `
      SELECT id, nom_complet, telephone, role 
      FROM utilisateurs 
      WHERE entreprise_id = $1 AND role = 'TECHNICIEN' 
      ORDER BY nom_complet ASC
    `;
    const techniciensRes = await pool.query(techniciensQuery, [entrepriseId]);

    return {
      success: true,
      entrepriseId,
      techniciens: techniciensRes.rows,
    };
  } catch (error: any) {
    console.error("Erreur SQL [getEquipeDataAction]:", error.message);
    return {
      success: false,
      error: "Erreur lors de la récupération des données.",
    };
  }
}
