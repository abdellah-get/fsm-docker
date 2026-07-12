"use server";

import pool from "../../../../../lib/db"; // 👈 Ajuste le chemin selon ton arborescence

export async function getBonInterventionDataSQL(
  interventionId: string,
  userId: string,
) {
  try {
    // 1. Récupérer le rôle de l'utilisateur pour le bouton "Retour"
    const userRes = await pool.query(
      "SELECT role FROM utilisateurs WHERE id = $1",
      [userId],
    );
    const role = userRes.rows[0]?.role;

    // 2. Récupérer l'intervention et toutes ses jointures (Client, Technicien, Entreprise)
    // On utilise json_build_object pour reproduire le format imbriqué exact de Supabase !
    const query = `
      SELECT 
        i.id, i.titre, i.description, i.statut, i.date_prevue, 
        i.signature_client, i.signature_technicien,
        CASE WHEN c.id IS NOT NULL THEN json_build_object(
          'nom_complet', c.nom_complet, 
          'email', c.email, 
          'telephone', c.telephone, 
          'adresse_geographique', c.adresse_geographique
        ) ELSE NULL END as clients,
        CASE WHEN u.id IS NOT NULL THEN json_build_object(
          'nom_complet', u.nom_complet, 
          'role', u.role
        ) ELSE NULL END as utilisateurs,
        CASE WHEN e.id IS NOT NULL THEN json_build_object(
          'nom', e.nom, 
          'telephone', e.telephone, 
          'email', e.email
        ) ELSE NULL END as entreprises
      FROM interventions i
      LEFT JOIN clients c ON i.client_id = c.id
      LEFT JOIN utilisateurs u ON i.technicien_id = u.id
      LEFT JOIN entreprises e ON i.entreprise_id = e.id
      WHERE i.id = $1
    `;

    const interRes = await pool.query(query, [interventionId]);
    const intervention = interRes.rows[0];

    if (!intervention) {
      return { success: false, error: "Intervention introuvable" };
    }

    return { success: true, intervention, role };
  } catch (error: any) {
    console.error("Erreur SQL [getBonInterventionDataSQL]:", error);
    return {
      success: false,
      error: "Erreur lors de la récupération des données",
    };
  }
}
