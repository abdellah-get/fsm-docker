"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus } from "lucide-react";
import { getSession } from "next-auth/react"; // 👈 Remplacement de Supabase par NextAuth
import { getFacturesDataSQL, createFactureSQL } from "./actions";
import Link from "next/link";
import toast, { Toaster } from "react-hot-toast";
import Button from "../../../components/ui/Button";
import Input from "../../../components/ui/Input";
import Modal from "../../../components/ui/Modal";
import Select from "../../../components/ui/Select";

// =========================================================================
// TYPES STRICTS
// =========================================================================
interface FactureRow {
  id: string;
  montant_ht: number;
  montant_ttc: number;
  taux_tva: number;
  statut: "EN_ATTENTE" | "PAYEE" | "EN_RETARD";
  date_echeance: string;
  created_at: string;
  interventions: {
    titre: string;
    clients: {
      nom_complet: string;
    };
  };
}

interface InterventionOption {
  id: string;
  titre: string;
  clients: { nom_complet: string };
}

export default function FacturationPage() {
  // ❌ createClient() de Supabase a été supprimé ici !

  // --- ÉTATS ---
  const [factures, setFactures] = useState<FactureRow[]>([]);
  const [interventions, setInterventions] = useState<InterventionOption[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitLoading, setSubmitLoading] = useState<boolean>(false);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [entrepriseId, setEntrepriseId] = useState<string | null>(null);

  // --- FORMULAIRE ---
  const [formData, setFormData] = useState({
    intervention_id: "",
    montant_ht: "",
    date_echeance: "",
  });

  // =========================================================================
  // PIPELINE DE CHARGEMENT VIA SQL & NEXTAUTH
  // =========================================================================
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      // 1. Récupération de la session via NextAuth (100% local)
      const session = await getSession();
      if (!session || !session.user) throw new Error("Session introuvable.");

      // 2. Appel de l'action SQL pour récupérer toutes les données
      const result = await getFacturesDataSQL(session.user.id);

      if (!result.success) throw new Error(result.error);

      setEntrepriseId(result.entrepriseId || null);
      setFactures((result.factures as unknown as FactureRow[]) || []);
      setInterventions(
        (result.interventions as unknown as InterventionOption[]) || [],
      );
    } catch (error) {
      const err = error as Error;
      console.error("Erreur de chargement Facturation :", err);
      toast.error("Erreur de récupération des données.");
    } finally {
      setLoading(false);
    }
  }, []); // 👈 Supabase a été retiré des dépendances

  useEffect(() => {
    const initData = async () => {
      await fetchData();
    };
    void initData();
  }, [fetchData]);

  // =========================================================================
  // CRÉATION D'UNE FACTURE VIA SQL
  // =========================================================================
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!entrepriseId) return;

    try {
      setSubmitLoading(true);

      const ht = parseFloat(formData.montant_ht);
      const tva = 20.0;
      const ttc = ht * (1 + tva / 100);

      const payload = {
        entreprise_id: entrepriseId,
        intervention_id: formData.intervention_id,
        montant_ht: ht,
        taux_tva: tva,
        montant_ttc: ttc,
        date_echeance: formData.date_echeance,
        statut: "EN_ATTENTE",
      };

      // 📍 Appel de l'action SQL pour l'insertion
      const result = await createFactureSQL(payload);
      if (!result.success) throw new Error(result.error);

      setFormData({ intervention_id: "", montant_ht: "", date_echeance: "" });
      setIsModalOpen(false);
      toast.success("Facture générée avec succès");

      // On rafraîchit les données de la page
      await fetchData();
    } catch (error) {
      const err = error as Error;
      console.error("Erreur de création de facture :", err);
      toast.error(`Erreur: ${err.message}`);
    } finally {
      setSubmitLoading(false);
    }
  }

  const formatMAD = (montant: number) => {
    return new Intl.NumberFormat("fr-MA", {
      style: "currency",
      currency: "MAD",
    }).format(montant);
  };

  // Options pour le select
  const interventionOptions = interventions.map((inter) => ({
    value: inter.id,
    label: `${inter.clients?.nom_complet} - ${inter.titre}`,
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <p className="text-gray-500 dark:text-gray-400 animate-pulse font-medium">
          Chargement de la comptabilité...
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <Toaster position="top-right" />
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Facturation DGI
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Gérez vos factures et suivez vos encaissements.
          </p>
        </div>

        <Button
          onClick={() => setIsModalOpen(true)}
          icon={<Plus size={16} />}
          variant="primary"
        >
          Nouvelle Facture
        </Button>
      </div>

      {/* TABLEAU DES FACTURES */}
      <div className="bg-white dark:bg-dark-800 border border-gray-200 dark:border-dark-700 rounded-xl overflow-hidden shadow-sm">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-dark-700 text-left text-sm">
          <thead className="bg-gray-50 dark:bg-dark-900/50 text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold">
            <tr>
              <th className="px-6 py-3">Client & Prestation</th>
              <th className="px-6 py-3">Date échéance</th>
              <th className="px-6 py-3">Montant TTC</th>
              <th className="px-6 py-3">Statut</th>
              <th className="px-6 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-dark-700 text-gray-700 dark:text-gray-300">
            {factures.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-6 py-10 text-center text-gray-400 dark:text-gray-500"
                >
                  Aucune facture générée pour le moment.
                </td>
              </tr>
            ) : (
              factures.map((facture) => (
                <tr
                  key={facture.id}
                  className="hover:bg-gray-50 dark:hover:bg-dark-700/50 transition-colors"
                >
                  <td className="px-6 py-4">
                    <div className="font-semibold text-gray-900 dark:text-gray-100">
                      {facture.interventions?.clients?.nom_complet ||
                        "Client inconnu"}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {facture.interventions?.titre}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-600 dark:text-gray-400 font-medium">
                    {new Date(facture.date_echeance).toLocaleDateString(
                      "fr-FR",
                    )}
                  </td>
                  <td className="px-6 py-4 font-bold text-gray-900 dark:text-gray-100">
                    {formatMAD(facture.montant_ttc)}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        facture.statut === "PAYEE"
                          ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-400"
                          : facture.statut === "EN_RETARD"
                            ? "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400"
                            : "bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-400"
                      }`}
                    >
                      {facture.statut.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      href={`/dashboard/factures/${facture.id}`}
                      className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 text-sm font-bold flex items-center justify-end gap-1"
                    >
                      <span>Voir le PDF</span> &rarr;
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ✅ MODAL AVEC COMPOSANT MODAL */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Émettre une Facture"
        maxWidth="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {interventions.length === 0 && (
            <div className="text-xs text-amber-800 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg border border-amber-200 dark:border-amber-800 mb-4">
              <strong>Attention :</strong> Aucune intervention n'est
              actuellement clôturée. Vous devez d'abord terminer une mission
              avant de pouvoir la facturer.
            </div>
          )}

          <Select
            label="Intervention à facturer"
            options={interventionOptions}
            placeholder={
              interventions.length === 0
                ? "Aucune mission disponible"
                : "Sélectionnez une intervention terminée"
            }
            value={formData.intervention_id}
            onChange={(e) =>
              setFormData({
                ...formData,
                intervention_id: e.target.value,
              })
            }
            required
            disabled={interventions.length === 0}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Montant HT (MAD)"
              type="number"
              step="0.01"
              placeholder="Ex: 1500.00"
              value={formData.montant_ht}
              onChange={(e) =>
                setFormData({ ...formData, montant_ht: e.target.value })
              }
              required
              disabled={interventions.length === 0}
            />

            <Input
              label="Date échéance"
              type="date"
              value={formData.date_echeance}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  date_echeance: e.target.value,
                })
              }
              required
              disabled={interventions.length === 0}
            />
          </div>

          {formData.montant_ht && (
            <div className="bg-gray-50 dark:bg-dark-800/50 p-3 rounded-lg border border-gray-100 dark:border-dark-700 text-sm">
              <div className="flex justify-between text-gray-500 dark:text-gray-400 mb-1">
                <span>TVA (20%)</span>
                <span>{formatMAD(parseFloat(formData.montant_ht) * 0.2)}</span>
              </div>
              <div className="flex justify-between font-bold text-gray-900 dark:text-gray-100">
                <span>Total TTC à facturer</span>
                <span>{formatMAD(parseFloat(formData.montant_ht) * 1.2)}</span>
              </div>
            </div>
          )}

          <div className="pt-4 flex justify-end gap-3 border-t border-gray-200 dark:border-dark-700 mt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsModalOpen(false)}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={submitLoading}
              disabled={interventions.length === 0}
            >
              {submitLoading ? "Génération..." : "Créer la facture"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
