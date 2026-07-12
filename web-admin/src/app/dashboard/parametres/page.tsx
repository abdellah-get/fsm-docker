"use client";

import { useState, useEffect, useCallback } from "react";
import { getSession } from "next-auth/react"; // 👈 Remplacement de Supabase par NextAuth
import { getParametresSQL, updateParametresSQL } from "./actions"; // 👈 Nos actions SQL
import {
  Building2,
  FileText,
  Briefcase,
  Hash,
  Settings,
  Loader2,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import Button from "../../../components/ui/Button";
import Input from "../../../components/ui/Input";

// 📍 Import de ton composant Twilio
import TwilioSettings from "../../../components/dashboard/TwilioSettings";

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
  // ❌ Supabase supprimé d'ici !

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
  // PIPELINE DE CHARGEMENT SÉCURISÉ AVEC NEXTAUTH
  // =========================================================================
  const fetchEntrepriseData = useCallback(async () => {
    try {
      setLoading(true);

      // 1. Récupération de l'utilisateur via NextAuth (100% Local)
      const session = await getSession();

      if (!session || !session.user) {
        throw new Error("Aucune session active. Veuillez vous reconnecter.");
      }

      // 2. On utilise notre action SQL
      const result = await getParametresSQL(session.user.id);

      if (!result.success) {
        throw new Error(result.error);
      }

      setEntrepriseId(result.entrepriseId || null);

      if (result.data) {
        setFormData({
          nom: result.data.nom || "",
          ice: result.data.ice || "",
          rc: result.data.rc || "",
          if_fiscal: result.data.if_fiscal || "",
          patente: result.data.patente || "",
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
  }, []); // 👈 Dépendance à supabase retirée

  useEffect(() => {
    const initData = async () => {
      await fetchEntrepriseData();
    };

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

      // 📍 NOUVEAU : On utilise notre action SQL pour la mise à jour
      const result = await updateParametresSQL(entrepriseId, payload);

      if (!result.success) throw new Error(result.error);

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
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600 dark:text-emerald-400" />
        <p className="text-gray-500 dark:text-gray-400 font-medium">
          Chargement des paramètres...
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <Toaster position="top-right" />

      {/* --- EN-TÊTE --- */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <Settings className="text-emerald-600 dark:text-emerald-400" />
          Paramètres de l'Entreprise
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Gérez les informations légales et vos intégrations tierces.
        </p>
      </div>

      {/* --- FORMULAIRE D'IDENTITÉ LÉGALE --- */}
      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-dark-800 border border-gray-200 dark:border-dark-700 rounded-xl shadow-sm overflow-hidden"
      >
        <div className="p-6 border-b border-gray-200 dark:border-dark-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Identité Visuelle et Commerciale
          </h2>
          <div className="max-w-md">
            <Input
              label="Raison Sociale"
              icon={<Building2 size={16} />}
              placeholder="Ex: SaaS FSM Maroc"
              value={formData.nom}
              onChange={(e) =>
                setFormData({ ...formData, nom: e.target.value })
              }
              required
            />
          </div>
        </div>

        <div className="p-6 bg-gray-50 dark:bg-dark-900/30 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Identifiants Légaux (DGI Maroc)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="ICE"
              icon={<Hash size={16} />}
              placeholder="Ex: 001234567890123"
              value={formData.ice}
              onChange={(e) =>
                setFormData({ ...formData, ice: e.target.value })
              }
              maxLength={15}
              required
              className="font-mono"
            />

            <Input
              label="Identifiant Fiscal (IF)"
              icon={<FileText size={16} />}
              placeholder="Ex: 12345678"
              value={formData.if_fiscal}
              onChange={(e) =>
                setFormData({ ...formData, if_fiscal: e.target.value })
              }
              required
              className="font-mono"
            />

            <Input
              label="Registre du Commerce (RC)"
              icon={<Briefcase size={16} />}
              placeholder="Ex: 12345"
              value={formData.rc}
              onChange={(e) => setFormData({ ...formData, rc: e.target.value })}
              required
            />

            <Input
              label="Taxe Professionnelle (Patente)"
              icon={<FileText size={16} />}
              placeholder="Ex: 67890"
              value={formData.patente}
              onChange={(e) =>
                setFormData({ ...formData, patente: e.target.value })
              }
              required
            />
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-dark-800 border-t border-gray-200 dark:border-dark-700 flex justify-end">
          <Button
            type="submit"
            variant="primary"
            loading={submitLoading}
            disabled={submitLoading}
            className="px-6 py-2"
          >
            {submitLoading ? "Mise à jour..." : "Sauvegarder les identifiants"}
          </Button>
        </div>
      </form>

      {/* 📍 INTÉGRATION DU COMPOSANT TWILIO ICI */}
      {entrepriseId && (
        <div className="mt-8">
          <TwilioSettings entrepriseId={entrepriseId} />
        </div>
      )}
    </div>
  );
}
