"use server";

import pool from "../../../lib/db"; // Ajuste le chemin vers lib/db.ts si besoin

export async function getPositionsSQL() {
  try {
    const query = `
      SELECT id, nom_complet, current_lat, current_lng 
      FROM utilisateurs 
      WHERE current_lat IS NOT NULL
    `;
    const { rows } = await pool.query(query);
    return rows;
  } catch (error) {
    console.error("Erreur de récupération des positions:", error);
    return [];
  }
}
