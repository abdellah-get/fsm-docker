"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "../../../utils/supabase/client";
import {
  Search,
  Plus,
  Building2,
  Phone,
  MapPin,
  X,
  UsersRound,
  Loader2,
  Edit,
  Trash2,
  Mail, // 💡 Nouvel icône pour l'email
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";

// 💡 1. Ajout de l'email dans l'interface
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

  // 💡 2. Ajout de l'email dans le state initial du formulaire
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

      // 💡 3. Ajout de 'email' dans le select() Supabase
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

  // 💡 4. Amélioration de la recherche pour inclure l'email
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
      email: client.email || "", // 💡 Gestion du null
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

      // 💡 5. Ajout de l'email dans le payload (nettoyé des espaces)
      const payload = {
        entreprise_id: entrepriseId,
        nom_complet: formData.nom_complet.trim(),
        email: formData.email.trim() || null, // Transforme une chaîne vide en NULL pour la BDD
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
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
        <p className="text-gray-500 font-medium">
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
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <UsersRound className="text-emerald-600" />
            Base de Données Clients
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Centralisez vos comptes clients et gérez leurs informations.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher par nom, tel ou email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 whitespace-nowrap"
          >
            <Plus size={16} />
            Nouveau Client
          </button>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase font-semibold tracking-wider">
              <tr>
                <th className="px-6 py-4">Raison Sociale / Nom</th>
                <th className="px-6 py-4">Contact</th>
                <th className="px-6 py-4">Adresse Géographique</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 text-gray-700">
              {filteredClients.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center">
                    <UsersRound className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 font-medium">
                      Aucun client trouvé.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredClients.map((client) => (
                  <tr
                    key={client.id}
                    className="hover:bg-gray-50 transition-colors group"
                  >
                    <td className="px-6 py-4 font-semibold text-gray-900 flex items-center gap-3">
                      <div className="h-8 w-8 rounded bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold shrink-0">
                        {client.nom_complet.charAt(0).toUpperCase()}
                      </div>
                      <span className="truncate">{client.nom_complet}</span>
                    </td>
                    <td className="px-6 py-4">
                      {/* 💡 6. Affichage combiné Téléphone / Email */}
                      <div className="flex flex-col gap-1">
                        <span className="font-mono text-sm text-gray-600">
                          {client.telephone}
                        </span>
                        {client.email && (
                          <span
                            className="text-xs text-gray-500 truncate max-w-50"
                            title={client.email}
                          >
                            {client.email}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
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
                        className="text-gray-400 hover:text-emerald-600 transition-colors focus:outline-none"
                        title="Modifier ce client"
                      >
                        <Edit size={18} />
                      </button>
                      <button
                        onClick={() =>
                          handleDelete(client.id, client.nom_complet)
                        }
                        className="text-gray-400 hover:text-red-600 transition-colors focus:outline-none"
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

      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-900/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Building2 className="text-emerald-600" size={20} />
                {editingClientId
                  ? "Modifier le Client"
                  : "Nouveau Profil Client"}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-700 focus:outline-none"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {formError && (
                <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase text-gray-600 mb-1.5">
                  Raison Sociale / Nom Complet *
                </label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    required
                    placeholder="Ex: Maroc Telecom S.A."
                    className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                    value={formData.nom_complet}
                    onChange={(e) =>
                      setFormData({ ...formData, nom_complet: e.target.value })
                    }
                  />
                </div>
              </div>

              {/* 💡 7. Nouvel input pour l'adresse Email */}
              <div>
                <label className="block text-xs font-bold uppercase text-gray-600 mb-1.5">
                  Adresse Email{" "}
                  <span className="text-gray-400 normal-case font-normal">
                    (Optionnel)
                  </span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="email"
                    placeholder="Ex: contact@entreprise.com"
                    className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-gray-600 mb-1.5">
                  Téléphone de contact *
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    required
                    placeholder="Ex: +212 5XX XX XX XX"
                    className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                    value={formData.telephone}
                    onChange={(e) =>
                      setFormData({ ...formData, telephone: e.target.value })
                    }
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-gray-600 mb-1.5">
                  Adresse Géographique *
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <textarea
                    required
                    rows={3}
                    placeholder="Ex: 45 Boulevard Anfa, Casablanca"
                    className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                    value={formData.adresse_geographique}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        adresse_geographique: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 bg-white rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors focus:outline-none"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submitLoading}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm disabled:opacity-50 focus:outline-none flex items-center gap-2"
                >
                  {submitLoading && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  {submitLoading
                    ? "Enregistrement..."
                    : editingClientId
                      ? "Mettre à jour"
                      : "Valider le Client"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
