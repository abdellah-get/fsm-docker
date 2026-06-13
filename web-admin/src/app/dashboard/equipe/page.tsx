"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "../../../utils/supabase/client";
import { createTechnicianAction } from "../../actions/equipe"; // 💡 Import de notre Server Action
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

      // 1. Récupérer l'entreprise du Gérant
      const { data: profile } = await supabase
        .from("utilisateurs")
        .select("entreprise_id")
        .eq("id", session.user.id)
        .single();

      if (!profile) return;
      setEntrepriseId(profile.entreprise_id);

      // 2. Récupérer uniquement les techniciens de cette entreprise
      const { data, error } = await supabase
        .from("utilisateurs")
        .select("id, nom_complet, telephone, role")
        .eq("entreprise_id", profile.entreprise_id)
        .eq("role", "TECHNICIEN") // On filtre pour ne pas afficher les gérants
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
    // On crée une fonction asynchrone à l'intérieur du useEffect
    const loadEquipe = async () => {
      await fetchEquipeData();
    };

    // On l'appelle immédiatement
    loadEquipe();
  }, [fetchEquipeData]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (!entrepriseId) {
      setFormError("Identifiant d'entreprise introuvable.");
      return;
    }

    // Validation basique
    if (formData.mot_de_passe.length < 6) {
      setFormError("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }

    try {
      setSubmitLoading(true);

      // 🚀 Appel de la Server Action (exécution sécurisée côté serveur)
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

      // Succès !
      setFormData({
        nom_complet: "",
        email: "",
        mot_de_passe: "",
        telephone: "",
      });
      setIsModalOpen(false);
      await fetchEquipeData();
    } catch (error: unknown) {
      // On vérifie proprement le type de l'erreur
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
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Wrench className="text-emerald-600" />
            Gestion Équipe
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Créez les comptes professionnels de vos techniciens intervention.
          </p>
        </div>
        <button
          onClick={() => {
            setFormError(null);
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={16} />
          Ajouter un Technicien
        </button>
      </div>

      {/* TABLEAU DES TECHNICIENS */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500 uppercase font-semibold">
            <tr>
              <th className="px-6 py-4">Nom du technicien</th>
              <th className="px-6 py-4">Téléphone</th>
              <th className="px-6 py-4">Rôle</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 text-gray-700">
            {techniciens.length === 0 ? (
              <tr>
                <td
                  colSpan={3}
                  className="px-6 py-12 text-center text-gray-500"
                >
                  Aucun technicien enregistré dans votre équipe.
                </td>
              </tr>
            ) : (
              techniciens.map((tech) => (
                <tr key={tech.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-semibold text-gray-900">
                    {tech.nom_complet}
                  </td>
                  <td className="px-6 py-4 text-gray-600">{tech.telephone}</td>
                  <td className="px-6 py-4">
                    <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded border border-blue-200">
                      {tech.role}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* MODALE D'AJOUT */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-900/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h2 className="text-lg font-bold text-gray-900">
                Créer un Accès Technicien
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-700"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase text-gray-600 mb-1.5">
                  Nom Complet *
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    required
                    className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
                    value={formData.nom_complet}
                    onChange={(e) =>
                      setFormData({ ...formData, nom_complet: e.target.value })
                    }
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-gray-600 mb-1.5">
                  Téléphone *
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    required
                    className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
                    value={formData.telephone}
                    onChange={(e) =>
                      setFormData({ ...formData, telephone: e.target.value })
                    }
                  />
                </div>
              </div>

              <hr className="my-4 border-gray-100" />

              <div>
                <label className="block text-xs font-bold uppercase text-gray-600 mb-1.5">
                  Email Professionnel (Identifiant) *
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="email"
                    required
                    placeholder="tech@monentreprise.com"
                    className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-gray-600 mb-1.5">
                  Mot de passe provisoire *
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    required
                    placeholder="Min. 6 caractères"
                    className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
                    value={formData.mot_de_passe}
                    onChange={(e) =>
                      setFormData({ ...formData, mot_de_passe: e.target.value })
                    }
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  À communiquer au technicien pour sa première connexion.
                </p>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 bg-white rounded-lg text-sm font-medium hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submitLoading}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium shadow-sm disabled:opacity-50 flex items-center gap-2"
                >
                  {submitLoading && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  {submitLoading ? "Création..." : "Créer le compte"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
