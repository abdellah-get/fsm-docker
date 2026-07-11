"use client";

import { useState, useEffect, useCallback } from "react";
import { getSession } from "next-auth/react"; // 👈 Remplacement de Supabase par NextAuth
import { createTechnicianActionSQL, getEquipeDataSQL } from "./actions"; // 👈 Import de nos actions SQL locales
import { Plus, Wrench, Loader2, Mail, Lock, User, Phone } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import Button from "../../../components/ui/Button";
import Input from "../../../components/ui/Input";
import Modal from "../../../components/ui/Modal";

interface TechnicienRow {
  id: string;
  nom_complet: string;
  telephone: string;
  role: string;
}

export default function EquipePage() {
  // ❌ Supabase supprimé d'ici !

  const [techniciens, setTechniciens] = useState<TechnicienRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [entrepriseId, setEntrepriseId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    nom_complet: "",
    telephone: "",
    email: "",
    mot_de_passe: "",
  });

  const fetchEquipeData = useCallback(async () => {
    try {
      setLoading(true);

      // 1. Récupération de la session NextAuth
      const session = await getSession();
      if (!session || !session.user) throw new Error("Session introuvable.");

      // 2. Récupération des données d'équipe via SQL
      const result = await getEquipeDataSQL(session.user.id);
      if (!result.success) throw new Error(result.error);

      setEntrepriseId(result.entrepriseId || null);
      setTechniciens((result.techniciens as TechnicienRow[]) || []);
    } catch (error: any) {
      console.error("Erreur de chargement équipe :", error);
      toast.error(error.message || "Erreur lors du chargement de l'équipe.");
    } finally {
      setLoading(false);
    }
  }, []); // 👈 Dépendance à Supabase retirée

  useEffect(() => {
    void fetchEquipeData();
  }, [fetchEquipeData]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (!entrepriseId) {
      setFormError("Identifiant d'entreprise introuvable.");
      return;
    }

    try {
      setSubmitLoading(true);

      const payload = {
        entreprise_id: entrepriseId,
        nom_complet: formData.nom_complet.trim(),
        telephone: formData.telephone.trim(),
        email: formData.email.trim(),
        mot_de_passe: formData.mot_de_passe,
      };

      // 📍 Appel de l'action SQL locale
      const result = await createTechnicianActionSQL(payload);

      if (!result.success) {
        setFormError(result.error || "Une erreur est survenue.");
        return;
      }

      toast.success("Compte Technicien créé avec succès !");
      setIsModalOpen(false);
      setFormData({
        nom_complet: "",
        telephone: "",
        email: "",
        mot_de_passe: "",
      });

      // Recharger le tableau
      await fetchEquipeData();
    } catch (error: any) {
      console.error("Erreur de soumission :", error);
      setFormError(error.message || "Échec de l'enregistrement.");
    } finally {
      setSubmitLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Loader2
          className="animate-spin text-emerald-600 dark:text-emerald-400"
          size={32}
        />
        <p className="ml-2 text-gray-500 dark:text-gray-400 font-medium">
          Chargement des effectifs...
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
            Gestion de l'Équipe
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Créez et gérez les comptes d'accès de vos techniciens de terrain.
          </p>
        </div>

        <Button
          onClick={() => setIsModalOpen(true)}
          icon={<Plus size={16} />}
          variant="primary"
        >
          Ajouter un Technicien
        </Button>
      </div>

      {/* TABLEAU DES TECHNICIENS */}
      <div className="bg-white dark:bg-dark-800 border border-gray-200 dark:border-dark-700 rounded-xl overflow-hidden shadow-sm">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-dark-700 text-left text-sm">
          <thead className="bg-gray-50 dark:bg-dark-900/50 text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold">
            <tr>
              <th className="px-6 py-3">Nom du collaborateur</th>
              <th className="px-6 py-3">Téléphone</th>
              <th className="px-6 py-3">Rôle système</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-dark-700 text-gray-700 dark:text-gray-300">
            {techniciens.length === 0 ? (
              <tr>
                <td
                  colSpan={3}
                  className="px-6 py-10 text-center text-gray-400 dark:text-gray-500"
                >
                  Aucun technicien enregistré pour le moment.
                </td>
              </tr>
            ) : (
              techniciens.map((tech) => (
                <tr
                  key={tech.id}
                  className="hover:bg-gray-50 dark:hover:bg-dark-700/50 transition-colors"
                >
                  <td className="px-6 py-4 font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-700 dark:text-emerald-400 font-bold">
                      {tech.nom_complet.charAt(0).toUpperCase()}
                    </div>
                    {tech.nom_complet}
                  </td>
                  <td className="px-6 py-4 font-mono text-gray-600 dark:text-gray-400">
                    {tech.telephone}
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 flex items-center gap-1 w-fit">
                      <Wrench size={12} />
                      {tech.role}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL AJOUT TECHNICIEN */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Créer un compte Technicien"
        maxWidth="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <div className="text-xs text-red-800 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-200 dark:border-red-800">
              {formError}
            </div>
          )}

          <Input
            label="Nom complet du technicien"
            icon={<User size={16} />}
            placeholder="Ex: Ahmed Alami"
            value={formData.nom_complet}
            onChange={(e) =>
              setFormData({ ...formData, nom_complet: e.target.value })
            }
            required
          />

          <Input
            label="Numéro de téléphone"
            icon={<Phone size={16} />}
            placeholder="Ex: +212 600 000000"
            value={formData.telephone}
            onChange={(e) =>
              setFormData({ ...formData, telephone: e.target.value })
            }
            required
          />

          <hr className="my-4 border-gray-200 dark:border-dark-700" />

          <Input
            label="Email Professionnel (Identifiant)"
            icon={<Mail size={16} />}
            type="email"
            placeholder="tech@monentreprise.com"
            value={formData.email}
            onChange={(e) =>
              setFormData({ ...formData, email: e.target.value })
            }
            required
          />

          <Input
            label="Mot de passe provisoire"
            icon={<Lock size={16} />}
            type="text"
            placeholder="Min. 6 caractères"
            value={formData.mot_de_passe}
            onChange={(e) =>
              setFormData({ ...formData, mot_de_passe: e.target.value })
            }
            required
            helper="À communiquer au technicien pour sa première connexion."
          />

          <div className="pt-4 flex justify-end gap-3 border-t border-gray-200 dark:border-dark-700">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsModalOpen(false)}
            >
              Annuler
            </Button>
            <Button type="submit" variant="primary" loading={submitLoading}>
              {submitLoading ? "Création..." : "Créer le compte"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
