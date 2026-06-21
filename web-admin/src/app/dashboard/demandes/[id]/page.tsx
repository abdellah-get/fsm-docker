"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "../../../../utils/supabase/client";
import Button from "../../../../components/ui/Button";
import Select from "../../../../components/ui/Select";
import { Phone, MapPin, Calendar, Loader2 } from "lucide-react";

interface DemandeDetail {
  id: string;
  entreprise_id: string;
  nom_complet: string;
  telephone: string;
  email: string | null;
  adresse: string | null;
  titre: string;
  description: string | null;
  statut: string;
  created_at: string;
}

interface TechnicienOption {
  id: string;
  nom_complet: string;
}

export default function DetailDemandePage() {
  const supabase = createClient();
  const router = useRouter();
  const params = useParams();
  const demandeId = params.id as string;

  const [demande, setDemande] = useState<DemandeDetail | null>(null);
  const [techniciens, setTechniciens] = useState<TechnicienOption[]>([]);
  const [selectedTechnicienId, setSelectedTechnicienId] = useState("");
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("utilisateurs")
        .select("entreprise_id")
        .eq("id", user.id)
        .maybeSingle();

      if (!profile) throw new Error("Profil introuvable.");

      const [demandeRes, techniciensRes] = await Promise.all([
        supabase
          .from("demandes")
          .select("*")
          .eq("id", demandeId)
          .eq("entreprise_id", profile.entreprise_id)
          .single(),
        supabase
          .from("utilisateurs")
          .select("id, nom_complet")
          .eq("entreprise_id", profile.entreprise_id)
          .eq("role", "TECHNICIEN")
          .eq("is_active", true),
      ]);

      if (demandeRes.error) throw demandeRes.error;
      if (techniciensRes.error) throw techniciensRes.error;

      setDemande(demandeRes.data);
      setTechniciens(techniciensRes.data || []);
    } catch (err) {
      console.error("Erreur chargement demande:", err);
      setError("Impossible de charger cette demande.");
    } finally {
      setLoading(false);
    }
  }, [supabase, demandeId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAssigner = async () => {
    if (!demande || !selectedTechnicienId) return;

    try {
      setAssigning(true);
      setError(null);

      // 1. Chercher si un client avec ce telephone existe deja pour cette entreprise
      const { data: clientExistant, error: clientSearchError } = await supabase
        .from("clients")
        .select("id")
        .eq("entreprise_id", demande.entreprise_id)
        .eq("telephone", demande.telephone)
        .maybeSingle();

      if (clientSearchError) throw clientSearchError;

      let clientId = clientExistant?.id;

      // 2. Si aucun client trouve, on le cree a partir des infos de la demande
      if (!clientId) {
        const { data: nouveauClient, error: clientCreateError } = await supabase
          .from("clients")
          .insert([
            {
              entreprise_id: demande.entreprise_id,
              nom_complet: demande.nom_complet,
              telephone: demande.telephone,
              email: demande.email,
              adresse_geographique: demande.adresse || "Adresse non renseignee",
            },
          ])
          .select("id")
          .single();

        if (clientCreateError) throw clientCreateError;
        clientId = nouveauClient.id;
      }

      // 3. Creer l'intervention de travail, liee au client et au technicien
      const { error: interventionError } = await supabase
        .from("interventions")
        .insert([
          {
            entreprise_id: demande.entreprise_id,
            client_id: clientId,
            technicien_id: selectedTechnicienId,
            titre: demande.titre,
            description: demande.description,
            statut: "A_FAIRE",
            date_prevue: new Date().toISOString(),
          },
        ]);

      if (interventionError) throw interventionError;

      // 4. Marquer la demande comme assignee, on garde la trace historique
      const { error: updateDemandeError } = await supabase
        .from("demandes")
        .update({
          statut: "ASSIGNEE",
          technicien_id: selectedTechnicienId,
        })
        .eq("id", demande.id);

      if (updateDemandeError) throw updateDemandeError;

      router.push("/dashboard");
    } catch (err) {
      console.error("Erreur assignation:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Erreur lors de l'assignation du technicien.",
      );
    } finally {
      setAssigning(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-6 w-6 animate-spin text-primary-600" />
      </div>
    );
  }

  if (!demande) {
    return (
      <div className="p-6 max-w-xl mx-auto bg-amber-50 border border-amber-200 rounded-xl mt-12 text-center">
        <p className="text-amber-900">Demande introuvable.</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{demande.titre}</h1>
        <p className="text-gray-500 mt-1">
          Demande reçue le{" "}
          {new Date(demande.created_at).toLocaleDateString("fr-FR", {
            day: "2-digit",
            month: "long",
            year: "numeric",
          })}
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
        <div>
          <p className="text-xs font-bold uppercase text-gray-500 mb-1">
            Client
          </p>
          <p className="text-gray-900 font-semibold">{demande.nom_complet}</p>
        </div>

        <div className="flex items-center gap-2 text-gray-600">
          <Phone size={16} />
          <span>{demande.telephone}</span>
        </div>

        {demande.adresse && (
          <div className="flex items-start gap-2 text-gray-600">
            <MapPin size={16} className="mt-0.5 shrink-0" />
            <span>{demande.adresse}</span>
          </div>
        )}

        {demande.description && (
          <div>
            <p className="text-xs font-bold uppercase text-gray-500 mb-1">
              Description du problème
            </p>
            <p className="text-gray-700">{demande.description}</p>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
        <h2 className="font-bold text-gray-900">Assigner un technicien</h2>

        {techniciens.length === 0 ? (
          <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
            Aucun technicien actif trouvé. Ajoutez-en un dans la section Équipe.
          </p>
        ) : (
          <>
            <Select
              label="Technicien"
              placeholder="Choisir un technicien"
              value={selectedTechnicienId}
              onChange={(e) => setSelectedTechnicienId(e.target.value)}
              options={techniciens.map((t) => ({
                value: t.id,
                label: t.nom_complet,
              }))}
            />

            {error && (
              <div className="p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg">
                {error}
              </div>
            )}

            <Button
              onClick={handleAssigner}
              disabled={!selectedTechnicienId || assigning}
              loading={assigning}
              className="w-full"
            >
              {assigning ? "Assignation..." : "Assigner et créer la mission"}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
