"use server";

import { createClient } from "@supabase/supabase-js";

// ⚠️ Initialisation du client Admin avec la SERVICE_ROLE_KEY
// Ce client possède tous les droits et ignore les RLS (Row Level Security).
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
    // 1. Création de l'utilisateur dans le système d'authentification global Supabase
    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email: payload.email,
        password: payload.mot_de_passe,
        email_confirm: true, // ✅ Force l'email comme "vérifié" pour éviter l'envoi d'un mail de confirmation
        user_metadata: {
          nom_complet: payload.nom_complet,
          role: "TECHNICIEN",
        },
      });

    if (authError) throw new Error(authError.message);

    const userId = authData.user.id;

    // 2. Insertion du profil dans TA table publique "utilisateurs"
    const { error: dbError } = await supabaseAdmin.from("utilisateurs").insert([
      {
        id: userId, // On lie l'ID d'authentification à l'ID de la table
        entreprise_id: payload.entreprise_id,
        nom_complet: payload.nom_complet,
        telephone: payload.telephone,
        role: "TECHNICIEN", // Assure-toi d'avoir une colonne "role" dans ta table
      },
    ]);

    // 💡 GESTION EXPERTE : Le "Rollback"
    if (dbError) {
      // Si l'insertion dans la BDD échoue (ex: erreur de syntaxe),
      // on supprime le compte Auth fraîchement créé pour ne pas avoir de compte "fantôme".
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
