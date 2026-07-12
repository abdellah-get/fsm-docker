"use server";

import pool from "../../../lib/db";
import bcrypt from "bcryptjs"; // 👈 On importe bcrypt pour sécuriser le mot de passe

// 1. Récupérer l'ID de l'entreprise et les techniciens
export async function getEquipeDataSQL(userId: string) {
  try {
    // Récupérer l'entreprise_id du gérant connecté
    const userRes = await pool.query(
      "SELECT entreprise_id FROM utilisateurs WHERE id = $1",
      [userId],
    );
    const entrepriseId = userRes.rows[0]?.entreprise_id;

    if (!entrepriseId) {
      return {
        success: false,
        error: "Profil introuvable ou non lié à une entreprise.",
      };
    }

    // Récupérer tous les techniciens de cette entreprise
    const equipeRes = await pool.query(
      "SELECT id, nom_complet, telephone, role FROM utilisateurs WHERE entreprise_id = $1 AND role = 'TECHNICIEN' ORDER BY nom_complet ASC",
      [entrepriseId],
    );

    return {
      success: true,
      entrepriseId,
      techniciens: equipeRes.rows,
    };
  } catch (error: any) {
    console.error("Erreur SQL [getEquipeDataSQL]:", error);
    return { success: false, error: error.message };
  }
}

// 2. Créer un technicien en base locale
export async function createTechnicianActionSQL(payload: any) {
  try {
    // 🔐 HACHAGE DU MOT DE PASSE : Indispensable pour NextAuth !
    const motDePasseHache = await bcrypt.hash(payload.mot_de_passe, 10);

    // On utilise la bonne colonne "password_hash"
    const query = `
      INSERT INTO utilisateurs (id, entreprise_id, nom_complet, telephone, email, password_hash, role)
      VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, 'TECHNICIEN')
    `;

    await pool.query(query, [
      payload.entreprise_id,
      payload.nom_complet,
      payload.telephone,
      payload.email,
      motDePasseHache, // 👈 On insère le mot de passe crypté
    ]);

    return { success: true };
  } catch (error: any) {
    console.error("Erreur SQL [createTechnicianActionSQL]:", error);
    if (error.code === "23505") {
      return {
        success: false,
        error: "Cet email est déjà utilisé par un autre utilisateur.",
      };
    }
    return { success: false, error: error.message };
  }
}
