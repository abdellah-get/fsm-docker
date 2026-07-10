import { NextResponse } from "next/server";
import { Pool } from "pg";

// On initialise la connexion à la base de données locale de Docker
const pool = new Pool({
  connectionString: process.env.LOCAL_DATABASE_URL,
});

export async function GET() {
  try {
    // 1. Création d'une table de test si elle n'existe pas
    await pool.query(`
      CREATE TABLE IF NOT EXISTS jalon_test (
        id SERIAL PRIMARY KEY,
        message VARCHAR(255)
      );
    `);

    // 2. Insertion d'une donnée pour prouver l'écriture
    await pool.query(
      `INSERT INTO jalon_test (message) VALUES ('Test Jalon 2 validé depuis Docker !')`,
    );

    // 3. Lecture de la dernière donnée insérée pour prouver la lecture
    const result = await pool.query(
      "SELECT * FROM jalon_test ORDER BY id DESC LIMIT 1",
    );

    // 4. On renvoie le résultat au navigateur
    return NextResponse.json({
      success: true,
      message: "Connexion locale réussie",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Erreur de base de données:", error);
    return NextResponse.json(
      { success: false, error: "Impossible de se connecter à la DB locale" },
      { status: 500 },
    );
  }
}
