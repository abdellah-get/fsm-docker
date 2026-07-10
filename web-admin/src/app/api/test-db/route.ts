import { NextResponse } from "next/server";
import pool from "../../../lib/db";

export async function GET() {
  try {
    // On essaie d'exécuter une requête très simple
    const result = await pool.query("SELECT NOW()");

    return NextResponse.json({
      success: true,
      message: "Connexion réussie !",
      time: result.rows[0].now,
    });
  } catch (error: any) {
    // Si ça échoue, on renvoie L'ERREUR EXACTE de PostgreSQL
    return NextResponse.json({
      success: false,
      error: "Erreur de connexion",
      details: error.message, // <--- C'est ça qui va nous sauver
    });
  }
}
