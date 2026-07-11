"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { getSession } from "next-auth/react";
import { getWorkHistorySQL } from "./actions"; // 👈 NOUVEAU : Import de l'action SQL
import Select from "../../../components/ui/Select";
import Button from "../../../components/ui/Button";
import { Loader2, ChevronDown, ClipboardCheck } from "lucide-react";
import { genererBonInterventionPDF } from "../../../utils/pdfGenerator";

interface InterventionTerminee {
  id: string;
  titre: string;
  date_prevue: string;
  prix_valide_a: string | null;
  montant_final: number | null;
  clients: { nom_complet: string } | null;
  demandes: { adresse: string | null } | null;
  compte_rendu: string | null;
  signature_client: string | null;
  signature_technicien: string | null;
}

const ITEMS_PER_PAGE = 10;

export default function WorkHistoryPage() {
  const [interventions, setInterventions] = useState<InterventionTerminee[]>(
    [],
  );
  const [page, setPage] = useState<number>(0);
  const [hasMore, setHasMore] = useState<boolean>(true);

  const [loadingInitial, setLoadingInitial] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const [periode, setPeriode] = useState<string>("tout");

  // =========================================================================
  // FONCTIONS UTILITAIRES (Inchangées)
  // =========================================================================

  const getBase64FromUrl = async (url: string): Promise<string> => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error("Erreur conversion image:", error);
      return "";
    }
  };

  const handleDownloadPDF = async (item: InterventionTerminee) => {
    setDownloadingId(item.id);
    try {
      const sigClientBase64 = item.signature_client
        ? await getBase64FromUrl(item.signature_client)
        : "";
      const sigTechBase64 = item.signature_technicien
        ? await getBase64FromUrl(item.signature_technicien)
        : "";

      const dateStr = new Date(
        item.prix_valide_a || item.date_prevue,
      ).toLocaleDateString("fr-FR");

      genererBonInterventionPDF({
        id: item.id,
        date: dateStr,
        titre: item.titre,
        clientNom: item.clients?.nom_complet || "Client inconnu",
        adresse: item.demandes?.adresse || "Non renseignée",
        compteRendu: item.compte_rendu || "Aucun compte-rendu saisi.",
        montant: item.montant_final || 0,
        signatureClientBase64: sigClientBase64,
        signatureTechBase64: sigTechBase64,
      });
    } catch (error) {
      console.error("Erreur lors du téléchargement :", error);
      alert("Impossible de générer le PDF.");
    } finally {
      setDownloadingId(null);
    }
  };

  // =========================================================================
  // CHARGEMENT DES DONNÉES VIA SQL
  // =========================================================================
  const fetchWorkHistory = useCallback(
    async (pageIndex: number, isInitialFetch = false) => {
      try {
        if (isInitialFetch) setLoadingInitial(true);
        else setLoadingMore(true);

        // 🟢 NOUVEAU : On utilise getSession de NextAuth au lieu de Supabase
        const session = await getSession();
        if (!session || !session.user) return;

        const currentUserId = (session.user as any).id;

        const from = pageIndex * ITEMS_PER_PAGE;

        // 📍 On appelle notre fonction SQL en passant l'ID du tech !
        const result = await getWorkHistorySQL(
          currentUserId,
          from,
          ITEMS_PER_PAGE,
        );

        if (!result.success) throw new Error(result.error);

        if (result.data) {
          if (result.data.length < ITEMS_PER_PAGE) setHasMore(false);
          else setHasMore(true);

          const fetchedData = result.data as InterventionTerminee[];
          setInterventions((prev) =>
            isInitialFetch ? fetchedData : [...prev, ...fetchedData],
          );
        }
      } catch (error) {
        console.error("Erreur chargement historique :", error);
      } finally {
        setLoadingInitial(false);
        setLoadingMore(false);
      }
    },
    [], // <-- Remove 'supabase' from dependencies
  );

  useEffect(() => {
    fetchWorkHistory(0, true);
  }, [periode, fetchWorkHistory]);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchWorkHistory(nextPage, false);
  };

  const filteredInterventions = useMemo(() => {
    if (periode === "tout") return interventions;

    const now = new Date();
    return interventions.filter((inv) => {
      const dateRealisation = new Date(inv.prix_valide_a || inv.date_prevue);

      if (periode === "jour") {
        return dateRealisation.toDateString() === now.toDateString();
      } else if (periode === "semaine") {
        const startOfWeek = new Date(now);
        startOfWeek.setDate(
          now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1),
        );
        startOfWeek.setHours(0, 0, 0, 0);
        return dateRealisation >= startOfWeek;
      } else if (periode === "mois") {
        return (
          dateRealisation.getMonth() === now.getMonth() &&
          dateRealisation.getFullYear() === now.getFullYear()
        );
      } else if (periode === "annee") {
        return dateRealisation.getFullYear() === now.getFullYear();
      }
      return true;
    });
  }, [periode, interventions]);

  // =========================================================================
  // RENDU UI (Inchangé)
  // =========================================================================
  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Mon Travail (Work)
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Historique de vos missions clôturées.
          </p>
        </div>
        <div className="w-full md:w-64">
          <Select
            value={periode}
            onChange={(e) => {
              setPeriode(e.target.value);
              setPage(0);
            }}
            options={[
              { label: "Aujourd'hui", value: "jour" },
              { label: "Cette semaine", value: "semaine" },
              { label: "Ce mois-ci", value: "mois" },
              { label: "Cette année", value: "annee" },
              { label: "Tout l'historique", value: "tout" },
            ]}
          />
        </div>
      </div>

      {loadingInitial ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : filteredInterventions.length === 0 ? (
        <div className="text-center p-12 bg-white dark:bg-dark-800 rounded-xl border border-gray-200 dark:border-dark-700 space-y-2">
          <ClipboardCheck className="h-10 w-10 mx-auto text-gray-400" />
          <p className="text-gray-500 font-medium">
            Aucun travail trouvé pour cette période.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredInterventions.map((item) => {
              const isDownloading = downloadingId === item.id;
              const dateStr = new Date(
                item.prix_valide_a || item.date_prevue,
              ).toLocaleDateString("fr-FR", {
                day: "numeric",
                month: "long",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              });

              return (
                <div
                  key={item.id}
                  className="bg-white dark:bg-dark-800 border border-gray-200 dark:border-dark-700 rounded-xl p-5 shadow-sm space-y-4 flex flex-col justify-between transition-all hover:shadow-md"
                >
                  <div className="space-y-3">
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1">
                        <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg line-clamp-1">
                          {item.titre}
                        </h3>
                        <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400 mt-1">
                          Client : {item.clients?.nom_complet || "Inconnu"}
                        </p>
                      </div>
                      <span className="bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-400 text-xs font-bold px-2 py-1 rounded shrink-0">
                        Terminée
                      </span>
                    </div>

                    <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1 pt-1 border-t border-gray-50 dark:border-dark-700/50">
                      <p>
                        🗓️ Fait le :{" "}
                        <span className="font-semibold text-gray-800 dark:text-gray-200">
                          {dateStr}
                        </span>
                      </p>
                      {item.montant_final && (
                        <p>
                          💰 Montant :{" "}
                          <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                            {item.montant_final} MAD
                          </span>
                        </p>
                      )}
                    </div>
                  </div>

                  <Button
                    onClick={() => handleDownloadPDF(item)}
                    variant="secondary"
                    className="w-full py-2 text-sm"
                    disabled={isDownloading}
                  >
                    {isDownloading ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />{" "}
                        Génération...
                      </span>
                    ) : (
                      "📄 Télécharger le Bon d'Intervention"
                    )}
                  </Button>
                </div>
              );
            })}
          </div>

          {hasMore && (
            <div className="pt-4 text-center">
              {loadingMore ? (
                <button
                  disabled
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-gray-500 bg-gray-100 rounded-lg border border-gray-200 cursor-not-allowed mx-auto"
                >
                  <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />{" "}
                  Chargement...
                </button>
              ) : (
                <button
                  onClick={handleLoadMore}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 rounded-lg shadow-sm transition-all"
                >
                  <ChevronDown size={16} /> Charger plus d'interventions
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CardSkeleton() {
  return (
    <div className="bg-white dark:bg-dark-800 border border-gray-200 dark:border-dark-700 rounded-xl p-5 shadow-sm space-y-4 animate-pulse">
      <div className="space-y-2">
        <div className="flex justify-between items-start gap-4">
          <div className="h-6 bg-gray-200 dark:bg-dark-700 rounded-md w-3/4" />
          <div className="h-5 bg-gray-200 dark:bg-dark-700 rounded w-16" />
        </div>
        <div className="h-4 bg-gray-200 dark:bg-dark-700 rounded-md w-1/2 mt-2" />
      </div>
      <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-dark-700">
        <div className="h-4 bg-gray-100 dark:bg-dark-700/50 rounded-md w-2/3" />
        <div className="h-4 bg-gray-100 dark:bg-dark-700/50 rounded-md w-1/3" />
      </div>
      <div className="h-9 bg-gray-200 dark:bg-dark-700 rounded-lg w-full mt-2" />
    </div>
  );
}
