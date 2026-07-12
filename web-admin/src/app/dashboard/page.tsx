"use client";

import { useEffect, useState } from "react";
import { getSession } from "next-auth/react"; // 👈 Remplacement de Supabase
import Link from "next/link";
import { getDashboardDataSQL } from "./actions";

import RecentInvoicesTable, {
  FactureDbRow,
} from "../../components/dashboard/RecentInvoicesTable";
import PendingRequestsCard, {
  DemandeDbRow,
} from "../../components/dashboard/PendingRequestsCard";

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [noProfile, setNoProfile] = useState(false);
  const [entrepriseId, setEntrepriseId] = useState<string | null>(null);

  const [stats, setStats] = useState({
    interventionsEnCours: 0,
    facturesEnAttente: 0,
    chiffreAffaires: 0,
  });

  const [recentInvoices, setRecentInvoices] = useState<FactureDbRow[]>([]);
  const [pendingRequests, setPendingRequests] = useState<DemandeDbRow[]>([]);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        setLoading(true);

        // 1. Vérification de la session Auth (100% Local avec NextAuth)
        const session = await getSession();
        if (!session || !session.user) return;

        // 2. Appel de ton action SQL qui s'occupe de TOUT
        const result = await getDashboardDataSQL(session.user.id);

        if (!result.success) {
          if (result.noProfile) {
            setNoProfile(true);
          } else {
            console.error("Erreur SQL:", result.error);
          }
          return;
        }

        // 3. On met à jour l'interface
        setEntrepriseId(result.entrepriseId);
        setStats(
          result.stats || {
            interventionsEnCours: 0,
            facturesEnAttente: 0,
            chiffreAffaires: 0,
          },
        );
        setRecentInvoices(
          (result.recentInvoices as unknown as FactureDbRow[]) || [],
        );
        setPendingRequests((result.pendingRequests as DemandeDbRow[]) || []);
      } catch (error) {
        console.error("Erreur générale lors du chargement des données:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, []);

  // =====================================================================
  // 📍 FONCTION : Envoi WhatsApp (Inchangée)
  // =====================================================================
  const envoyerFactureWhatsApp = async (
    telephoneClient: string,
    montant: string,
    urlPdfPublic: string,
    factureId: string,
    entIdParam: string,
  ) => {
    try {
      const response = await fetch("/api/whatsapp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          telephone: telephoneClient,
          montant: montant,
          lienPdf: urlPdfPublic,
          factureId: factureId,
          entrepriseId: entIdParam || entrepriseId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Échec de l'envoi");
      }

      alert("✅ Message WhatsApp envoyé avec succès au client !");
    } catch (error: any) {
      console.error(error);
      alert(`❌ L'envoi WhatsApp a échoué : ${error.message}`);
    }
  };
  // =====================================================================

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-gray-500 animate-pulse font-medium">
          Chargement du tableau de bord...
        </p>
      </div>
    );
  }

  if (noProfile) {
    return (
      <div className="p-6 max-w-xl mx-auto bg-amber-50 border border-amber-200 rounded-xl mt-12 text-center shadow-sm">
        <h3 className="text-lg font-bold text-amber-950 mb-2">
          Liaison entreprise manquante
        </h3>
        <p className="text-sm text-amber-900 mb-4">
          Votre compte authentification existe, mais aucun profil correspondant
          n'a été trouvé dans la table{" "}
          <code className="bg-amber-100 px-1 rounded font-mono">
            utilisateurs
          </code>{" "}
          pour vous lier à un espace de travail.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Vue d'ensemble
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Gérez vos interventions et suivez vos indicateurs de facturation.
          </p>
        </div>
        <Link
          href="/dashboard/suivi-techniciens"
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-lg font-medium text-sm flex items-center justify-center gap-2 shadow-sm transition"
        >
          📍 Suivre les techniciens en direct
        </Link>
      </div>

      {/* Demandes clients en attente */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
            Demandes en attente
          </h3>
          {pendingRequests.length > 0 && (
            <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2.5 py-1 rounded-full">
              {pendingRequests.length}
            </span>
          )}
        </div>
        <PendingRequestsCard demandes={pendingRequests} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-dark-800 p-6 rounded-xl border border-gray-200 dark:border-dark-700 shadow-sm transition-shadow hover:shadow-md">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
            Interventions en cours
          </h3>
          <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            {stats.interventionsEnCours}
          </p>
        </div>
        <div className="bg-white dark:bg-dark-800 p-6 rounded-xl border border-gray-200 dark:border-dark-700 shadow-sm transition-shadow hover:shadow-md">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
            Factures en attente
          </h3>
          <p className="text-3xl font-bold text-amber-600 dark:text-amber-500">
            {stats.facturesEnAttente.toLocaleString("fr-MA")} MAD
          </p>
        </div>
        <div className="bg-white dark:bg-dark-800 p-6 rounded-xl border border-gray-200 dark:border-dark-700 shadow-sm transition-shadow hover:shadow-md">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
            Chiffre affaires (Mensuel)
          </h3>
          <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
            {stats.chiffreAffaires.toLocaleString("fr-MA")} MAD
          </p>
        </div>
      </div>

      <div className="mt-8">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
            Factures récentes
          </h3>
        </div>

        <div className="bg-white dark:bg-dark-800 rounded-xl border border-gray-200 dark:border-dark-700 shadow-sm overflow-hidden">
          <RecentInvoicesTable
            invoices={recentInvoices}
            onSendWhatsApp={envoyerFactureWhatsApp}
          />
        </div>
      </div>
    </div>
  );
}
