"use server";

import pool from "../../../lib/db";

// 1. Récupérer l'ID de l'entreprise via l'ID utilisateur
export async function getEntrepriseIdSQL(userId: string) {
  try {
    const { rows } = await pool.query(
      "SELECT entreprise_id FROM utilisateurs WHERE id = $1",
      [userId],
    );
    return { success: true, entrepriseId: rows[0]?.entreprise_id || null };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// 2. Lire la liste des clients
export async function getClientsSQL(entrepriseId: string) {
  try {
    const { rows } = await pool.query(
      "SELECT id, nom_complet, email, telephone, adresse_geographique, created_at FROM clients WHERE entreprise_id = $1 ORDER BY nom_complet ASC",
      [entrepriseId],
    );
    return { success: true, clients: rows };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// 3. Créer un client
export async function createClientSQL(payload: any) {
  try {
    const query = `
      INSERT INTO clients (entreprise_id, nom_complet, email, telephone, adresse_geographique)
      VALUES ($1, $2, $3, $4, $5)
    `;
    await pool.query(query, [
      payload.entreprise_id,
      payload.nom_complet,
      payload.email,
      payload.telephone,
      payload.adresse_geographique,
    ]);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// 4. Mettre à jour un client
export async function updateClientSQL(
  id: string,
  entrepriseId: string,
  payload: any,
) {
  try {
    const query = `
      UPDATE clients
      SET nom_complet = $1, email = $2, telephone = $3, adresse_geographique = $4
      WHERE id = $5 AND entreprise_id = $6
    `;
    await pool.query(query, [
      payload.nom_complet,
      payload.email,
      payload.telephone,
      payload.adresse_geographique,
      id,
      entrepriseId,
    ]);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// 5. Supprimer un client
export async function deleteClientSQL(id: string, entrepriseId: string) {
  try {
    const query = "DELETE FROM clients WHERE id = $1 AND entreprise_id = $2";
    await pool.query(query, [id, entrepriseId]);
    return { success: true };
  } catch (error: any) {
    // Erreur 23503 = Violation de clé étrangère (ex: le client a des factures)
    if (error.code === "23503") {
      return {
        success: false,
        error:
          "Impossible de supprimer ce client car des interventions ou factures y sont liées.",
      };
    }
    return { success: false, error: error.message };
  }
}
