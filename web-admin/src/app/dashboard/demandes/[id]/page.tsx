"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "../../../../utils/supabase/client";
import { getDemandeDataSQL, assignTechnicienSQL } from "./actions"; // 👈 Import de nos actions
import Button from "../../../../components/ui/Button";
import Select from "../../../../components/ui/Select";
import { Phone, MapPin, Loader2, CheckCircle } from "lucide-react";

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

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 1. Authentification via Supabase
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        // 2. Fetch des données via notre Action SQL !
        const result = await getDemandeDataSQL(demandeId, user.id);

        if (!result.success) {
          throw new Error(result.error);
        }

        setDemande(result.demande);
        setTechniciens(result.techniciens || []);
      } catch (err) {
        console.error("Erreur chargement demande:", err);
        setError("Impossible de charger cette demande.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [supabase, demandeId]);

  const handleAssigner = async () => {
    if (!demande || !selectedTechnicienId) return;

    try {
      setAssigning(true);
      setError(null);

      // 📍 NOUVEAU : Appel de notre transaction SQL pour l'assignation !
      const result = await assignTechnicienSQL(demande, selectedTechnicienId);

      if (!result.success) {
        throw new Error(result.error);
      }

      // Force le rafraîchissement complet
      window.location.href = "/dashboard";
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

  // SÉCURITÉ : Si la demande est déjà assignée, on affiche un écran de succès au lieu du formulaire
  if (demande.statut === "ASSIGNEE") {
    return (
      <div className="p-6 max-w-xl mx-auto bg-emerald-50 border border-emerald-200 rounded-xl mt-12 text-center space-y-4">
        <div className="flex justify-center text-emerald-600">
          <CheckCircle size={48} />
        </div>
        <h2 className="text-xl font-bold text-emerald-900">
          Demande déjà traitée
        </h2>
        <p className="text-emerald-700">
          Cette demande a déjà été associée à un technicien et convertie en
          mission.
        </p>
        <Button onClick={() => router.push("/dashboard")} className="mt-2">
          Retour au tableau de bord
        </Button>
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
