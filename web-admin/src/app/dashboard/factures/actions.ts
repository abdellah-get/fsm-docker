"use server";

import pool from "../../../lib/db"; // 👈 Ajuste le chemin vers ton lib/db.ts si besoin

export async function getFacturesDataSQL(userId: string) {
  try {
    // 1. Récupérer l'entreprise_id
    const userRes = await pool.query(
      "SELECT entreprise_id FROM utilisateurs WHERE id = $1",
      [userId],
    );
    const entrepriseId = userRes.rows[0]?.entreprise_id;

    if (!entrepriseId) {
      throw new Error("Profil introuvable ou non lié à une entreprise.");
    }

    // 2. Récupérer les factures (avec les jointures pour intervention et client)
    const facturesQuery = `
      SELECT 
        f.id, f.montant_ht, f.montant_ttc, f.taux_tva, f.statut, f.date_echeance, f.created_at,
        json_build_object(
          'titre', i.titre,
          'clients', json_build_object('nom_complet', c.nom_complet)
        ) as interventions
      FROM factures f
      LEFT JOIN interventions i ON f.intervention_id = i.id
      LEFT JOIN clients c ON i.client_id = c.id
      WHERE f.entreprise_id = $1
      ORDER BY f.created_at DESC
    `;
    const facturesRes = await pool.query(facturesQuery, [entrepriseId]);

    // 3. Récupérer les interventions clôturées pour le select du formulaire
    const interQuery = `
      SELECT 
        i.id, i.titre,
        json_build_object('nom_complet', c.nom_complet) as clients
      FROM interventions i
      LEFT JOIN clients c ON i.client_id = c.id
      WHERE i.entreprise_id = $1 AND i.statut = 'CLOTUREE'
    `;
    const interRes = await pool.query(interQuery, [entrepriseId]);

    return {
      success: true,
      entrepriseId,
      factures: facturesRes.rows,
      interventions: interRes.rows,
    };
  } catch (error: any) {
    console.error("Erreur SQL [getFacturesDataSQL]:", error);
    return { success: false, error: error.message };
  }
}

export async function createFactureSQL(payload: any) {
  try {
    const query = `
      INSERT INTO factures (entreprise_id, intervention_id, montant_ht, taux_tva, montant_ttc, date_echeance, statut)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;
    const values = [
      payload.entreprise_id,
      payload.intervention_id,
      payload.montant_ht,
      payload.taux_tva,
      payload.montant_ttc,
      payload.date_echeance,
      payload.statut,
    ];

    await pool.query(query, values);
    return { success: true };
  } catch (error: any) {
    console.error("Erreur SQL [createFactureSQL]:", error);
    return { success: false, error: error.message };
  }
}
