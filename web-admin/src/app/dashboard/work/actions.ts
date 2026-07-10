"use server";

import pool from "../../../lib/db"; // 👈 Ajuste le chemin vers ton lib/db.ts si besoin

export async function getWorkHistorySQL(
  technicienId: string,
  from: number,
  limit: number,
) {
  try {
    // On utilise LEFT JOIN pour lier les tables, et json_build_object
    // pour recréer le format exact que Supabase te renvoyait !
    const query = `
      SELECT 
        i.id, i.titre, i.date_prevue, i.prix_valide_a, i.montant_final,
        i.compte_rendu, i.signature_client, i.signature_technicien,
        json_build_object('nom_complet', c.nom_complet) as clients,
        json_build_object('adresse', d.adresse) as demandes
      FROM interventions i
      LEFT JOIN clients c ON i.client_id = c.id
      LEFT JOIN demandes d ON i.demande_id = d.id
      WHERE i.technicien_id = $1 AND i.statut = 'CLOTUREE'
      ORDER BY i.prix_valide_a DESC NULLS LAST
      LIMIT $2 OFFSET $3
    `;

    const { rows } = await pool.query(query, [technicienId, limit, from]);

    return { success: true, data: rows };
  } catch (error: any) {
    console.error("Erreur getWorkHistorySQL:", error);
    return { success: false, error: error.message };
  }
}
