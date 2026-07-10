"use server";

import pool from "../../../lib/db"; // 👈 Ajuste le chemin vers ton lib/db.ts si besoin

export async function getParametresSQL(userId: string) {
  try {
    // 1. Récupérer l'entreprise_id liée à l'utilisateur
    const userQuery = `SELECT entreprise_id FROM utilisateurs WHERE id = $1`;
    const userRes = await pool.query(userQuery, [userId]);

    if (userRes.rows.length === 0) {
      throw new Error(
        "Utilisateur introuvable dans la base de données locale.",
      );
    }

    const entrepriseId = userRes.rows[0].entreprise_id;
    if (!entrepriseId) {
      throw new Error("Votre compte n'est lié à aucune entreprise.");
    }

    // 2. Récupérer les détails de l'entreprise
    const entQuery = `
      SELECT nom, ice, rc, if_fiscal, patente 
      FROM entreprises 
      WHERE id = $1
    `;
    const entRes = await pool.query(entQuery, [entrepriseId]);

    return {
      success: true,
      entrepriseId,
      data: entRes.rows[0] || null,
    };
  } catch (error: any) {
    console.error("Erreur getParametresSQL:", error);
    return { success: false, error: error.message };
  }
}

export async function updateParametresSQL(entrepriseId: string, payload: any) {
  try {
    const query = `
      UPDATE entreprises 
      SET nom = $1, ice = $2, rc = $3, if_fiscal = $4, patente = $5
      WHERE id = $6
    `;
    const values = [
      payload.nom,
      payload.ice,
      payload.rc,
      payload.if_fiscal,
      payload.patente,
      entrepriseId,
    ];

    await pool.query(query, values);
    return { success: true };
  } catch (error: any) {
    console.error("Erreur updateParametresSQL:", error);
    return { success: false, error: error.message };
  }
}
