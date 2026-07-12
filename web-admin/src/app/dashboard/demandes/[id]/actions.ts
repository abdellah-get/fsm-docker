"use server";

import pool from "../../../../lib/db"; // 👈 Ajuste si besoin (ou utilise '@/lib/db')

export async function getDemandeDataSQL(demandeId: string, userId: string) {
  try {
    // 1. Récupérer l'entreprise de l'utilisateur connecté
    const userRes = await pool.query(
      "SELECT entreprise_id FROM utilisateurs WHERE id = $1",
      [userId],
    );
    const entrepriseId = userRes.rows[0]?.entreprise_id;
    if (!entrepriseId) throw new Error("Profil introuvable.");

    // 2. Récupérer la demande
    const demandeRes = await pool.query(
      "SELECT * FROM demandes WHERE id = $1 AND entreprise_id = $2",
      [demandeId, entrepriseId],
    );
    const demande = demandeRes.rows[0];
    if (!demande) throw new Error("Demande introuvable.");

    // 3. Récupérer les techniciens
    const techRes = await pool.query(
      "SELECT id, nom_complet FROM utilisateurs WHERE entreprise_id = $1 AND role = 'TECHNICIEN' AND is_active = true",
      [entrepriseId],
    );

    return { success: true, demande, techniciens: techRes.rows };
  } catch (error: any) {
    console.error("Erreur SQL [getDemandeDataSQL]:", error);
    return { success: false, error: error.message };
  }
}

export async function assignTechnicienSQL(demande: any, technicienId: string) {
  // On utilise un client dédié pour faire une TRANSACTION sécurisée
  const client = await pool.connect();

  try {
    await client.query("BEGIN"); // 🟢 Début de la transaction

    // 1. Chercher si un client avec ce téléphone existe déjà
    const clientRes = await client.query(
      "SELECT id FROM clients WHERE entreprise_id = $1 AND telephone = $2 LIMIT 1",
      [demande.entreprise_id, demande.telephone],
    );

    let clientId = clientRes.rows[0]?.id;

    // 2. Créer le client si non existant
    if (!clientId) {
      const insertClient = await client.query(
        `INSERT INTO clients (entreprise_id, nom_complet, telephone, email, adresse_geographique) 
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [
          demande.entreprise_id,
          demande.nom_complet,
          demande.telephone,
          demande.email,
          demande.adresse || "Adresse non renseignée",
        ],
      );
      clientId = insertClient.rows[0].id;
    }

    // 3. Créer l'intervention de travail
    await client.query(
      `INSERT INTO interventions (entreprise_id, client_id, technicien_id, titre, description, statut, date_prevue) 
       VALUES ($1, $2, $3, $4, $5, 'A_FAIRE', NOW())`,
      [
        demande.entreprise_id,
        clientId,
        technicienId,
        demande.titre,
        demande.description,
      ],
    );

    // 4. Mettre à jour la demande pour la marquer comme assignée
    await client.query(
      "UPDATE demandes SET statut = 'ASSIGNEE', technicien_id = $1 WHERE id = $2",
      [technicienId, demande.id],
    );

    await client.query("COMMIT"); // 🟢 Tout s'est bien passé, on valide !
    return { success: true };
  } catch (error: any) {
    await client.query("ROLLBACK"); // 🔴 Erreur ! On annule tout pour garder la base propre
    console.error("Erreur SQL Transaction [assignTechnicienSQL]:", error);
    return { success: false, error: error.message };
  } finally {
    client.release(); // On libère la connexion pour les autres utilisateurs
  }
}
