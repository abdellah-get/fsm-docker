"use server";

import pool from "../../../lib/db";

// 1. Récupérer les missions du technicien
export async function getMyInterventionsSQL(userId: string) {
  try {
    const query = `
      SELECT 
        i.id, i.titre, i.description, i.statut, i.date_prevue, i.compte_rendu, 
        i.signature_client, i.signature_technicien, i.montant_final, i.prix_valide_a,
        CASE WHEN c.id IS NOT NULL THEN json_build_object('nom_complet', c.nom_complet) ELSE NULL END as clients,
        CASE WHEN d.id IS NOT NULL THEN json_build_object('adresse', d.adresse, 'latitude', d.latitude, 'longitude', d.longitude) ELSE NULL END as demandes
      FROM interventions i
      LEFT JOIN clients c ON i.client_id = c.id
      LEFT JOIN demandes d ON i.demande_id = d.id
      WHERE i.technicien_id = $1 AND i.statut != 'CLOTUREE'
      ORDER BY i.date_prevue ASC
    `;
    const { rows } = await pool.query(query, [userId]);
    return { success: true, data: rows };
  } catch (error: any) {
    console.error("Erreur getMyInterventionsSQL:", error);
    return { success: false, error: error.message };
  }
}

// 2. Mettre à jour la position GPS du technicien
export async function updateLocationSQL(
  userId: string,
  lat: number,
  lng: number,
) {
  try {
    await pool.query(
      "UPDATE utilisateurs SET current_lat = $1, current_lng = $2 WHERE id = $3",
      [lat, lng, userId],
    );
    return { success: true };
  } catch (error: any) {
    console.error("Erreur updateLocationSQL:", error);
    return { success: false, error: error.message };
  }
}

// 3. Valider le prix d'une intervention
export async function updateInterventionPrixSQL(id: string, montant: number) {
  try {
    await pool.query(
      "UPDATE interventions SET montant_final = $1 WHERE id = $2",
      [montant, id],
    );
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// 4. Démarrer une intervention
export async function demarrerInterventionSQL(id: string) {
  try {
    await pool.query(
      "UPDATE interventions SET statut = 'EN_COURS' WHERE id = $1",
      [id],
    );
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// 5. Clôturer et générer la facture (Transaction)
export async function cloturerInterventionSQL(
  interventionId: string,
  userId: string,
  payload: any,
  montantFinal: number | null,
) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN"); // 🟢 Début de la transaction

    // a) Mise à jour de l'intervention
    await client.query(
      `
      UPDATE interventions 
      SET statut = 'CLOTUREE', 
          compte_rendu = $1, 
          signature_client = $2, 
          signature_technicien = $3, 
          prix_valide_a = COALESCE(prix_valide_a, $4)
      WHERE id = $5
    `,
      [
        payload.compte_rendu,
        payload.signature_client,
        payload.signature_technicien,
        payload.prix_valide_a || null,
        interventionId,
      ],
    );

    // b) Création de la facture si un montant existe
    if (montantFinal) {
      const userRes = await client.query(
        "SELECT entreprise_id FROM utilisateurs WHERE id = $1",
        [userId],
      );
      const entrepriseId = userRes.rows[0]?.entreprise_id;

      if (entrepriseId) {
        const montantHT = Math.round((montantFinal / 1.2) * 100) / 100;
        const dateEcheance = new Date();
        dateEcheance.setDate(dateEcheance.getDate() + 30); // Échéance à 30 jours

        await client.query(
          `
          INSERT INTO factures (entreprise_id, intervention_id, montant_ht, taux_tva, montant_ttc, statut, date_echeance)
          VALUES ($1, $2, $3, $4, $5, 'EN_ATTENTE', $6)
        `,
          [
            entrepriseId,
            interventionId,
            montantHT,
            20.0,
            montantFinal,
            dateEcheance.toISOString().split("T")[0],
          ],
        );
      }
    }

    await client.query("COMMIT"); // 🟢 Validation
    return { success: true };
  } catch (error: any) {
    await client.query("ROLLBACK"); // 🔴 Annulation en cas d'erreur
    console.error("Erreur Transaction cloturerInterventionSQL:", error);
    return { success: false, error: error.message };
  } finally {
    client.release();
  }
}
