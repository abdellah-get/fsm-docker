"use server";

import pool from "../../../../lib/db"; // 👈 Ajuste le chemin vers ton lib/db.ts si besoin

export async function getFactureDetailSQL(factureId: string) {
  try {
    // 1. On récupère la facture avec toutes ses jointures (intervention et client)
    const factQuery = `
      SELECT 
        f.id, f.montant_ht, f.montant_ttc, f.taux_tva, f.date_echeance, f.created_at, f.entreprise_id,
        json_build_object(
          'titre', i.titre,
          'clients', json_build_object(
            'nom_complet', c.nom_complet,
            'adresse_geographique', c.adresse_geographique,
            'telephone', c.telephone
          )
        ) as interventions
      FROM factures f
      LEFT JOIN interventions i ON f.intervention_id = i.id
      LEFT JOIN clients c ON i.client_id = c.id
      WHERE f.id = $1
    `;
    const factRes = await pool.query(factQuery, [factureId]);
    const facture = factRes.rows[0];

    if (!facture) {
      return {
        success: false,
        error: `Aucune facture trouvée pour l'ID [${factureId}].`,
      };
    }

    // 2. On récupère les détails de l'entreprise associée à cette facture
    const entQuery = `
      SELECT nom, ice, rc, if_fiscal, patente
      FROM entreprises
      WHERE id = $1
    `;
    const entRes = await pool.query(entQuery, [facture.entreprise_id]);
    const entreprise = entRes.rows[0];

    if (!entreprise) {
      return {
        success: false,
        error: `Facture lue avec succès, mais l'entreprise [${facture.entreprise_id}] est introuvable.`,
      };
    }

    // 3. On retourne le tout
    return { success: true, facture, entreprise };
  } catch (error: any) {
    console.error("Erreur SQL [getFactureDetailSQL]:", error);
    return { success: false, error: "Erreur SQL interne : " + error.message };
  }
}
