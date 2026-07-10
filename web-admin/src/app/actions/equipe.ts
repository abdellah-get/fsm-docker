"use server";

import { createClient } from "@supabase/supabase-js";
import pool from "../../lib/db"; // 👈 Ajuste le chemin vers ton lib/db.ts si nécessaire

// ⚠️ Initialisation du client Admin avec la SERVICE_ROLE_KEY
// On le garde UNIQUEMENT pour la gestion de l'authentification (créer/supprimer des comptes)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

interface CreateTechnicianPayload {
  email: string;
  mot_de_passe: string;
  nom_complet: string;
  telephone: string;
  entreprise_id: string;
}

export async function createTechnicianAction(payload: CreateTechnicianPayload) {
  try {
    // 1. Création de l'utilisateur dans le système d'authentification global Supabase (ON GARDE)
    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email: payload.email,
        password: payload.mot_de_passe,
        email_confirm: true, // ✅ Force l'email comme "vérifié"
        user_metadata: {
          nom_complet: payload.nom_complet,
          role: "TECHNICIEN",
        },
      });

    if (authError) throw new Error(authError.message);

    const userId = authData.user.id;

    // 2. Insertion du profil dans TA table publique "utilisateurs" (PASSAGE EN SQL)
    try {
      const query = `
        INSERT INTO utilisateurs (id, entreprise_id, nom_complet, telephone, role)
        VALUES ($1, $2, $3, $4, $5)
      `;
      const values = [
        userId,
        payload.entreprise_id,
        payload.nom_complet,
        payload.telephone,
        "TECHNICIEN",
      ];

      await pool.query(query, values);
    } catch (dbError: any) {
      // 💡 GESTION EXPERTE : Le "Rollback"
      // Si l'insertion SQL échoue, on supprime le compte Auth pour ne pas avoir de compte "fantôme".
      await supabaseAdmin.auth.admin.deleteUser(userId);
      throw new Error(`Erreur d'insertion BDD : ${dbError.message}`);
    }

    return { success: true };
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Erreur Serveur [createTechnicianAction]:", err.message);
    return { success: false, error: err.message };
  }
}

export async function getEquipeDataAction(userId: string) {
  try {
    // 1. Récupérer l'entreprise_id du gérant
    const managerQuery = `SELECT entreprise_id FROM utilisateurs WHERE id = $1`;
    const managerRes = await pool.query(managerQuery, [userId]);

    if (managerRes.rows.length === 0) {
      return {
        success: false,
        error: "Profil utilisateur introuvable en base de données.",
      };
    }

    const entrepriseId = managerRes.rows[0].entreprise_id;

    // 2. Récupérer les techniciens de cette entreprise
    const techniciensQuery = `
      SELECT id, nom_complet, telephone, role 
      FROM utilisateurs 
      WHERE entreprise_id = $1 AND role = 'TECHNICIEN' 
      ORDER BY nom_complet ASC
    `;
    const techniciensRes = await pool.query(techniciensQuery, [entrepriseId]);

    return {
      success: true,
      entrepriseId,
      techniciens: techniciensRes.rows,
    };
  } catch (error: any) {
    console.error("Erreur SQL [getEquipeDataAction]:", error.message);
    return {
      success: false,
      error: "Erreur lors de la récupération des données.",
    };
  }
}
