"use client";

import { useEffect, useState } from "react";
import { createClient } from "../../../utils/supabase/client"; // Ajustez le chemin si besoin
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";

import L from "leaflet";

// 🌟 LA SOLUTION : Création d'une icône personnalisée via un CDN pour éviter le bug Next.js
const customIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// 🌟 MAGIE LEAFLET : Composant utilitaire pour recentrer la carte dynamiquement
function RecenterMap({
  center,
  zoom,
}: {
  center: [number, number];
  zoom: number;
}) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom, { animate: true });
  }, [center, zoom, map]);
  return null;
}

export default function MapGerant() {
  const supabase = createClient();
  const [techniciens, setTechniciens] = useState<any[]>([]);
  // Nouvel état pour stocker le technicien sélectionné ("tous" par défaut)
  const [selectedTechId, setSelectedTechId] = useState<string>("tous");

  useEffect(() => {
    // 1. Charger les positions
    const fetchPositions = async () => {
      const { data } = await supabase
        .from("utilisateurs") // Table corrigée
        .select("id, nom_complet, current_lat, current_lng")
        .not("current_lat", "is", null);
      if (data) setTechniciens(data);
    };
    fetchPositions();

    // 2. Écouter le temps réel
    const channel = supabase
      .channel("suivi_flotte")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "utilisateurs" },
        (payload) => {
          setTechniciens((prev) =>
            prev.map((tech) =>
              tech.id === payload.new.id
                ? {
                    ...tech,
                    current_lat: payload.new.current_lat,
                    current_lng: payload.new.current_lng,
                  }
                : tech,
            ),
          );
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  // Filtrer les techniciens à afficher sur la carte
  const techniciensAffiches =
    selectedTechId === "tous"
      ? techniciens
      : techniciens.filter((tech) => tech.id === selectedTechId);

  // Définir le centre et le zoom de la carte
  // Par défaut (Maroc), zoom reculé
  let currentCenter: [number, number] = [33.5731, -7.5898];
  let currentZoom = 6;

  // Si on a sélectionné UN technicien, on centre et on zoome sur lui !
  if (selectedTechId !== "tous" && techniciensAffiches.length === 1) {
    const techInfo = techniciensAffiches[0];
    if (techInfo.current_lat && techInfo.current_lng) {
      currentCenter = [techInfo.current_lat, techInfo.current_lng];
      currentZoom = 14; // Zoom plus rapproché (niveau rue/quartier)
    }
  }

  return (
    <div className="flex flex-col md:flex-row gap-4 h-[600px] w-full">
      {/* 📌 SECTION GAUCHE : Menu de sélection */}
      <div className="w-full md:w-1/4 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 bg-gray-50 border-b border-gray-200">
          <h3 className="font-bold text-gray-900 text-lg">
            Équipe sur le terrain
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            {techniciens.length} agent(s) localisé(s)
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {/* Bouton pour afficher tout le monde */}
          <button
            onClick={() => setSelectedTechId("tous")}
            className={`w-full text-left px-3 py-3 rounded-lg text-sm font-medium transition-colors ${
              selectedTechId === "tous"
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                : "hover:bg-gray-100 text-gray-700 border border-transparent"
            }`}
          >
            🌍 Voir tous les techniciens
          </button>

          <hr className="my-2 border-gray-100" />

          {/* Liste des techniciens individuels */}
          {techniciens.map((tech) => (
            <button
              key={tech.id}
              onClick={() => setSelectedTechId(tech.id)}
              className={`w-full text-left px-3 py-3 rounded-lg text-sm flex items-center gap-3 transition-colors ${
                selectedTechId === tech.id
                  ? "bg-blue-50 text-blue-700 border border-blue-200"
                  : "hover:bg-gray-100 text-gray-700 border border-transparent"
              }`}
            >
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />{" "}
              {/* Petit indicateur en direct */}
              <span className="font-medium truncate">{tech.nom_complet}</span>
            </button>
          ))}

          {techniciens.length === 0 && (
            <p className="text-sm text-gray-400 p-4 text-center italic">
              Aucun technicien avec une position active pour le moment.
            </p>
          )}
        </div>
      </div>

      {/* 📌 SECTION DROITE : La Carte */}
      <div className="w-full md:w-3/4 rounded-xl overflow-hidden border border-gray-200 shadow-sm relative z-0">
        <MapContainer
          center={currentCenter}
          zoom={currentZoom}
          style={{ height: "100%", width: "100%" }}
        >
          {/* Ce composant invisible sert juste à animer la caméra quand on clique sur le menu */}
          <RecenterMap center={currentCenter} zoom={currentZoom} />

          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

          {techniciensAffiches.map(
            (tech) =>
              tech.current_lat &&
              tech.current_lng && (
                <Marker
                  key={tech.id}
                  position={[tech.current_lat, tech.current_lng]}
                  icon={customIcon} // 🌟 L'ICÔNE EST APPLIQUÉE ICI
                >
                  <Popup>
                    <div className="text-sm p-1">
                      <strong className="text-gray-900 block text-base mb-1">
                        {tech.nom_complet}
                      </strong>
                      <span className="inline-flex items-center gap-1 text-emerald-600 font-medium bg-emerald-50 px-2 py-0.5 rounded-full text-xs">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        En direct
                      </span>
                    </div>
                  </Popup>
                </Marker>
              ),
          )}
        </MapContainer>
      </div>
    </div>
  );
}
