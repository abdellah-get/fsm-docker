"use server";

import pool from "../../lib/db"; // 👈 Ajuste le chemin vers ton fichier db.ts

export async function getProfileLayoutSQL(userId: string) {
  try {
    const query = "SELECT role, nom_complet FROM utilisateurs WHERE id = $1";
    const { rows } = await pool.query(query, [userId]);

    if (rows.length === 0) {
      return {
        success: false,
        error: "Profil utilisateur introuvable en base.",
      };
    }

    return { success: true, profile: rows[0] };
  } catch (error: any) {
    console.error("Erreur SQL [getProfileLayoutSQL]:", error);
    return { success: false, error: error.message };
  }
}

export async function getDashboardDataSQL(userId: string) {
  try {
    // 1. Récupérer l'entreprise de l'utilisateur
    const userRes = await pool.query(
      "SELECT entreprise_id FROM utilisateurs WHERE id = $1",
      [userId],
    );
    const entrepriseId = userRes.rows[0]?.entreprise_id;

    if (!entrepriseId) {
      return { success: false, noProfile: true };
    }

    // 2. 🌟 LE VRAI CALCUL DES STATS EN SQL (Corrige le bug de la limite des 10 factures)
    const statsQuery = `
      SELECT 
        (SELECT COUNT(*) FROM interventions WHERE entreprise_id = $1 AND statut = 'EN_COURS') as interventions_en_cours,
        (SELECT COALESCE(SUM(montant_ttc), 0) FROM factures WHERE entreprise_id = $1 AND statut = 'EN_ATTENTE') as factures_en_attente,
        (SELECT COALESCE(SUM(montant_ht), 0) FROM factures WHERE entreprise_id = $1 AND statut = 'PAYEE' 
         AND EXTRACT(MONTH FROM created_at) = EXTRACT(MONTH FROM CURRENT_DATE) 
         AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE)) as ca_mensuel
    `;
    const statsRes = await pool.query(statsQuery, [entrepriseId]);

    const stats = {
      interventionsEnCours: parseInt(
        statsRes.rows[0].interventions_en_cours,
        10,
      ),
      facturesEnAttente: parseFloat(statsRes.rows[0].factures_en_attente),
      chiffreAffaires: parseFloat(statsRes.rows[0].ca_mensuel),
    };

    // 3. Récupérer les 10 dernières factures avec leurs jointures
    const facturesQuery = `
      SELECT 
        f.id, f.entreprise_id, f.montant_ht, f.montant_ttc, f.statut, f.created_at,
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
      WHERE f.entreprise_id = $1
      ORDER BY f.created_at DESC
      LIMIT 10
    `;
    const facturesRes = await pool.query(facturesQuery, [entrepriseId]);

    // 4. Récupérer les demandes en attente
    const demandesQuery = `
      SELECT id, nom_complet, telephone, titre, description, statut, created_at
      FROM demandes
      WHERE entreprise_id = $1 AND statut != 'ASSIGNEE'
      ORDER BY created_at DESC
    `;
    const demandesRes = await pool.query(demandesQuery, [entrepriseId]);

    return {
      success: true,
      entrepriseId,
      stats,
      recentInvoices: facturesRes.rows,
      pendingRequests: demandesRes.rows,
    };
  } catch (error: any) {
    console.error("Erreur SQL [getDashboardDataSQL]:", error);
    return { success: false, error: error.message };
  }
}
