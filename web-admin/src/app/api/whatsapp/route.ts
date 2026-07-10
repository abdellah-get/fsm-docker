import { NextResponse } from "next/server";
import pool from "../../../lib/db"; // Import de ta connexion Postgres centralisée
import twilio from "twilio";

export async function POST(request: Request) {
  try {
    const { telephone, montant, lienPdf, entrepriseId } = await request.json();

    if (!entrepriseId) {
      return NextResponse.json(
        { error: "ID Entreprise manquant" },
        { status: 400 },
      );
    }

    // 1. Récupérer les clés Twilio spécifiques à cette entreprise (Version SQL)
    const query = `
      SELECT twilio_account_sid, twilio_auth_token, twilio_whatsapp_number 
      FROM entreprises 
      WHERE id = $1
    `;
    const result = await pool.query(query, [entrepriseId]);

    // result.rows[0] correspond exactement au .single() de Supabase
    const entreprise = result.rows[0];

    // Si le tableau est vide, l'entreprise n'existe pas
    if (!entreprise) {
      return NextResponse.json(
        { error: "Entreprise introuvable ou non configurée." },
        { status: 404 },
      );
    }

    const { twilio_account_sid, twilio_auth_token, twilio_whatsapp_number } =
      entreprise;

    // 2. Vérification critique de sécurité
    if (!twilio_account_sid || !twilio_auth_token || !twilio_whatsapp_number) {
      return NextResponse.json(
        {
          error:
            "Veuillez d'abord configurer vos clés Twilio dans vos paramètres d'entreprise.",
        },
        { status: 400 },
      );
    }

    // 3. INITIALISATION DYNAMIQUE : On crée le client Twilio avec les clés du client !
    const dynamicTwilioClient = twilio(twilio_account_sid, twilio_auth_token);

    // 4. Exécution de l'envoi (Facturé sur son compte à lui)
    const message = await dynamicTwilioClient.messages.create({
      body: `Bonjour, votre facture d'un montant de ${montant} MAD est disponible. Vous pouvez la consulter ici : ${lienPdf}`,
      from: twilio_whatsapp_number, // Ex: whatsapp:+212611223344
      to: `whatsapp:${telephone}`,
    });

    console.log(`[Twilio] Message envoyé avec succès. SID : ${message.sid}`);

    return NextResponse.json({ success: true, messageSid: message.sid });
    // ✅ La méthode propre et sécurisée (TypeScript strict)
  } catch (error: unknown) {
    console.error("Erreur critique d'envoi WhatsApp Backend:", error);

    // On vérifie si l'erreur attrapée est bien un objet "Error" classique
    const errorMessage =
      error instanceof Error ? error.message : "Erreur interne du serveur";

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
