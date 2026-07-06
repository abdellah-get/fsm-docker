"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "../../../utils/supabase/client";
import { createTechnicianAction } from "../../actions/equipe";
import {
  Plus,
  Wrench,
  X,
  Loader2,
  Mail,
  Lock,
  User,
  Phone,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import Button from "../../../components/ui/Button";
import Input from "../../../components/ui/Input";
import Textarea from "../../../components/ui/Textarea";
import Modal from "../../../components/ui/Modal";

interface TechnicienRow {
  id: string;
  nom_complet: string;
  telephone: string;
  role: string;
}

export default function EquipePage() {
  const supabase = createClient();

  const [techniciens, setTechniciens] = useState<TechnicienRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [entrepriseId, setEntrepriseId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    nom_complet: "",
    email: "",
    mot_de_passe: "",
    telephone: "",
  });

  const fetchEquipeData = useCallback(async () => {
    try {
      setLoading(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      const { data: profile } = await supabase
        .from("utilisateurs")
        .select("entreprise_id")
        .eq("id", session.user.id)
        .single();

      if (!profile) return;
      setEntrepriseId(profile.entreprise_id);

      const { data, error } = await supabase
        .from("utilisateurs")
        .select("id, nom_complet, telephone, role")
        .eq("entreprise_id", profile.entreprise_id)
        .eq("role", "TECHNICIEN")
        .order("nom_complet", { ascending: true });

      if (error) throw error;
      setTechniciens(data || []);
    } catch (error) {
      console.error("Erreur récupération équipe:", error);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    const loadEquipe = async () => {
      await fetchEquipeData();
    };

    loadEquipe();
  }, [fetchEquipeData]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (!entrepriseId) {
      setFormError("Identifiant d'entreprise introuvable.");
      return;
    }

    if (formData.mot_de_passe.length < 6) {
      setFormError("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }

    try {
      setSubmitLoading(true);

      const result = await createTechnicianAction({
        email: formData.email.trim(),
        mot_de_passe: formData.mot_de_passe,
        nom_complet: formData.nom_complet.trim(),
        telephone: formData.telephone.trim(),
        entreprise_id: entrepriseId,
      });

      if (!result.success) {
        throw new Error(result.error);
      }

      setFormData({
        nom_complet: "",
        email: "",
        mot_de_passe: "",
        telephone: "",
      });
      setIsModalOpen(false);
      await fetchEquipeData();
    } catch (error: unknown) {
      if (error instanceof Error) {
        setFormError(error.message);
      } else {
        setFormError("Erreur lors de la création du compte.");
      }
    } finally {
      setSubmitLoading(false);
    }
  }

  if (loading && techniciens.length === 0) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600 dark:text-emerald-400" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Wrench className="text-emerald-600 dark:text-emerald-400" />
            Gestion Équipe
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Créez les comptes professionnels de vos techniciens intervention.
          </p>
        </div>

        <Button
          onClick={() => {
            setFormError(null);
            setIsModalOpen(true);
          }}
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
              <th className="px-6 py-4">Nom du technicien</th>
              <th className="px-6 py-4">Téléphone</th>
              <th className="px-6 py-4">Rôle</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-dark-700 text-gray-700 dark:text-gray-300">
            {techniciens.length === 0 ? (
              <tr>
                <td
                  colSpan={3}
                  className="px-6 py-12 text-center text-gray-500 dark:text-gray-400"
                >
                  Aucun technicien enregistré dans votre équipe.
                </td>
              </tr>
            ) : (
              techniciens.map((tech) => (
                <tr
                  key={tech.id}
                  className="hover:bg-gray-50 dark:hover:bg-dark-700/50"
                >
                  <td className="px-6 py-4 font-semibold text-gray-900 dark:text-gray-100">
                    {tech.nom_complet}
                  </td>
                  <td className="px-6 py-4 text-gray-600 dark:text-gray-400">
                    {tech.telephone}
                  </td>
                  <td className="px-6 py-4">
                    <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 text-xs font-medium px-2.5 py-0.5 rounded border border-blue-200 dark:border-blue-800">
                      {tech.role}
                    </span>
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
        title="Créer un Accès Technicien"
        maxWidth="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              {formError}
            </div>
          )}

          <Input
            label="Nom Complet"
            icon={<User size={16} />}
            placeholder="Ex: Jean Dupont"
            value={formData.nom_complet}
            onChange={(e) =>
              setFormData({ ...formData, nom_complet: e.target.value })
            }
            required
          />

          <Input
            label="Téléphone"
            icon={<Phone size={16} />}
            type="tel"
            placeholder="Ex: 06 XX XX XX XX"
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

          <div className="pt-4 flex justify-end gap-3">
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
