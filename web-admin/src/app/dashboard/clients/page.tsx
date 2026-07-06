"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "../../../utils/supabase/client";
import {
  Search,
  Plus,
  Building2,
  Phone,
  MapPin,
  UsersRound,
  Loader2,
  Edit,
  Trash2,
  Mail,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import Button from "../../../components/ui/Button";
import Input from "../../../components/ui/Input";
import Textarea from "../../../components/ui/Textarea";
import Modal from "../../../components/ui/Modal";

interface ClientRow {
  id: string;
  nom_complet: string;
  email: string | null;
  telephone: string;
  adresse_geographique: string;
  created_at: string;
}

export default function ClientsPage() {
  const supabase = createClient();

  const [clients, setClients] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitLoading, setSubmitLoading] = useState<boolean>(false);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [entrepriseId, setEntrepriseId] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState<string>("");
  const [formError, setFormError] = useState<string | null>(null);

  const [editingClientId, setEditingClientId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    nom_complet: "",
    email: "",
    telephone: "",
    adresse_geographique: "",
  });

  const fetchClientsData = useCallback(async () => {
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

      if (profileError || !profile)
        throw new Error("Liaison entreprise manquante.");

      const entId = profile.entreprise_id;
      setEntrepriseId(entId);

      const { data, error: clientsError } = await supabase
        .from("clients")
        .select(
          "id, nom_complet, email, telephone, adresse_geographique, created_at",
        )
        .eq("entreprise_id", entId)
        .order("nom_complet", { ascending: true });

      if (clientsError) throw clientsError;
      setClients(data || []);
    } catch (error) {
      console.error("Pipeline Error [fetchClientsData]:", error);
      toast.error("Erreur lors du chargement des clients");
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    const initData = async () => {
      await fetchClientsData();
    };

    initData();
  }, [fetchClientsData]);

  const filteredClients = useMemo(() => {
    if (!searchQuery) return clients;
    return clients.filter(
      (client) =>
        client.nom_complet.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.telephone.includes(searchQuery) ||
        (client.email &&
          client.email.toLowerCase().includes(searchQuery.toLowerCase())),
    );
  }, [clients, searchQuery]);

  const handleOpenCreate = () => {
    setEditingClientId(null);
    setFormData({
      nom_complet: "",
      email: "",
      telephone: "",
      adresse_geographique: "",
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (client: ClientRow) => {
    setEditingClientId(client.id);
    setFormData({
      nom_complet: client.nom_complet,
      email: client.email || "",
      telephone: client.telephone,
      adresse_geographique: client.adresse_geographique,
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (!entrepriseId) {
      setFormError("Erreur système : Identifiant d'entreprise introuvable.");
      return;
    }

    if (formData.telephone.length < 8) {
      setFormError("Le numéro de téléphone semble trop court.");
      return;
    }

    try {
      setSubmitLoading(true);

      const payload = {
        entreprise_id: entrepriseId,
        nom_complet: formData.nom_complet.trim(),
        email: formData.email.trim() || null,
        telephone: formData.telephone.trim(),
        adresse_geographique: formData.adresse_geographique.trim(),
      };

      if (editingClientId) {
        const { error } = await supabase
          .from("clients")
          .update(payload)
          .eq("id", editingClientId)
          .eq("entreprise_id", entrepriseId);

        if (error) throw error;
        toast.success("Profil client mis à jour avec succès !");
      } else {
        const { error } = await supabase.from("clients").insert([payload]);
        if (error) throw error;
        toast.success("Nouveau client ajouté à la base !");
      }

      setIsModalOpen(false);
      await fetchClientsData();
    } catch (error: unknown) {
      if (error instanceof Error) {
        setFormError(error.message);
      } else {
        setFormError("Une erreur est survenue lors de l'enregistrement.");
      }
      toast.error("Échec de l'enregistrement");
    } finally {
      setSubmitLoading(false);
    }
  }

  const handleDelete = async (id: string, nom: string) => {
    const isConfirmed = window.confirm(
      `⚠️ Êtes-vous sûr de vouloir supprimer définitivement le client "${nom}" ?\nToutes les données associées pourraient être impactées.`,
    );

    if (!isConfirmed) return;

    try {
      setLoading(true);
      const { error } = await supabase
        .from("clients")
        .delete()
        .eq("id", id)
        .eq("entreprise_id", entrepriseId);

      if (error) throw error;

      await fetchClientsData();
      toast.success(`Le client ${nom} a été supprimé.`);
    } catch (error) {
      console.error("Erreur de suppression:", error);
      toast.error(
        "Impossible de supprimer ce client. Des factures y sont sûrement liées.",
      );
    } finally {
      setLoading(false);
    }
  };

  if (loading && clients.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600 dark:text-emerald-400" />
        <p className="text-gray-500 dark:text-gray-400 font-medium">
          Chargement du registre clients...
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <Toaster position="top-right" reverseOrder={false} />

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <UsersRound className="text-emerald-600 dark:text-emerald-400" />
            Base de Données Clients
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Centralisez vos comptes clients et gérez leurs informations.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
            <input
              type="text"
              placeholder="Rechercher par nom, tel ou email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 dark:border-dark-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400 bg-white dark:bg-dark-800 text-gray-900 dark:text-gray-100"
            />
          </div>

          <Button
            onClick={handleOpenCreate}
            icon={<Plus size={16} />}
            variant="primary"
          >
            Nouveau Client
          </Button>
        </div>
      </div>

      <div className="bg-white dark:bg-dark-800 border border-gray-200 dark:border-dark-700 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-dark-700 text-left text-sm">
            <thead className="bg-gray-50 dark:bg-dark-900/50 text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold tracking-wider">
              <tr>
                <th className="px-6 py-4">Raison Sociale / Nom</th>
                <th className="px-6 py-4">Contact</th>
                <th className="px-6 py-4">Adresse Géographique</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-dark-700 text-gray-700 dark:text-gray-300">
              {filteredClients.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center">
                    <UsersRound className="h-10 w-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-500 dark:text-gray-400 font-medium">
                      Aucun client trouvé.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredClients.map((client) => (
                  <tr
                    key={client.id}
                    className="hover:bg-gray-50 dark:hover:bg-dark-700/50 transition-colors group"
                  >
                    <td className="px-6 py-4 font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-3">
                      <div className="h-8 w-8 rounded bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-700 dark:text-emerald-400 font-bold shrink-0">
                        {client.nom_complet.charAt(0).toUpperCase()}
                      </div>
                      <span className="truncate">{client.nom_complet}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <span className="font-mono text-sm text-gray-600 dark:text-gray-400">
                          {client.telephone}
                        </span>
                        {client.email && (
                          <span
                            className="text-xs text-gray-500 dark:text-gray-500 truncate max-w-50"
                            title={client.email}
                          >
                            {client.email}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-400">
                      <span
                        className="line-clamp-2"
                        title={client.adresse_geographique}
                      >
                        {client.adresse_geographique}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-3 whitespace-nowrap">
                      <button
                        onClick={() => handleOpenEdit(client)}
                        className="text-gray-400 hover:text-emerald-600 dark:text-gray-500 dark:hover:text-emerald-400 transition-colors focus:outline-none"
                        title="Modifier ce client"
                      >
                        <Edit size={18} />
                      </button>
                      <button
                        onClick={() =>
                          handleDelete(client.id, client.nom_complet)
                        }
                        className="text-gray-400 hover:text-red-600 dark:text-gray-500 dark:hover:text-red-400 transition-colors focus:outline-none"
                        title="Supprimer ce client"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ✅ MODAL AVEC COMPOSANT MODAL */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingClientId ? "Modifier le Client" : "Nouveau Profil Client"}
        maxWidth="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          {formError && (
            <div className="p-3 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              {formError}
            </div>
          )}

          <Input
            label="Raison Sociale / Nom Complet"
            icon={<Building2 size={16} />}
            placeholder="Ex: Maroc Telecom S.A."
            value={formData.nom_complet}
            onChange={(e) =>
              setFormData({ ...formData, nom_complet: e.target.value })
            }
            required
          />

          <Input
            label="Adresse Email"
            icon={<Mail size={16} />}
            type="email"
            placeholder="Ex: contact@entreprise.com"
            value={formData.email}
            onChange={(e) =>
              setFormData({ ...formData, email: e.target.value })
            }
            helper="Optionnel"
          />

          <Input
            label="Téléphone de contact"
            icon={<Phone size={16} />}
            type="text"
            placeholder="Ex: +212 5XX XX XX XX"
            value={formData.telephone}
            onChange={(e) =>
              setFormData({ ...formData, telephone: e.target.value })
            }
            required
          />

          <Textarea
            label="Adresse Géographique"
            icon={<MapPin size={16} />}
            placeholder="Ex: 45 Boulevard Anfa, Casablanca"
            value={formData.adresse_geographique}
            onChange={(e) =>
              setFormData({
                ...formData,
                adresse_geographique: e.target.value,
              })
            }
            rows={3}
            required
          />

          <div className="pt-2 flex justify-end gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsModalOpen(false)}
            >
              Annuler
            </Button>
            <Button type="submit" variant="primary" loading={submitLoading}>
              {submitLoading
                ? "Enregistrement..."
                : editingClientId
                  ? "Mettre à jour"
                  : "Valider le Client"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
