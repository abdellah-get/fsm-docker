"use client";

import { useState, useEffect, useCallback } from "react";
import { getSession } from "next-auth/react"; // 👈 Remplacement de Supabase par NextAuth
import {
  getInterventionsDataSQL,
  createInterventionSQL,
  updateInterventionSQL,
} from "./actions";
import Link from "next/link";
import {
  CalendarClock,
  Plus,
  Wrench,
  User,
  FileText,
  Loader2,
  Edit3,
  Clock,
  CheckCircle2,
  AlertCircle,
  Printer,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import Button from "../../../components/ui/Button";
import Input from "../../../components/ui/Input";
import Modal from "../../../components/ui/Modal";
import Select from "../../../components/ui/Select";
import Textarea from "../../../components/ui/Textarea";

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
  // ❌ L'appel à createClient() de Supabase a été supprimé ici !

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
  // PIPELINE DE CHARGEMENT DES DONNÉES VIA SQL
  // =========================================================================
  const fetchInitialData = useCallback(
    async (showSpinner = true) => {
      try {
        if (showSpinner) setLoading(true);

        // 1. On vérifie la session via NextAuth (100% local et sécurisé)
        const session = await getSession();

        if (!session || !session.user)
          throw new Error("Utilisateur non authentifié.");

        // 2. On récupère tout via notre Action Serveur SQL en passant l'ID NextAuth
        const result = await getInterventionsDataSQL(session.user.id);

        if (!result.success) throw new Error(result.error);

        setEntrepriseId(result.entrepriseId || null);
        setInterventions(
          (result.interventions as unknown as InterventionWithRelations[]) ||
            [],
        );
        setClients(result.clients as ClientRow[]);
        setTechniciens(result.techniciens as TechnicienRow[]);
      } catch (error: unknown) {
        const err = error as Error;
        console.error("Pipeline Error [fetchInitialData]:", err);
        toast.error(`Erreur de chargement : ${err.message}`);
      } finally {
        if (showSpinner) setLoading(false);
      }
    },
    [], // 👈 Supabase retiré des dépendances
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
  // LOGIQUE D'ENREGISTREMENT VIA SQL
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
        const result = await updateInterventionSQL(editingId, payload);
        if (!result.success) throw new Error(result.error);
        toast.success("Intervention mise à jour.");
      } else {
        const result = await createInterventionSQL(payload);
        if (!result.success) throw new Error(result.error);
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

  const renderStatusBadge = (statut: string) => {
    switch (statut) {
      case "CLOTUREE":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 text-xs font-semibold tracking-wide">
            <CheckCircle2 className="w-3.5 h-3.5" /> Clôturée
          </span>
        );
      case "EN_COURS":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800 text-xs font-semibold tracking-wide">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> En cours
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800 text-xs font-semibold tracking-wide">
            <Clock className="w-3.5 h-3.5" /> À faire
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600 dark:text-emerald-400" />
        <p className="text-gray-500 dark:text-gray-400 font-medium">
          Chargement du planning...
        </p>
      </div>
    );
  }

  const clientOptions = clients.map((c) => ({
    value: c.id,
    label: c.nom_complet,
  }));

  const technicienOptions = techniciens.map((t) => ({
    value: t.id,
    label: `${t.nom_complet} (${t.role})`,
  }));

  const statutOptions = [
    { value: "A_FAIRE", label: "À FAIRE" },
    { value: "EN_COURS", label: "EN COURS" },
    { value: "CLOTUREE", label: "CLÔTURÉE" },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <Toaster position="top-right" />

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Wrench className="text-emerald-600 dark:text-emerald-400" />
            Planification des Interventions
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Supervisez l'attribution des tâches et le planning technique en
            temps réel.
          </p>
        </div>

        <Button
          onClick={openCreateModal}
          icon={<Plus className="w-4 h-4" />}
          variant="primary"
        >
          Nouvelle Intervention
        </Button>
      </div>

      <div className="bg-white dark:bg-dark-800 border border-gray-200 dark:border-dark-700 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-dark-700 text-left text-sm">
            <thead className="bg-gray-50 dark:bg-dark-900/50 text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold">
              <tr>
                <th className="px-6 py-4">Titre / Description</th>
                <th className="px-6 py-4">Client</th>
                <th className="px-6 py-4">Technicien Assigné</th>
                <th className="px-6 py-4">Date Prévue</th>
                <th className="px-6 py-4">Statut</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-dark-700 text-gray-700 dark:text-gray-300">
              {interventions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="bg-gray-50 dark:bg-dark-700/50 p-4 rounded-full">
                        <CalendarClock className="h-8 w-8 text-gray-400 dark:text-gray-500" />
                      </div>
                      <p className="text-gray-500 dark:text-gray-400 font-medium">
                        Aucune intervention planifiée.
                      </p>
                      <Button
                        onClick={openCreateModal}
                        variant="primary"
                        className="text-sm"
                      >
                        Planifier la première mission
                      </Button>
                    </div>
                  </td>
                </tr>
              ) : (
                interventions.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-gray-50 dark:hover:bg-dark-700/50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="font-semibold text-gray-900 dark:text-gray-100">
                        {item.titre}
                      </div>
                      <div
                        className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-xs truncate"
                        title={item.description}
                      >
                        {item.description || (
                          <span className="italic">Aucune description</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-gray-100">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                        {item.clients?.nom_complet || "Client inconnu"}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {item.utilisateurs?.nom_complet ? (
                        <span className="text-gray-700 dark:text-gray-300 font-medium">
                          {item.utilisateurs.nom_complet}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 px-2 py-0.5 rounded text-xs font-semibold border border-amber-200 dark:border-amber-800">
                          <AlertCircle className="w-3 h-3" /> Non assigné
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-400 font-mono text-xs">
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
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/dashboard/interventions/${item.id}/bon-intervention`}
                          className="inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 font-medium text-sm transition-colors bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-100 dark:border-emerald-800 hover:border-emerald-200 dark:hover:border-emerald-700 px-3 py-1.5 rounded-lg shadow-sm"
                        >
                          <Printer className="w-4 h-4" />
                          Bon
                        </Link>
                        <button
                          onClick={() => openEditModal(item)}
                          className="inline-flex items-center gap-1.5 text-gray-500 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 font-medium text-sm transition-colors bg-white dark:bg-dark-800 border border-gray-200 dark:border-dark-700 hover:border-emerald-200 dark:hover:border-emerald-800 px-3 py-1.5 rounded-lg shadow-sm"
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

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? "Modifier l'intervention" : "Créer une Intervention"}
        maxWidth="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            label="Intitulé de la mission"
            icon={<Wrench size={16} />}
            placeholder="Ex: Réparation du Split Climatiseur"
            value={formData.titre}
            onChange={(e) =>
              setFormData({ ...formData, titre: e.target.value })
            }
            required
          />

          <Textarea
            label="Consignes / Spécifications"
            icon={<FileText size={16} />}
            placeholder="Détaillez les pannes constatées..."
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
            rows={3}
          />

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Client"
              options={clientOptions}
              placeholder="-- Sélectionner --"
              value={formData.client_id}
              onChange={(e) =>
                setFormData({ ...formData, client_id: e.target.value })
              }
              required
            />
            <Select
              label="Technicien"
              options={technicienOptions}
              placeholder="-- Non assigné --"
              value={formData.technicien_id}
              onChange={(e) =>
                setFormData({ ...formData, technicien_id: e.target.value })
              }
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Date & Heure"
              type="datetime-local"
              value={formData.date_prevue}
              onChange={(e) =>
                setFormData({ ...formData, date_prevue: e.target.value })
              }
              required
            />
            <Select
              label="Statut"
              options={statutOptions}
              value={formData.statut}
              onChange={(e) =>
                setFormData({ ...formData, statut: e.target.value })
              }
            />
          </div>

          <div className="pt-5 border-t border-gray-200 dark:border-dark-700 flex justify-end gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsModalOpen(false)}
            >
              Annuler
            </Button>
            <Button type="submit" variant="primary" loading={submitLoading}>
              {submitLoading
                ? "Validation..."
                : editingId
                  ? "Mettre à jour"
                  : "Valider le Planning"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
