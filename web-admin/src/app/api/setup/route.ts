import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function GET() {
  try {
    // 0. CORRECTION DE LA BASE DE DONNÉES
    await pool.query(
      `ALTER TABLE "public"."utilisateurs" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();`,
    );

    // 1. CHERCHER OU CRÉER L'ENTREPRISE
    let entrepriseId;
    const existingEntreprise = await pool.query(
      `SELECT id FROM entreprises WHERE ice = $1`,
      ["123456789012345"],
    );

    if (existingEntreprise.rows.length > 0) {
      // L'entreprise existe déjà (créée lors du test précédent), on récupère son ID
      entrepriseId = existingEntreprise.rows[0].id;
      console.log("Entreprise existante trouvée !");
    } else {
      // Elle n'existe pas, on la crée
      const newEntreprise = await pool.query(
        `
        INSERT INTO entreprises (nom, ice, rc, if_fiscal, patente, email, telephone)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id
      `,
        [
          "Wilance Test",
          "123456789012345",
          "RC-9999",
          "IF-8888",
          "PAT-7777",
          "contact@wilance.ma",
          "0600000000",
        ],
      );
      entrepriseId = newEntreprise.rows[0].id;
      console.log("Nouvelle entreprise créée !");
    }

    // 2. CHERCHER OU CRÉER L'UTILISATEUR
    const emailTest = "abdellah@wilance.ma";
    const motDePasseClair = "admin123";
    const motDePasseHache = await bcrypt.hash(motDePasseClair, 10);

    const existingUser = await pool.query(
      `SELECT id FROM utilisateurs WHERE email = $1`,
      [emailTest],
    );

    if (existingUser.rows.length > 0) {
      // L'utilisateur existe déjà, on met juste à jour son mot de passe au cas où
      await pool.query(
        `UPDATE utilisateurs SET password_hash = $1 WHERE email = $2`,
        [motDePasseHache, emailTest],
      );
    } else {
      // 3. Créer ton compte utilisateur Gérant
      await pool.query(
        `
        INSERT INTO utilisateurs (entreprise_id, role, nom_complet, email, password_hash)
        VALUES ($1, $2, $3, $4, $5)
      `,
        [entrepriseId, "GERANT", "Abdellah Admin", emailTest, motDePasseHache],
      );
    }

    return NextResponse.json({
      success: true,
      message: "Installation réussie à 100% ! La base de données est prête.",
      identifiants: {
        email: emailTest,
        mot_de_passe: motDePasseClair,
      },
      avertissement:
        "⚠️ SUPPRIMEZ CE FICHIER IMMÉDIATEMENT APRÈS UTILISATION !",
    });
  } catch (error: any) {
    console.error("Erreur lors de l'installation :", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}
