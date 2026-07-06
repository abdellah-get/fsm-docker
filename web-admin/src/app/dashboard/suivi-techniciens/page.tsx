"use client";

import dynamic from "next/dynamic";
import Link from "next/link";

// Chargement dynamique pour éviter les erreurs côté serveur avec Leaflet
const MapGerantDynamique = dynamic(
  () => import("../components/MapGerant"), // Assurez-vous que le chemin est correct selon l'étape 1 précédente
  {
    ssr: false,
    loading: () => (
      <div className="h-150 w-full bg-gray-50 rounded-xl flex items-center justify-center border border-gray-200">
        <p className="text-gray-500 animate-pulse font-medium">
          Chargement de la carte GPS en temps réel...
        </p>
      </div>
    ),
  },
);

export default function SuiviTechniciensPage() {
  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Suivi Géographique de la Flotte
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Visualisez la position en direct de vos techniciens lorsqu'ils sont
            en mission.
          </p>
        </div>
        <Link
          href="/dashboard"
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition"
        >
          Retour au Dashboard
        </Link>
      </div>

      {/* Affichage de la carte de tracking */}
      <MapGerantDynamique />
    </div>
  );
}
