"use client";

import { useEffect, useState } from "react";
import { createClient } from "../../utils/supabase/client";
import { PDFDownloadLink } from "@react-pdf/renderer";
import {
  InvoiceTemplate,
  InvoiceData,
} from "../../components/pdf/InvoiceTemplate";

interface ClientJointure {
  nom_complet: string;
  adresse_geographique: string;
}

interface InterventionJointure {
  titre: string;
  clients: ClientJointure | null;
}

interface FactureDbRow {
  id: string;
  montant_ht: number;
  montant_ttc: number;
  statut: string;
  created_at: string;
  interventions: InterventionJointure | null;
}

// Données de test pour le bouton d'action rapide (Conforme DGI Maroc)
const sampleInvoiceData: InvoiceData = {
  invoiceNumber: "FAC-TEST-2026",
  date: new Date().toLocaleDateString("fr-FR"),
  clientName: "Client Test Maroc S.A.R.L",
  clientAddress: "Anfa Place, Boulevard de la Corniche, Casablanca",
  clientICE: "001234567890123",
  items: [
    {
      description:
        "Intervention de maintenance infrastructure réseau & serveurs",
      quantity: 1,
      priceHT: 5000,
    },
  ],
  totalHT: 5000,
  tva: 1000, // 20% de TVA
  totalTTC: 6000,
};

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

        const { count: interventionsCount, error: intError } = await supabase
          .from("interventions")
          .select("*", { count: "exact", head: true })
          .eq("entreprise_id", entrepriseId)
          .eq("statut", "EN_COURS");

        if (intError) {
          console.error("Erreur lors du comptage des interventions:", intError);
        }

        const { data: facturesData, error: facError } = await supabase
          .from("factures")
          .select(
            `
            id,
            montant_ht,
            montant_ttc,
            statut,
            created_at,
            interventions (
              titre,
              clients (
                nom_complet,
                adresse_geographique
              )
            )
          `,
          )
          .eq("entreprise_id", entrepriseId)
          .order("created_at", { ascending: false });

        if (facError) throw facError;

        let enAttenteTotal = 0;
        let caMensuelTotal = 0;
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();

        if (facturesData) {
          (facturesData as unknown as FactureDbRow[]).forEach((fac) => {
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
          interventionsEnCours: interventionsCount || 0,
          facturesEnAttente: enAttenteTotal,
          chiffreAffaires: caMensuelTotal,
        });

        setRecentInvoices((facturesData as unknown as FactureDbRow[]) || []);
      } catch (error) {
        console.error("Erreur générale lors du chargement des données:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, [supabase]);

  const mapFactureToPDF = (facture: FactureDbRow): InvoiceData => {
    const intervention = facture.interventions;
    const client = intervention?.clients;

    return {
      invoiceNumber: `FAC-${facture.id.slice(0, 8).toUpperCase()}`,
      date: new Date(facture.created_at).toLocaleDateString("fr-FR"),
      clientName: client?.nom_complet || "Client Inconnu",
      clientAddress: client?.adresse_geographique || "Non renseignée",
      clientICE: "Non renseigné",
      items: [
        {
          description: intervention?.titre || "Intervention Technique",
          quantity: 1,
          priceHT: Number(facture.montant_ht || 0),
        },
      ],
      totalHT: Number(facture.montant_ht || 0),
      tva: Number(facture.montant_ttc || 0) - Number(facture.montant_ht || 0),
      totalTTC: Number(facture.montant_ttc || 0),
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-100">
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
          n_a été trouvé dans la table{" "}
          <code className="bg-amber-100 px-1 rounded font-mono">
            utilisateurs
          </code>{" "}
          pour vous lier à un espace de travail.
        </p>
        <div className="text-left bg-gray-900 text-gray-100 p-4 rounded-lg text-xs font-mono overflow-x-auto">
          Veuillez exécuter le script injection SQL pour lier votre UID.
        </div>
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

      {/* Grille des KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h3 className="text-sm font-medium text-gray-500 mb-2">
            Interventions en cours
          </h3>
          <p className="text-3xl font-bold text-gray-900">
            {stats.interventionsEnCours}
          </p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h3 className="text-sm font-medium text-gray-500 mb-2">
            Factures en attente
          </h3>
          <p className="text-3xl font-bold text-gray-900">
            {stats.facturesEnAttente.toLocaleString("fr-MA")} MAD
          </p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h3 className="text-sm font-medium text-gray-500 mb-2">
            Chiffre affaires (Mensuel)
          </h3>
          <p className="text-3xl font-bold text-emerald-600">
            {stats.chiffreAffaires.toLocaleString("fr-MA")} MAD
          </p>
        </div>
      </div>

      {/* ========================================================= */}
      {/* SECTION RÉINTEGRÉE : ACTIONS RAPIDES (BOUTON TEST PDF) */}
      {/* ========================================================= */}
      <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="font-semibold text-gray-900">
            Générer une facture de test
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Testez la génération de documents PDF conformes à la DGI Maroc.
          </p>
        </div>

        <PDFDownloadLink
          document={<InvoiceTemplate invoiceData={sampleInvoiceData} />}
          fileName={`Facture_TEST_DGI.pdf`}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-lg font-medium transition-colors shadow-sm"
        >
          {({ loading }) => (
            <>
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
              {loading ? "Génération..." : "Télécharger PDF"}
            </>
          )}
        </PDFDownloadLink>
      </div>

      {/* Tableau des Factures récentes */}
      <div className="mt-8">
        <h3 className="text-lg font-bold text-gray-900 mb-4">
          Factures récentes
        </h3>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {recentInvoices.length === 0 ? (
            <p className="p-6 text-gray-500 text-sm text-center">
              Aucune facture trouvée pour votre entreprise.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase">
                    <th className="p-4">N° Facture</th>
                    <th className="p-4">Client</th>
                    <th className="p-4">Montant TTC</th>
                    <th className="p-4">Statut</th>
                    <th className="p-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {recentInvoices.map((fac) => {
                    const pdfData = mapFactureToPDF(fac);
                    return (
                      <tr key={fac.id} className="hover:bg-gray-50">
                        <td className="p-4 font-medium text-gray-900">
                          {pdfData.invoiceNumber}
                        </td>
                        <td className="p-4 text-gray-600">
                          {pdfData.clientName}
                        </td>
                        <td className="p-4 font-semibold text-gray-900">
                          {pdfData.totalTTC.toLocaleString("fr-MA")} MAD
                        </td>
                        <td className="p-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              fac.statut === "PAYEE"
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-amber-50 text-amber-700"
                            }`}
                          >
                            {fac.statut}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <PDFDownloadLink
                            document={<InvoiceTemplate invoiceData={pdfData} />}
                            fileName={`Facture_${pdfData.invoiceNumber}.pdf`}
                            className="inline-flex items-center gap-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-1.5 px-3 rounded-md transition-colors"
                          >
                            {({ loading }) => (loading ? "Calcul..." : "PDF")}
                          </PDFDownloadLink>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
