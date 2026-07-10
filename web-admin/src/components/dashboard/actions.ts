"use server";

import pool from "../../lib/db"; // 👈 Ajuste le chemin vers ton lib/db.ts si besoin

export async function getTwilioConfigSQL(entrepriseId: string) {
  try {
    const query = `
      SELECT twilio_account_sid, twilio_auth_token, twilio_whatsapp_number
      FROM entreprises
      WHERE id = $1
    `;
    const { rows } = await pool.query(query, [entrepriseId]);

    if (rows.length === 0) {
      return { success: false, error: "Entreprise introuvable." };
    }

    return { success: true, data: rows[0] };
  } catch (error: any) {
    console.error("Erreur SQL [getTwilioConfigSQL]:", error);
    return { success: false, error: error.message };
  }
}

export async function updateTwilioConfigSQL(
  entrepriseId: string,
  payload: any,
) {
  try {
    const query = `
      UPDATE entreprises
      SET twilio_account_sid = $1, 
          twilio_auth_token = $2, 
          twilio_whatsapp_number = $3
      WHERE id = $4
    `;
    const values = [
      payload.twilio_account_sid,
      payload.twilio_auth_token,
      payload.twilio_whatsapp_number,
      entrepriseId,
    ];

    await pool.query(query, values);
    return { success: true };
  } catch (error: any) {
    console.error("Erreur SQL [updateTwilioConfigSQL]:", error);
    return { success: false, error: error.message };
  }
}
