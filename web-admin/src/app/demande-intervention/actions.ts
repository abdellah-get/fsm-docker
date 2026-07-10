"use server";

import pool from "../../lib/db"; // 👈 Ajuste le chemin vers ton lib/db.ts

export async function createDemandeSQL(payload: any) {
  try {
    const query = `
      INSERT INTO demandes (
        entreprise_id, nom_complet, telephone, email, adresse,
        latitude, longitude, titre, description, date_disponibilite,
        preference_horaire, photos, statut
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'EN_ATTENTE'
      )
    `;
    const values = [
      payload.entreprise_id,
      payload.nom_complet,
      payload.telephone,
      payload.email,
      payload.adresse,
      payload.latitude,
      payload.longitude,
      payload.titre,
      payload.description,
      payload.date_disponibilite,
      payload.preference_horaire,
      payload.photos, // PostgreSQL gère très bien les tableaux natifs [URL1, URL2]
    ];

    await pool.query(query, values);
    return { success: true };
  } catch (error: any) {
    console.error("Erreur SQL [createDemandeSQL]:", error);
    return { success: false, error: error.message };
  }
}
