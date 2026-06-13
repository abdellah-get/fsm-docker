"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "../../../utils/supabase/client";
// 💡 1. IMPORT DE LINK DEPUIS NEXT.JS
import Link from "next/link";
import {
  CalendarClock,
  Plus,
  Wrench,
  User,
  FileText,
  X,
  Loader2,
  Edit3,
  Clock,
  CheckCircle2,
  AlertCircle,
  // 💡 2. IMPORT DE L'ICÔNE PRINTER
  Printer,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";

// =========================================================================
// TYPES & INTERFACES STRICTS
// =========================================================================
interface ClientRow {
  id: string;
  nom_complet: string;
}

interface TechnicienRow {
  id: string;
  nom_complet: string;
  role: string;
}

interface InterventionWithRelations {
  id: string;
  titre: string;
  description: string;
  statut: "A_FAIRE" | "EN_COURS" | "CLOTUREE";
  date_prevue: string;
  clients: ClientRow | null;
  utilisateurs: TechnicienRow | null;
}

export default function InterventionsPage() {
  const supabase = createClient();

  // --- ÉTATS DES DONNÉES ---
  const [interventions, setInterventions] = useState<
    InterventionWithRelations[]
  >([]);
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [techniciens, setTechniciens] = useState<TechnicienRow[]>([]);

  // --- ÉTATS INTERFACE (UI) ---
  const [loading, setLoading] = useState<boolean>(true);
  const [submitLoading, setSubmitLoading] = useState<boolean>(false);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [entrepriseId, setEntrepriseId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  // --- ÉTAT DU FORMULAIRE ---
  const [formData, setFormData] = useState({
    titre: "",
    description: "",
    client_id: "",
    technicien_id: "",
    date_prevue: "",
    statut: "A_FAIRE",
  });

  // =========================================================================
  // PIPELINE DE CHARGEMENT DES DONNÉES
  // =========================================================================
  const fetchInitialData = useCallback(
    async (showSpinner = true) => {
      try {
        if (showSpinner) setLoading(true);

        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();
        if (sessionError || !session)
          throw new Error("Utilisateur non authentifié.");

        const { data: profile, error: profileError } = await supabase
          .from("utilisateurs")
          .select("entreprise_id")
          .eq("id", session.user.id)
          .single();

        if (profileError || !profile?.entreprise_id) {
          throw new Error("Profil d'entreprise introuvable.");
        }

        const entId = profile.entreprise_id;
        setEntrepriseId(entId);

        const [interventionsRes, clientsRes, techniciensRes] =
          await Promise.all([
            supabase
              .from("interventions")
              .select(
                `
              id, titre, description, statut, date_prevue,
              clients ( id, nom_complet ),
              utilisateurs ( id, nom_complet, role )
            `,
              )
              .eq("entreprise_id", entId)
              .order("date_prevue", { ascending: false }),
            supabase
              .from("clients")
              .select("id, nom_complet")
              .eq("entreprise_id", entId)
              .order("nom_complet"),
            supabase
              .from("utilisateurs")
              .select("id, nom_complet, role")
              .eq("entreprise_id", entId)
              .order("nom_complet"),
          ]);

        if (interventionsRes.error) throw interventionsRes.error;
        if (clientsRes.error) throw clientsRes.error;
        if (techniciensRes.error) throw techniciensRes.error;

        setInterventions(
          interventionsRes.data as unknown as InterventionWithRelations[],
        );
        setClients(clientsRes.data);
        setTechniciens(techniciensRes.data);
      } catch (error: unknown) {
        const err = error as Error;
        console.error("Pipeline Error [fetchInitialData]:", err);
        toast.error(`Erreur de chargement : ${err.message}`);
      } finally {
        if (showSpinner) setLoading(false);
      }
    },
    [supabase],
  );

  useEffect(() => {
    const initDashboard = async () => {
      await fetchInitialData();
    };
    initDashboard();
  }, [fetchInitialData]);

  // =========================================================================
  // GESTION DU MODAL
  // =========================================================================
  const openCreateModal = () => {
    setEditingId(null);
    setFormData({
      titre: "",
      description: "",
      client_id: "",
      technicien_id: "",
      date_prevue: "",
      statut: "A_FAIRE",
    });
    setIsModalOpen(true);
  };

  const openEditModal = (intervention: InterventionWithRelations) => {
    setEditingId(intervention.id);

    // Garder l'heure locale pour l'input datetime-local
    const d = new Date(intervention.date_prevue);
    const localIso = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);

    setFormData({
      titre: intervention.titre,
      description: intervention.description || "",
      client_id: intervention.clients?.id || "",
      technicien_id: intervention.utilisateurs?.id || "",
      date_prevue: localIso,
      statut: intervention.statut,
    });
    setIsModalOpen(true);
  };

  // =========================================================================
  // LOGIQUE D'ENREGISTREMENT
  // =========================================================================
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!entrepriseId) return;

    try {
      setSubmitLoading(true);

      const payload = {
        entreprise_id: entrepriseId,
        client_id: formData.client_id,
        technicien_id: formData.technicien_id || null,
        titre: formData.titre.trim(),
        description: formData.description.trim(),
        statut: formData.statut,
        date_prevue: new Date(formData.date_prevue).toISOString(),
      };

      if (editingId) {
        const { error } = await supabase
          .from("interventions")
          .update(payload)
          .eq("id", editingId);
        if (error) throw error;
        toast.success("Intervention mise à jour.");
      } else {
        const { error } = await supabase
          .from("interventions")
          .insert([payload]);
        if (error) throw error;
        toast.success("Intervention planifiée avec succès !");
      }

      setIsModalOpen(false);
      await fetchInitialData(false);
    } catch (error: unknown) {
      const err = error as Error;
      console.error("Mutation Error:", err);
      toast.error(`Erreur lors de la sauvegarde : ${err.message}`);
    } finally {
      setSubmitLoading(false);
    }
  }

  // =========================================================================
  // RENDU UI
  // =========================================================================
  const renderStatusBadge = (statut: string) => {
    switch (statut) {
      case "CLOTUREE":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200 text-xs font-semibold tracking-wide">
            <CheckCircle2 className="w-3.5 h-3.5" /> Clôturée
          </span>
        );
      case "EN_COURS":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border bg-blue-50 text-blue-700 border-blue-200 text-xs font-semibold tracking-wide">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> En cours
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border bg-amber-50 text-amber-700 border-amber-200 text-xs font-semibold tracking-wide">
            <Clock className="w-3.5 h-3.5" /> À faire
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
        <p className="text-gray-500 font-medium">Chargement du planning...</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <Toaster position="top-right" />

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Wrench className="text-emerald-600" />
            Planification des Interventions
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Supervisez attribution des tâches et le planning technique en temps
            réel.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Nouvelle Intervention
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase font-semibold">
              <tr>
                <th className="px-6 py-4">Titre / Description</th>
                <th className="px-6 py-4">Client</th>
                <th className="px-6 py-4">Technicien Assigné</th>
                <th className="px-6 py-4">Date Prévue</th>
                <th className="px-6 py-4">Statut</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 text-gray-700">
              {interventions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="bg-gray-50 p-4 rounded-full">
                        <CalendarClock className="h-8 w-8 text-gray-400" />
                      </div>
                      <p className="text-gray-500 font-medium">
                        Aucune intervention planifiée.
                      </p>
                      <button
                        onClick={openCreateModal}
                        className="text-emerald-600 font-medium hover:underline text-sm"
                      >
                        Planifier la première mission
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                interventions.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-gray-50/50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="font-semibold text-gray-900">
                        {item.titre}
                      </div>
                      <div
                        className="text-xs text-gray-500 mt-1 max-w-xs truncate"
                        title={item.description}
                      >
                        {item.description || (
                          <span className="italic">Aucune description</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-900">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-400" />
                        {item.clients?.nom_complet || "Client inconnu"}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {item.utilisateurs?.nom_complet ? (
                        <span className="text-gray-700 font-medium">
                          {item.utilisateurs.nom_complet}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 px-2 py-0.5 rounded text-xs font-semibold border border-amber-200">
                          <AlertCircle className="w-3 h-3" /> Non assigné
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-gray-600 font-mono text-xs">
                      {new Date(item.date_prevue).toLocaleString("fr-FR", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-6 py-4">
                      {renderStatusBadge(item.statut)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {/* 💡 3. AJOUT DU BOUTON BON D'INTERVENTION */}
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/dashboard/interventions/${item.id}/bon-intervention`}
                          className="inline-flex items-center gap-1.5 text-emerald-700 hover:text-emerald-800 font-medium text-sm transition-colors bg-emerald-50 border border-emerald-100 hover:border-emerald-200 px-3 py-1.5 rounded-lg shadow-sm"
                          title="Afficher le bon d'intervention"
                        >
                          <Printer className="w-4 h-4" />
                          Bon
                        </Link>

                        <button
                          onClick={() => openEditModal(item)}
                          className="inline-flex items-center gap-1.5 text-gray-500 hover:text-emerald-600 font-medium text-sm transition-colors bg-white border border-gray-200 hover:border-emerald-200 px-3 py-1.5 rounded-lg shadow-sm"
                        >
                          <Edit3 className="w-4 h-4" />
                          Éditer
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL CRÉATION / ÉDITION */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-900/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                {editingId ? (
                  <Edit3 className="w-5 h-5 text-emerald-600" />
                ) : (
                  <Plus className="w-5 h-5 text-emerald-600" />
                )}
                {editingId
                  ? "Modifier l'intervention"
                  : "Créer une Intervention"}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-1.5 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1.5">
                  Intitulé de la mission *
                </label>
                <div className="relative">
                  <Wrench className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    required
                    placeholder="Ex: Réparation du Split Climatiseur"
                    className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                    value={formData.titre}
                    onChange={(e) =>
                      setFormData({ ...formData, titre: e.target.value })
                    }
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1.5">
                  Consignes / Spécifications
                </label>
                <div className="relative">
                  <FileText className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <textarea
                    rows={3}
                    placeholder="Détaillez les pannes constatées..."
                    className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all resize-none"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-500 mb-1.5">
                    Client *
                  </label>
                  <select
                    required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                    value={formData.client_id}
                    onChange={(e) =>
                      setFormData({ ...formData, client_id: e.target.value })
                    }
                  >
                    <option value="">-- Sélectionner --</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nom_complet}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-500 mb-1.5">
                    Technicien
                  </label>
                  <select
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                    value={formData.technicien_id}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        technicien_id: e.target.value,
                      })
                    }
                  >
                    <option value="">-- Non assigné --</option>
                    {techniciens.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.nom_complet} ({t.role})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-500 mb-1.5">
                    Date & Heure *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                    value={formData.date_prevue}
                    onChange={(e) =>
                      setFormData({ ...formData, date_prevue: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-500 mb-1.5">
                    Statut
                  </label>
                  <select
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none bg-white font-medium"
                    value={formData.statut}
                    onChange={(e) =>
                      setFormData({ ...formData, statut: e.target.value })
                    }
                  >
                    <option value="A_FAIRE">À FAIRE</option>
                    <option value="EN_COURS">EN COURS</option>
                    <option value="CLOTUREE">CLÔTURÉE</option>
                  </select>
                </div>
              </div>

              <div className="pt-5 border-t border-gray-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 bg-white rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submitLoading}
                  className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm disabled:opacity-70"
                >
                  {submitLoading && (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  )}
                  {submitLoading
                    ? "Validation..."
                    : editingId
                      ? "Mettre à jour"
                      : "Valider le Planning"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
