"use server";

import pool from "../../lib/db"; // 👈 Ajuste le chemin vers ton lib/db.ts si besoin

export async function getEntreprisesPubliquesSQL() {
  try {
    const query = `
      SELECT id, nom, telephone, email 
      FROM entreprises 
      ORDER BY nom ASC
    `;
    const { rows } = await pool.query(query);

    return { success: true, data: rows };
  } catch (error: any) {
    console.error("Erreur SQL [getEntreprisesPubliquesSQL]:", error);
    return { success: false, error: error.message };
  }
}
