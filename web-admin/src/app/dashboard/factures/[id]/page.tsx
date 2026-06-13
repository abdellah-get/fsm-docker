"use client";

import React, { useState, useEffect, useCallback, use } from "react";
import { createClient } from "../../../../utils/supabase/client";

// Types stricts
interface FactureComplete {
  id: string;
  montant_ht: number;
  montant_ttc: number;
  taux_tva: number;
  date_echeance: string;
  created_at: string;
  entreprise_id: string;
  interventions: {
    titre: string;
    clients: {
      nom_complet: string;
      adresse_geographique: string;
      telephone: string;
    };
  };
}

interface EntrepriseInfo {
  nom: string;
  ice: string;
  rc: string;
  if_fiscal: string;
  patente: string;
}

export default function FacturePDFPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // 1. Déballage strict pour Next.js 15+
  const resolvedParams = use(params);
  const factureId = resolvedParams.id;

  const supabase = createClient();

  const [facture, setFacture] = useState<FactureComplete | null>(null);
  const [entreprise, setEntreprise] = useState<EntrepriseInfo | null>(null);
  const [loading, setLoading] = useState(true);

  // 💡 L'ASTUCE PRO : Un état pour tracer l'erreur exacte à l'écran
  const [debugMessage, setDebugMessage] = useState<string>("Initialisation...");

  const fetchFactureComplete = useCallback(async () => {
    if (!factureId) {
      setDebugMessage("Erreur : Aucun ID de facture dans l'URL.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setDebugMessage(
        "Étape 1 : Recherche de la facture dans la base de données...",
      );

      // A. Récupérer la facture
      const { data: factData, error: factError } = await supabase
        .from("factures")
        .select(
          `
          id, montant_ht, montant_ttc, taux_tva, date_echeance, created_at, entreprise_id,
          interventions ( titre, clients ( nom_complet, adresse_geographique, telephone ) )
        `,
        )
        .eq("id", factureId)
        .maybeSingle();

      if (factError)
        throw new Error("Erreur SQL Factures : " + factError.message);

      if (!factData) {
        setDebugMessage(
          `⚠️ Blocage : Aucune facture trouvée pour l'ID [${factureId}]. Soit cet ID n'existe pas, soit tes règles RLS bloquent l'accès.`,
        );
        return; // On arrête tout ici
      }

      setFacture(factData as unknown as FactureComplete);
      setDebugMessage(
        "Étape 2 : Facture trouvée. Récupération de l'entreprise associée...",
      );

      // B. Récupérer l'entreprise
      if (factData.entreprise_id) {
        const { data: entData, error: entError } = await supabase
          .from("entreprises")
          .select("nom, ice, rc, if_fiscal, patente")
          .eq("id", factData.entreprise_id)
          .maybeSingle();

        if (entError)
          throw new Error("Erreur SQL Entreprises : " + entError.message);

        if (!entData) {
          setDebugMessage(
            `⚠️ Blocage : Facture lue avec succès, mais l'entreprise [${factData.entreprise_id}] est introuvable. Vérifie ta table 'entreprises' (droits RLS ou ligne effacée).`,
          );
          return;
        }

        setEntreprise(entData as EntrepriseInfo);
        setDebugMessage(""); // Tout est parfait !
      }
    } catch (error) {
      const err = error as Error;
      setDebugMessage("🚨 Crash technique : " + err.message);
    } finally {
      setLoading(false);
    }
  }, [supabase, factureId]);

  useEffect(() => {
    const initProcess = async () => {
      await fetchFactureComplete();
    };
    initProcess();
  }, [fetchFactureComplete]);

  const handlePrint = () => {
    window.print();
  };

  const formatMAD = (montant: number) => {
    return new Intl.NumberFormat("fr-MA", {
      style: "currency",
      currency: "MAD",
    }).format(montant);
  };

  // --- RENDU D'ÉCRAN ---

  // 1. Écran de chargement avec indication de l'étape
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-gray-600 font-medium">{debugMessage}</p>
      </div>
    );
  }

  // 2. Écran d'erreur détaillé (Remplacera le simple "Document introuvable")
  if (!facture || !entreprise) {
    return (
      <div className="min-h-screen bg-gray-50 p-10 flex items-start justify-center">
        <div className="max-w-2xl w-full bg-white border border-red-200 rounded-xl shadow-sm p-8 text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
            <svg
              className="h-6 w-6 text-red-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Impossible de afficher le document
          </h2>
          <p className="text-gray-600 mb-8 bg-red-50 p-4 rounded-lg font-mono text-sm border border-red-100">
            {debugMessage}
          </p>
          <button
            onClick={() => window.history.back()}
            className="px-6 py-2 bg-gray-900 text-white hover:bg-gray-800 rounded-lg font-medium transition-colors"
          >
            Retour au tableau de bord
          </button>
        </div>
      </div>
    );
  }

  // 3. LA FACTURE (Si tout est bon)
  return (
    <div className="bg-gray-100 min-h-screen p-8 print:p-0 print:bg-white">
      <div className="max-w-4xl mx-auto mb-6 flex justify-between items-center print:hidden">
        <button
          onClick={() => window.history.back()}
          className="text-gray-600 hover:text-gray-900 font-medium"
        >
          &larr; Retour aux factures
        </button>
        <button
          onClick={handlePrint}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-lg font-medium shadow-sm flex items-center gap-2"
        >
          Télécharger en PDF
        </button>
      </div>

      <div className="max-w-4xl mx-auto bg-white p-12 shadow-lg print:shadow-none print:max-w-full">
        <div className="flex justify-between items-start border-b pb-8 mb-8">
          <div>
            <h1 className="text-3xl font-black text-gray-900 uppercase tracking-wider">
              {entreprise.nom}
            </h1>
            <div className="mt-4 text-sm text-gray-600">
              <p>
                ICE :{" "}
                <span className="font-semibold text-gray-900">
                  {entreprise.ice}
                </span>
              </p>
              <p>
                RC : {entreprise.rc} | IF : {entreprise.if_fiscal}
              </p>
              <p>Patente : {entreprise.patente}</p>
            </div>
          </div>
          <div className="text-right">
            <h2 className="text-4xl font-light text-gray-300 uppercase mb-2">
              Facture
            </h2>
            <p className="font-bold text-gray-900">
              Réf : FAC-{new Date(facture.created_at).getFullYear()}-
              {facture.id.split("-")[0].toUpperCase()}
            </p>
            <p className="text-sm text-gray-500">
              Date : {new Date(facture.created_at).toLocaleDateString("fr-FR")}
            </p>
            <p className="text-sm text-gray-500">
              Échéance :{" "}
              {new Date(facture.date_echeance).toLocaleDateString("fr-FR")}
            </p>
          </div>
        </div>

        <div className="mb-12 flex justify-end">
          <div className="w-1/2 bg-gray-50 p-6 rounded-lg border border-gray-100">
            <p className="text-xs font-bold text-gray-400 uppercase mb-2">
              Facturé à :
            </p>
            <h3 className="text-xl font-bold text-gray-900">
              {facture.interventions?.clients?.nom_complet || "Client inconnu"}
            </h3>
            <p className="text-sm text-gray-600 mt-2">
              {facture.interventions?.clients?.adresse_geographique}
            </p>
            <p className="text-sm text-gray-600 mt-1">
              Tél : {facture.interventions?.clients?.telephone}
            </p>
          </div>
        </div>

        <table className="w-full mb-12 text-left border-collapse">
          <thead>
            <tr className="border-b-2 border-gray-900 text-sm uppercase text-gray-600">
              <th className="py-3 font-bold">Description de la prestation</th>
              <th className="py-3 font-bold text-right">Qté</th>
              <th className="py-3 font-bold text-right">Prix Unitaire HT</th>
              <th className="py-3 font-bold text-right">Total HT</th>
            </tr>
          </thead>
          <tbody className="text-gray-800">
            <tr className="border-b border-gray-100">
              <td className="py-4 font-medium">
                {facture.interventions?.titre}
              </td>
              <td className="py-4 text-right">1</td>
              <td className="py-4 text-right">
                {formatMAD(facture.montant_ht)}
              </td>
              <td className="py-4 text-right">
                {formatMAD(facture.montant_ht)}
              </td>
            </tr>
          </tbody>
        </table>

        <div className="flex justify-end mb-16">
          <div className="w-1/2">
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-600">Total Hors Taxe (HT)</span>
              <span className="font-bold text-gray-900">
                {formatMAD(facture.montant_ht)}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-600">TVA ({facture.taux_tva}%)</span>
              <span className="font-bold text-gray-900">
                {formatMAD(facture.montant_ttc - facture.montant_ht)}
              </span>
            </div>
            <div className="flex justify-between py-4 bg-gray-50 rounded-lg px-4 mt-2 border border-gray-200">
              <span className="text-lg font-bold text-gray-900 uppercase">
                Net à payer TTC
              </span>
              <span className="text-xl font-black text-emerald-700">
                {formatMAD(facture.montant_ttc)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
