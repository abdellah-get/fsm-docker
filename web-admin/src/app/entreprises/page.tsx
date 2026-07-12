"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "../../components/ui";
import { Search, Phone, Mail } from "lucide-react";
import { getEntreprisesPubliquesSQL } from "./actions"; // 👈 Import de notre action serveur

interface EntreprisePublique {
  id: string;
  nom: string;
  telephone: string | null;
  email: string | null;
}

export default function AnnuaireEntreprisesPage() {
  const [entreprises, setEntreprises] = useState<EntreprisePublique[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchEntreprises() {
      try {
        setLoading(true);

        // 📍 Appel direct à PostgreSQL via notre action serveur !
        const result = await getEntreprisesPubliquesSQL();

        if (!result.success) {
          throw new Error(result.error);
        }

        setEntreprises((result.data as EntreprisePublique[]) || []);
      } catch (error) {
        console.error("Erreur lors du chargement des entreprises :", error);
      } finally {
        setLoading(false);
      }
    }

    fetchEntreprises();
  }, []); // 👈 Plus besoin de mettre supabase en dépendance

  const entreprisesFiltrees = entreprises.filter((ent) =>
    ent.nom.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight sm:text-5xl mb-4">
            Trouvez votre prestataire idéal
          </h1>
          <p className="text-lg text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">
            Sélectionnez une entreprise partenaire pour effectuer votre demande
            d'intervention technique en quelques clics.
          </p>
        </div>

        <div className="max-w-xl mx-auto mb-10">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-3 border border-gray-300 dark:border-dark-700 rounded-xl leading-5 bg-white dark:bg-dark-800 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400 focus:border-emerald-500 dark:focus:border-emerald-400 transition-all shadow-sm"
              placeholder="Rechercher une entreprise par nom..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 dark:border-emerald-400"></div>
          </div>
        ) : entreprisesFiltrees.length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-dark-800 rounded-2xl border border-gray-200 dark:border-dark-700 shadow-sm">
            <p className="text-gray-500 dark:text-gray-400 text-lg">
              Aucune entreprise ne correspond à votre recherche.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {entreprisesFiltrees.map((entreprise) => (
              <div
                key={entreprise.id}
                className="bg-white dark:bg-dark-800 rounded-2xl border border-gray-200 dark:border-dark-700 shadow-sm hover:shadow-lg hover:border-emerald-300 dark:hover:border-emerald-700 transition-all duration-200 flex flex-col overflow-hidden"
              >
                <div className="p-6 flex-1">
                  <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg flex items-center justify-center text-xl font-bold mb-4">
                    {entreprise.nom.charAt(0).toUpperCase()}
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                    {entreprise.nom}
                  </h3>
                  <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400 mt-4">
                    {entreprise.telephone && (
                      <p className="flex items-center gap-2">
                        <Phone size={16} /> {entreprise.telephone}
                      </p>
                    )}
                    {entreprise.email && (
                      <p className="flex items-center gap-2">
                        <Mail size={16} /> {entreprise.email}
                      </p>
                    )}
                  </div>
                </div>

                <div className="p-4 bg-gray-50 dark:bg-dark-700/50 border-t border-gray-100 dark:border-dark-700">
                  <Link
                    href={`/demande-intervention?entreprise_id=${entreprise.id}`}
                    className="block w-full"
                  >
                    <Button variant="primary" className="w-full">
                      Demander une intervention
                    </Button>
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
