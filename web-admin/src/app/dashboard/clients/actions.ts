"use server";

import pool from "../../../lib/db"; // Ajuste le chemin si besoin (ou utilise '@/lib/db')

// 1. Récupérer l'ID de l'entreprise via l'ID utilisateur
export async function getEntrepriseIdSQL(userId: string) {
  const { rows } = await pool.query(
    "SELECT entreprise_id FROM utilisateurs WHERE id = $1",
    [userId],
  );
  return rows[0]?.entreprise_id || null;
}

// 2. Lire la liste des clients
export async function getClientsSQL(entrepriseId: string) {
  const { rows } = await pool.query(
    "SELECT id, nom_complet, email, telephone, adresse_geographique, created_at FROM clients WHERE entreprise_id = $1 ORDER BY nom_complet ASC",
    [entrepriseId],
  );
  return rows;
}

// 3. Créer un client
export async function createClientSQL(payload: any) {
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
}

// 4. Mettre à jour un client
export async function updateClientSQL(
  id: string,
  entrepriseId: string,
  payload: any,
) {
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
}

// 5. Supprimer un client
export async function deleteClientSQL(id: string, entrepriseId: string) {
  await pool.query("DELETE FROM clients WHERE id = $1 AND entreprise_id = $2", [
    id,
    entrepriseId,
  ]);
}
