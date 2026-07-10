"use server";

import pool from "../../../lib/db"; // 👈 Ajuste le chemin vers lib/db.ts si besoin

export async function getInterventionsDataSQL(userId: string) {
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

    // 2. Récupérer les interventions avec les jointures
    // 💡 Astuce Pro : On utilise "CASE WHEN" pour renvoyer NULL si aucun technicien n'est assigné,
    // exactement comme le faisait Supabase !
    const interventionsQuery = `
      SELECT 
        i.id, i.titre, i.description, i.statut, i.date_prevue,
        CASE WHEN c.id IS NOT NULL THEN json_build_object('id', c.id, 'nom_complet', c.nom_complet) ELSE NULL END as clients,
        CASE WHEN u.id IS NOT NULL THEN json_build_object('id', u.id, 'nom_complet', u.nom_complet, 'role', u.role) ELSE NULL END as utilisateurs
      FROM interventions i
      LEFT JOIN clients c ON i.client_id = c.id
      LEFT JOIN utilisateurs u ON i.technicien_id = u.id
      WHERE i.entreprise_id = $1
      ORDER BY i.date_prevue DESC
    `;
    const interventionsRes = await pool.query(interventionsQuery, [
      entrepriseId,
    ]);

    // 3. Récupérer la liste des clients pour le formulaire
    const clientsRes = await pool.query(
      "SELECT id, nom_complet FROM clients WHERE entreprise_id = $1 ORDER BY nom_complet",
      [entrepriseId],
    );

    // 4. Récupérer la liste des techniciens pour le formulaire
    const techniciensRes = await pool.query(
      "SELECT id, nom_complet, role FROM utilisateurs WHERE entreprise_id = $1 ORDER BY nom_complet",
      [entrepriseId],
    );

    return {
      success: true,
      entrepriseId,
      interventions: interventionsRes.rows,
      clients: clientsRes.rows,
      techniciens: techniciensRes.rows,
    };
  } catch (error: any) {
    console.error("Erreur SQL [getInterventionsDataSQL]:", error);
    return { success: false, error: error.message };
  }
}

export async function createInterventionSQL(payload: any) {
  try {
    const query = `
      INSERT INTO interventions (entreprise_id, client_id, technicien_id, titre, description, statut, date_prevue)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;
    const values = [
      payload.entreprise_id,
      payload.client_id,
      payload.technicien_id || null, // Gestion du NULL si non assigné
      payload.titre,
      payload.description,
      payload.statut,
      payload.date_prevue,
    ];
    await pool.query(query, values);
    return { success: true };
  } catch (error: any) {
    console.error("Erreur SQL [createInterventionSQL]:", error);
    return { success: false, error: error.message };
  }
}

export async function updateInterventionSQL(id: string, payload: any) {
  try {
    const query = `
      UPDATE interventions
      SET client_id = $1, technicien_id = $2, titre = $3, description = $4, statut = $5, date_prevue = $6
      WHERE id = $7 AND entreprise_id = $8
    `;
    const values = [
      payload.client_id,
      payload.technicien_id || null,
      payload.titre,
      payload.description,
      payload.statut,
      payload.date_prevue,
      id,
      payload.entreprise_id,
    ];
    await pool.query(query, values);
    return { success: true };
  } catch (error: any) {
    console.error("Erreur SQL [updateInterventionSQL]:", error);
    return { success: false, error: error.message };
  }
}
