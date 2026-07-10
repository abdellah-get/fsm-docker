"use client";

import { useState } from "react";
import { Button, Input } from "../../components/ui";
import { Loader2, Search, PhoneCall } from "lucide-react";
import { getDemandesByPhoneSQL } from "./actions"; // 👈 Import de notre action serveur SQL

interface DemandeRow {
  id: string;
  titre: string;
  description: string | null;
  statut: string;
  created_at: string;
}

// Configuration visuelle de chaque statut possible.
// Si vous ajoutez un nouveau statut côté base de données,
// pensez à l'ajouter ici aussi, sinon il s'affichera en gris par défaut.
const STATUT_CONFIG: Record<string, { label: string; className: string }> = {
  EN_ATTENTE: {
    label: "En attente",
    className: "bg-amber-50 text-amber-700 border-amber-200",
  },
  ASSIGNEE: {
    label: "Technicien assigné",
    className: "bg-blue-50 text-blue-700 border-blue-200",
  },
  EN_COURS: {
    label: "En cours",
    className: "bg-indigo-50 text-indigo-700 border-indigo-200",
  },
  TERMINEE: {
    label: "Terminée",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
};

function StatutBadge({ statut }: { statut: string }) {
  const config = STATUT_CONFIG[statut] || {
    label: statut,
    className: "bg-gray-50 text-gray-700 border-gray-200",
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${config.className}`}
    >
      {config.label}
    </span>
  );
}

export default function SuiviPage() {
  const [telephone, setTelephone] = useState("");
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [demandes, setDemandes] = useState<DemandeRow[]>([]);

  const handleSearch = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSearched(false);

    const cleanedPhone = telephone.trim();
    if (cleanedPhone.length < 8) {
      setError("Veuillez entrer un numéro de téléphone valide.");
      return;
    }

    try {
      setLoading(true);

      // 📍 Appel direct à PostgreSQL via notre action serveur !
      const result = await getDemandesByPhoneSQL(cleanedPhone);

      if (!result.success) {
        throw new Error(result.error);
      }

      setDemandes((result.data as DemandeRow[]) || []);
      setSearched(true);
    } catch (err) {
      console.error("Erreur recherche demandes:", err);
      setError(
        "Impossible de récupérer vos demandes pour le moment. Réessayez dans quelques instants.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center justify-center gap-2">
            <PhoneCall className="text-primary-600" size={22} />
            Suivi de mes demandes
          </h1>
          <p className="text-gray-600 mt-2 text-sm">
            Entrez le numéro de téléphone utilisé lors de votre demande pour
            voir son statut.
          </p>
        </div>

        <form
          onSubmit={handleSearch}
          className="space-y-4 bg-white p-6 rounded-xl shadow-sm border border-gray-200"
        >
          <Input
            label="Numéro de téléphone"
            name="telephone"
            id="telephone"
            type="tel"
            placeholder="Ex: 06 08 38 37 78"
            value={telephone}
            onChange={(e) => setTelephone(e.target.value)}
            required
          />

          {error && (
            <div className="p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg">
              {error}
            </div>
          )}

          <Button
            type="submit"
            variant="primary"
            loading={loading}
            icon={<Search size={16} />}
            className="w-full"
          >
            {loading ? "Recherche..." : "Voir mes demandes"}
          </Button>
        </form>

        {/* Résultats de la recherche */}
        {searched && !loading && (
          <div className="mt-6 space-y-3">
            {demandes.length === 0 ? (
              <div className="text-center p-6 bg-white rounded-xl border border-gray-200">
                <p className="text-gray-500 text-sm">
                  Aucune demande trouvée pour ce numéro.
                </p>
              </div>
            ) : (
              demandes.map((demande) => (
                <div
                  key={demande.id}
                  className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm"
                >
                  <div className="flex justify-between items-start gap-3 mb-2">
                    <h3 className="font-semibold text-gray-900 text-sm">
                      {demande.titre}
                    </h3>
                    <StatutBadge statut={demande.statut} />
                  </div>
                  {demande.description && (
                    <p className="text-gray-500 text-sm mb-2 line-clamp-2">
                      {demande.description}
                    </p>
                  )}
                  <p className="text-gray-400 text-xs">
                    Envoyée le{" "}
                    {new Date(demande.created_at).toLocaleDateString("fr-FR", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
