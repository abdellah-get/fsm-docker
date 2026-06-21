"use client";

import { useEffect, useState } from "react";
import { createClient } from "../../utils/supabase/client";
// On importe notre nouveau composant et l'interface associée
import RecentInvoicesTable, {
  FactureDbRow,
} from "../../components/dashboard/RecentInvoicesTable";
import PendingRequestsCard, {
  DemandeDbRow,
} from "../../components/dashboard/PendingRequestsCard";

export default function DashboardPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [noProfile, setNoProfile] = useState(false);
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

        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        const { data: userData, error: userError } = await supabase
          .from("utilisateurs")
          .select("entreprise_id")
          .eq("id", user.id)
          .maybeSingle();

        if (userError || !userData) {
          console.error("Erreur profil utilisateur:", userError);
          setNoProfile(true);
          return;
        }

        const entrepriseId = userData.entreprise_id;

        // Requêtes parallèles : FUSION de ton travail (entreprise_id) et celui de ton binôme (demandes)
        const [interventionsResponse, facturesResponse, demandesResponse] =
          await Promise.all([
            supabase
              .from("interventions")
              .select("*", { count: "exact", head: true })
              .eq("entreprise_id", entrepriseId)
              .eq("statut", "EN_COURS"),
            supabase
              .from("factures")
              .select(
                `
              id, entreprise_id, montant_ht, montant_ttc, statut, created_at,
              interventions (
                titre,
                clients (nom_complet, adresse_geographique, telephone)
              )
            `,
              )
              .eq("entreprise_id", entrepriseId)
              .order("created_at", { ascending: false })
              .limit(10), // Optimisation : on ne charge que les 10 plus récentes
            supabase
              .from("demandes")
              .select(
                "id, nom_complet, telephone, titre, description, statut, created_at",
              )
              .eq("entreprise_id", entrepriseId)
              .eq("statut", "EN_ATTENTE")
              .order("created_at", { ascending: false }),
          ]);

        if (interventionsResponse.error)
          console.error("Erreur interventions:", interventionsResponse.error);
        if (facturesResponse.error) throw facturesResponse.error;
        if (demandesResponse.error)
          console.error("Erreur demandes:", demandesResponse.error);

        let enAttenteTotal = 0;
        let caMensuelTotal = 0;
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();

        const facturesData = facturesResponse.data as unknown as FactureDbRow[];

        if (facturesData) {
          facturesData.forEach((fac) => {
            if (fac.statut === "EN_ATTENTE") {
              enAttenteTotal += Number(fac.montant_ttc || 0);
            }
            if (fac.statut === "PAYEE") {
              const dateFacture = new Date(fac.created_at);
              if (
                dateFacture.getMonth() === currentMonth &&
                dateFacture.getFullYear() === currentYear
              ) {
                caMensuelTotal += Number(fac.montant_ht || 0);
              }
            }
          });
        }

        setStats({
          interventionsEnCours: interventionsResponse.count || 0,
          facturesEnAttente: enAttenteTotal,
          chiffreAffaires: caMensuelTotal,
        });

        setRecentInvoices(facturesData || []);
        setPendingRequests(demandesResponse.data || []);
      } catch (error) {
        console.error("Erreur générale lors du chargement des données:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, [supabase]);

  // =====================================================================
  // 📍 FONCTION : Envoi WhatsApp
  // =====================================================================
  const envoyerFactureWhatsApp = async (
    telephoneClient: string,
    montant: string,
    urlPdfPublic: string,
    factureId: string,
    entrepriseId: string,
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
          entrepriseId: entrepriseId,
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
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Vue ensemble</h2>
        <p className="text-gray-500 mt-1">
          Gérez vos interventions et suivez vos indicateurs de facturation.
        </p>
      </div>

      {/* Nouvelle section : demandes clients en attente */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-gray-900">
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
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm transition-shadow hover:shadow-md">
          <h3 className="text-sm font-medium text-gray-500 mb-2">
            Interventions en cours
          </h3>
          <p className="text-3xl font-bold text-gray-900">
            {stats.interventionsEnCours}
          </p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm transition-shadow hover:shadow-md">
          <h3 className="text-sm font-medium text-gray-500 mb-2">
            Factures en attente
          </h3>
          <p className="text-3xl font-bold text-amber-600">
            {stats.facturesEnAttente.toLocaleString("fr-MA")} MAD
          </p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm transition-shadow hover:shadow-md">
          <h3 className="text-sm font-medium text-gray-500 mb-2">
            Chiffre affaires (Mensuel)
          </h3>
          <p className="text-3xl font-bold text-emerald-600">
            {stats.chiffreAffaires.toLocaleString("fr-MA")} MAD
          </p>
        </div>
      </div>

      <div className="mt-8">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-gray-900">Factures récentes</h3>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <RecentInvoicesTable
            invoices={recentInvoices}
            onSendWhatsApp={envoyerFactureWhatsApp}
          />
        </div>
      </div>
    </div>
  );
}
