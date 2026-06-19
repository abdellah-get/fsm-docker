"use client";

import { useEffect, useState } from "react";
import { createClient } from "../../utils/supabase/client";
import Link from "next/link";

// On définit une interface allégée (on ne veut pas exposer le RC ou l'ICE au public)
interface EntreprisePublique {
  id: string;
  nom: string;
  telephone: string | null;
  email: string | null;
}

export default function AnnuaireEntreprisesPage() {
  const supabase = createClient();
  const [entreprises, setEntreprises] = useState<EntreprisePublique[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchEntreprises() {
      try {
        // On ne sélectionne que les champs non-sensibles
        const { data, error } = await supabase
          .from("entreprises")
          .select("id, nom, telephone, email")
          .order("nom", { ascending: true });

        if (error) throw error;
        setEntreprises(data || []);
      } catch (error) {
        console.error("Erreur lors du chargement des entreprises :", error);
      } finally {
        setLoading(false);
      }
    }

    fetchEntreprises();
  }, [supabase]);

  // Filtrage dynamique ultra-rapide côté client
  const entreprisesFiltrees = entreprises.filter((ent) =>
    ent.nom.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        {/* En-tête de la page */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight sm:text-5xl mb-4">
            Trouvez votre prestataire idéal
          </h1>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto">
            Sélectionnez une entreprise partenaire pour effectuer votre demande
            d'intervention technique en quelques clics.
          </p>
        </div>

        {/* Barre de recherche */}
        <div className="max-w-xl mx-auto mb-10">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg
                className="h-5 w-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm"
              placeholder="Rechercher une entreprise par nom..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Grille des résultats */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : entreprisesFiltrees.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-200 shadow-sm">
            <p className="text-gray-500 text-lg">
              Aucune entreprise ne correspond à votre recherche.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {entreprisesFiltrees.map((entreprise) => (
              <div
                key={entreprise.id}
                className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-lg hover:border-blue-300 transition-all duration-200 flex flex-col overflow-hidden"
              >
                <div className="p-6 flex-1">
                  <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center text-xl font-bold mb-4">
                    {entreprise.nom.charAt(0).toUpperCase()}
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    {entreprise.nom}
                  </h3>
                  <div className="space-y-2 text-sm text-gray-600 mt-4">
                    {entreprise.telephone && (
                      <p className="flex items-center gap-2">
                        <span>📞</span> {entreprise.telephone}
                      </p>
                    )}
                    {entreprise.email && (
                      <p className="flex items-center gap-2">
                        <span>✉️</span> {entreprise.email}
                      </p>
                    )}
                  </div>
                </div>

                {/* Bouton d'action qui redirige vers le formulaire */}
                <div className="p-4 bg-gray-50 border-t border-gray-100">
                  <Link
                    href={`/demande-intervention?entreprise_id=${entreprise.id}`}
                    className="block w-full text-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                  >
                    Demander une intervention
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
