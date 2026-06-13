"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "../../../utils/supabase/client";
import {
  Building2,
  FileText,
  Briefcase,
  Hash,
  Settings,
  Loader2,
  Save,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";

// =========================================================================
// TYPES
// =========================================================================
interface EntrepriseData {
  id: string;
  nom: string;
  ice: string;
  rc: string;
  if_fiscal: string;
  patente: string;
}

export default function ParametresPage() {
  const supabase = createClient();

  // --- ÉTATS SÉCURISÉS ---
  const [loading, setLoading] = useState<boolean>(true);
  const [submitLoading, setSubmitLoading] = useState<boolean>(false);
  const [entrepriseId, setEntrepriseId] = useState<string | null>(null);

  // --- ÉTAT DU FORMULAIRE TYPÉ ---
  const [formData, setFormData] = useState<Omit<EntrepriseData, "id">>({
    nom: "",
    ice: "",
    rc: "",
    if_fiscal: "",
    patente: "",
  });

  // =========================================================================
  // PIPELINE DE CHARGEMENT SÉCURISÉ AVEC DIAGNOSTIC AVANCÉ
  // =========================================================================
  const fetchEntrepriseData = useCallback(async () => {
    try {
      setLoading(true);

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (!session)
        throw new Error("Aucune session active. Veuillez vous reconnecter.");

      const { data: profile, error: profileError } = await supabase
        .from("utilisateurs")
        .select("entreprise_id")
        .eq("id", session.user.id)
        .single();

      if (profileError) {
        throw new Error(
          `Erreur table 'utilisateurs' : ${profileError.message}`,
        );
      }

      if (!profile?.entreprise_id) {
        throw new Error("Votre compte n'est lié à aucune entreprise.");
      }

      setEntrepriseId(profile.entreprise_id);

      const { data: entreprise, error: entError } = await supabase
        .from("entreprises")
        .select("*")
        .eq("id", profile.entreprise_id)
        .maybeSingle();

      if (entError) {
        const errorMessage = entError.message || JSON.stringify(entError);
        throw new Error(`Erreur table 'entreprises' : ${errorMessage}`);
      }

      if (entreprise) {
        setFormData({
          nom: entreprise.nom || "",
          ice: entreprise.ice || "",
          rc: entreprise.rc || "",
          if_fiscal: entreprise.if_fiscal || "",
          patente: entreprise.patente || "",
        });
      }
    } catch (error) {
      const err = error as Error & { hint?: string };
      console.error("🚨 [PARAMÈTRES] Erreur détectée :", err);
      const hint = err.hint ? ` (Indice : ${err.hint})` : "";
      toast.error(`${err.message || "Erreur de chargement"}${hint}`);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    // 1. On déclare une fonction asynchrone interne
    const initData = async () => {
      await fetchEntrepriseData();
      // (Remplace par fetchClientsData ou fetchEquipeData selon le fichier)
    };

    // 2. On l'appelle
    initData();
  }, [fetchEntrepriseData]);

  // =========================================================================
  // SAUVEGARDE EN BASE DE DONNÉES
  // =========================================================================
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!entrepriseId) return;

    try {
      setSubmitLoading(true);

      const payload = {
        nom: formData.nom.trim(),
        ice: formData.ice.trim(),
        rc: formData.rc.trim(),
        if_fiscal: formData.if_fiscal.trim(),
        patente: formData.patente.trim(),
      };

      const { error } = await supabase
        .from("entreprises")
        .update(payload)
        .eq("id", entrepriseId);

      if (error) throw error;

      toast.success("Paramètres mis à jour avec succès !");
    } catch (error) {
      const err = error as Error;
      console.error("Erreur de sauvegarde:", err);
      toast.error(`Erreur : ${err.message || "Impossible de sauvegarder"}`);
    } finally {
      setSubmitLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
        <p className="text-gray-500 font-medium">
          Chargement des paramètres...
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <Toaster position="top-right" />

      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Settings className="text-emerald-600" />
          Paramètres de Entreprise
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Ces informations sont obligatoires pour la conformité légale de vos
          Factures DGI.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden"
      >
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Identité Visuelle et Commerciale
          </h2>
          <div className="max-w-md">
            <label className="block text-xs font-bold uppercase text-gray-500 mb-1.5">
              Raison Sociale *
            </label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                required
                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                value={formData.nom}
                onChange={(e) =>
                  setFormData({ ...formData, nom: e.target.value })
                }
              />
            </div>
          </div>
        </div>

        <div className="p-6 bg-gray-50 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Identifiants Légaux (DGI Maroc)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold uppercase text-gray-500 mb-1.5">
                ICE *
              </label>
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  required
                  maxLength={15}
                  className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm font-mono text-gray-900 bg-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                  value={formData.ice}
                  onChange={(e) =>
                    setFormData({ ...formData, ice: e.target.value })
                  }
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-gray-500 mb-1.5">
                Identifiant Fiscal (IF) *
              </label>
              <div className="relative">
                <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  required
                  className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm font-mono text-gray-900 bg-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                  value={formData.if_fiscal}
                  onChange={(e) =>
                    setFormData({ ...formData, if_fiscal: e.target.value })
                  }
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-gray-500 mb-1.5">
                Registre du Commerce (RC) *
              </label>
              <div className="relative">
                <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  required
                  className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                  value={formData.rc}
                  onChange={(e) =>
                    setFormData({ ...formData, rc: e.target.value })
                  }
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-gray-500 mb-1.5">
                Taxe Professionnelle (Patente) *
              </label>
              <div className="relative">
                <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  required
                  className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                  value={formData.patente}
                  onChange={(e) =>
                    setFormData({ ...formData, patente: e.target.value })
                  }
                />
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 bg-white border-t border-gray-200 flex justify-end">
          <button
            type="submit"
            disabled={submitLoading}
            className="flex items-center gap-2 px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm disabled:opacity-50"
          >
            {submitLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save size={18} />
            )}
            {submitLoading ? "Mise à jour..." : "Sauvegarder les paramètres"}
          </button>
        </div>
      </form>
    </div>
  );
}
