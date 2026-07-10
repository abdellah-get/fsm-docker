"use server";

import pool from "../../lib/db"; // 👈 Ajuste le chemin vers ton lib/db.ts si besoin

export async function getDemandesByPhoneSQL(telephone: string) {
  try {
    const query = `
      SELECT id, titre, description, statut, created_at
      FROM demandes
      WHERE telephone = $1
      ORDER BY created_at DESC
    `;
    // On passe le numéro de téléphone en paramètre sécurisé pour éviter les injections SQL
    const { rows } = await pool.query(query, [telephone]);

    return { success: true, data: rows };
  } catch (error: any) {
    console.error("Erreur SQL [getDemandesByPhoneSQL]:", error);
    return { success: false, error: error.message };
  }
}
