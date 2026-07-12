"use client";

import React, { useState, useEffect, useCallback, use } from "react";
import Button from "../../../../components/ui/Button";
import { getFactureDetailSQL } from "./actions"; // 👈 Import de notre action SQL

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
  const resolvedParams = use(params);
  const factureId = resolvedParams.id;

  const [facture, setFacture] = useState<FactureComplete | null>(null);
  const [entreprise, setEntreprise] = useState<EntrepriseInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [debugMessage, setDebugMessage] = useState<string>("Initialisation...");

  const fetchFactureComplete = useCallback(async () => {
    if (!factureId) {
      setDebugMessage("Erreur : Aucun ID de facture dans l'URL.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setDebugMessage("Recherche de la facture et de l'entreprise via SQL...");

      // 📍 Appel de l'action serveur SQL
      const result = await getFactureDetailSQL(factureId);

      if (!result.success) {
        setDebugMessage(`⚠️ Blocage : ${result.error}`);
        return;
      }

      // Si succès, on met à jour les états avec les données SQL
      setFacture(result.facture as unknown as FactureComplete);
      setEntreprise(result.entreprise as EntrepriseInfo);
      setDebugMessage(""); // Efface le message de debug car tout s'est bien passé
    } catch (error) {
      const err = error as Error;
      setDebugMessage("🚨 Crash technique : " + err.message);
    } finally {
      setLoading(false);
    }
  }, [factureId]);

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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-dark-900">
        <div className="w-8 h-8 border-4 border-emerald-500 dark:border-emerald-400 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-gray-600 dark:text-gray-400 font-medium">
          {debugMessage}
        </p>
      </div>
    );
  }

  if (!facture || !entreprise) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-dark-900 p-10 flex items-start justify-center">
        <div className="max-w-2xl w-full bg-white dark:bg-dark-800 border border-red-200 dark:border-red-800 rounded-xl shadow-sm p-8 text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/30 mb-4">
            <svg
              className="h-6 w-6 text-red-600 dark:text-red-400"
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
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Impossible d'afficher le document
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-8 bg-red-50 dark:bg-red-900/20 p-4 rounded-lg font-mono text-sm border border-red-100 dark:border-red-800">
            {debugMessage}
          </p>
          <Button
            onClick={() => window.history.back()}
            variant="primary"
            className="px-6 py-2 bg-gray-900 hover:bg-black text-white focus:ring-gray-700"
          >
            Retour au tableau de bord
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-100 dark:bg-dark-900 min-h-screen p-8 print:p-0 print:bg-white">
      <div className="max-w-4xl mx-auto mb-6 flex justify-between items-center print:hidden">
        <Button
          onClick={() => window.history.back()}
          variant="secondary"
          className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 font-medium"
        >
          &larr; Retour aux factures
        </Button>
        <Button
          onClick={handlePrint}
          variant="primary"
          className="flex items-center gap-2"
        >
          Télécharger en PDF
        </Button>
      </div>

      <div className="max-w-4xl mx-auto bg-white dark:bg-dark-800 p-12 shadow-lg dark:shadow-dark-lg print:shadow-none print:max-w-full">
        <div className="flex justify-between items-start border-b border-gray-200 dark:border-dark-700 pb-8 mb-8">
          <div>
            <h1 className="text-3xl font-black text-gray-900 dark:text-gray-100 uppercase tracking-wider">
              {entreprise.nom}
            </h1>
            <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
              <p>
                ICE :{" "}
                <span className="font-semibold text-gray-900 dark:text-gray-100">
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
            <h2 className="text-4xl font-light text-gray-300 dark:text-gray-600 uppercase mb-2">
              Facture
            </h2>
            <p className="font-bold text-gray-900 dark:text-gray-100">
              Réf : FAC-{new Date(facture.created_at).getFullYear()}-
              {facture.id.split("-")[0].toUpperCase()}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Date : {new Date(facture.created_at).toLocaleDateString("fr-FR")}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Échéance :{" "}
              {new Date(facture.date_echeance).toLocaleDateString("fr-FR")}
            </p>
          </div>
        </div>

        <div className="mb-12 flex justify-end">
          <div className="w-1/2 bg-gray-50 dark:bg-dark-700/50 p-6 rounded-lg border border-gray-100 dark:border-dark-700">
            <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-2">
              Facturé à :
            </p>
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              {facture.interventions?.clients?.nom_complet || "Client inconnu"}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              {facture.interventions?.clients?.adresse_geographique}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Tél : {facture.interventions?.clients?.telephone}
            </p>
          </div>
        </div>

        <table className="w-full mb-12 text-left border-collapse">
          <thead>
            <tr className="border-b-2 border-gray-900 dark:border-gray-700 text-sm uppercase text-gray-600 dark:text-gray-400">
              <th className="py-3 font-bold">Description de la prestation</th>
              <th className="py-3 font-bold text-right">Qté</th>
              <th className="py-3 font-bold text-right">Prix Unitaire HT</th>
              <th className="py-3 font-bold text-right">Total HT</th>
            </tr>
          </thead>
          <tbody className="text-gray-800 dark:text-gray-300">
            <tr className="border-b border-gray-100 dark:border-dark-700">
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
            <div className="flex justify-between py-2 border-b border-gray-100 dark:border-dark-700">
              <span className="text-gray-600 dark:text-gray-400">
                Total Hors Taxe (HT)
              </span>
              <span className="font-bold text-gray-900 dark:text-gray-100">
                {formatMAD(facture.montant_ht)}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100 dark:border-dark-700">
              <span className="text-gray-600 dark:text-gray-400">
                TVA ({facture.taux_tva}%)
              </span>
              <span className="font-bold text-gray-900 dark:text-gray-100">
                {formatMAD(facture.montant_ttc - facture.montant_ht)}
              </span>
            </div>
            <div className="flex justify-between py-4 bg-gray-50 dark:bg-dark-700/50 rounded-lg px-4 mt-2 border border-gray-200 dark:border-dark-700">
              <span className="text-lg font-bold text-gray-900 dark:text-gray-100 uppercase">
                Net à payer TTC
              </span>
              <span className="text-xl font-black text-emerald-700 dark:text-emerald-400">
                {formatMAD(facture.montant_ttc)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
