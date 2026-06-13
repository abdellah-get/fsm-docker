"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "../../../utils/supabase/client";
import Link from "next/link";

// =========================================================================
// TYPES STRICTS (Jointure Supabase : Facture -> Intervention -> Client)
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
  const supabase = createClient();

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
  // PIPELINE DE CHARGEMENT
  // =========================================================================
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();
      if (sessionError || !session) throw new Error("Session introuvable.");

      const { data: profile, error: profileError } = await supabase
        .from("utilisateurs")
        .select("entreprise_id")
        .eq("id", session.user.id)
        .single();

      if (profileError || !profile?.entreprise_id)
        throw new Error("Profil invalide.");

      const entId = profile.entreprise_id;
      setEntrepriseId(entId);

      // 1. Récupération des Factures
      const { data: facturesData, error: facturesError } = await supabase
        .from("factures")
        .select(
          `
          id, montant_ht, montant_ttc, taux_tva, statut, date_echeance, created_at,
          interventions ( titre, clients ( nom_complet ) )
        `,
        )
        .eq("entreprise_id", entId)
        .order("created_at", { ascending: false });

      if (facturesError) throw facturesError;
      setFactures((facturesData as unknown as FactureRow[]) || []);

      // 2. Récupération des Interventions disponibles
      // 💡 PRO FIX : On ne récupère que les interventions terminées (CLOTUREE)
      const { data: interData, error: interError } = await supabase
        .from("interventions")
        .select(`id, titre, clients ( nom_complet )`)
        .eq("entreprise_id", entId)
        .eq("statut", "CLOTUREE");

      if (interError) throw interError;
      setInterventions((interData as unknown as InterventionOption[]) || []);
    } catch (error) {
      const err = error as Error;
      console.error("Erreur de chargement Facturation :", err);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    const initData = async () => {
      await fetchData();
    };
    void initData();
  }, [fetchData]);

  // =========================================================================
  // CRÉATION D'UNE FACTURE
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

      const { error } = await supabase.from("factures").insert([payload]);
      if (error) throw error;

      setFormData({ intervention_id: "", montant_ht: "", date_echeance: "" });
      setIsModalOpen(false);
      await fetchData();
    } catch (error) {
      const err = error as Error;
      console.error("Erreur de création de facture :", err);
      alert(`Erreur: ${err.message}`);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <p className="text-gray-500 animate-pulse font-medium">
          Chargement de la comptabilité...
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Facturation DGI</h1>
          <p className="text-sm text-gray-500">
            Gérez vos factures et suivez vos encaissements.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          + Nouvelle Facture
        </button>
      </div>

      {/* TABLEAU DES FACTURES */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500 uppercase font-semibold">
            <tr>
              <th className="px-6 py-3">Client & Prestation</th>
              <th className="px-6 py-3">Date échéance</th>
              <th className="px-6 py-3">Montant TTC</th>
              <th className="px-6 py-3">Statut</th>
              <th className="px-6 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 text-gray-700">
            {factures.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-6 py-10 text-center text-gray-400"
                >
                  Aucune facture générée pour le moment.
                </td>
              </tr>
            ) : (
              factures.map((facture) => (
                <tr
                  key={facture.id}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="px-6 py-4">
                    <div className="font-semibold text-gray-900">
                      {facture.interventions?.clients?.nom_complet ||
                        "Client inconnu"}
                    </div>
                    <div className="text-xs text-gray-500">
                      {facture.interventions?.titre}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-600 font-medium">
                    {new Date(facture.date_echeance).toLocaleDateString(
                      "fr-FR",
                    )}
                  </td>
                  <td className="px-6 py-4 font-bold text-gray-900">
                    {formatMAD(facture.montant_ttc)}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        facture.statut === "PAYEE"
                          ? "bg-emerald-100 text-emerald-800"
                          : facture.statut === "EN_RETARD"
                            ? "bg-red-100 text-red-800"
                            : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {facture.statut.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      href={`/dashboard/factures/${facture.id}`}
                      className="text-emerald-600 hover:text-emerald-800 text-sm font-bold flex items-center justify-end gap-1"
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

      {/* MODAL CRÉATION DE FACTURE */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h2 className="text-lg font-bold text-gray-900">
                Émettre une Facture
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* 💡 PRO FIX : Message d'alerte si aucune intervention n'est clôturée */}
              {interventions.length === 0 && (
                <div className="text-xs text-amber-800 bg-amber-50 p-3 rounded-lg border border-amber-200 mb-4">
                  <strong>Attention :</strong> Aucune intervention ne est
                  actuellement clôturée. Vous devez dabord terminer une mission
                  avant de pouvoir la facturer.
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">
                  Intervention à facturer *
                </label>
                <select
                  required
                  disabled={interventions.length === 0}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:ring-2 focus:ring-emerald-500 disabled:bg-gray-100 disabled:text-gray-400"
                  value={formData.intervention_id}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      intervention_id: e.target.value,
                    })
                  }
                >
                  <option value="" disabled>
                    {interventions.length === 0
                      ? "Aucune mission disponible"
                      : "Sélectionnez une intervention terminée"}
                  </option>
                  {interventions.map((inter) => (
                    <option key={inter.id} value={inter.id}>
                      {inter.clients?.nom_complet} - {inter.titre}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-500 mb-1">
                    Montant HT (MAD) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    disabled={interventions.length === 0}
                    placeholder="Ex: 1500.00"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:ring-2 focus:ring-emerald-500 disabled:bg-gray-100"
                    value={formData.montant_ht}
                    onChange={(e) =>
                      setFormData({ ...formData, montant_ht: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-500 mb-1">
                    Date échéance *
                  </label>
                  <input
                    type="date"
                    required
                    disabled={interventions.length === 0}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:ring-2 focus:ring-emerald-500 disabled:bg-gray-100"
                    value={formData.date_echeance}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        date_echeance: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              {/* Aperçu du calcul TTC */}
              {formData.montant_ht && (
                <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 text-sm">
                  <div className="flex justify-between text-gray-500 mb-1">
                    <span>TVA (20%)</span>
                    <span>
                      {formatMAD(parseFloat(formData.montant_ht) * 0.2)}
                    </span>
                  </div>
                  <div className="flex justify-between font-bold text-gray-900">
                    <span>Total TTC à facturer</span>
                    <span>
                      {formatMAD(parseFloat(formData.montant_ht) * 1.2)}
                    </span>
                  </div>
                </div>
              )}

              <div className="pt-4 flex justify-end gap-3 border-t mt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border rounded-lg text-sm text-gray-700 bg-white hover:bg-gray-50"
                >
                  Annuler
                </button>
                {/* 💡 PRO FIX : Désactivation du bouton si aucune intervention ou si en cours de soumission */}
                <button
                  type="submit"
                  disabled={submitLoading || interventions.length === 0}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {submitLoading ? "Génération..." : "Créer la facture"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
