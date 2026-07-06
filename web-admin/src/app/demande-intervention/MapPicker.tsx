"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css"; // 🌟 Indispensable pour que la carte s'affiche bien
import L from "leaflet";

// 🌟 CORRECTION : Next.js casse souvent les icônes par défaut de Leaflet. Ceci répare le marqueur bleu.
const customIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

interface MapPickerProps {
  position: [number, number] | null;
  onPositionChange: (lat: number, lng: number) => void;
}

function LocationMarker({ position, onPositionChange }: MapPickerProps) {
  useMapEvents({
    click(e) {
      onPositionChange(e.latlng.lat, e.latlng.lng);
    },
  });

  return position ? <Marker position={position} icon={customIcon} /> : null;
}

export default function MapPicker({
  position,
  onPositionChange,
}: MapPickerProps) {
  // 🌟 CORRECTION DU BUG "Map container is being reused" :
  // On utilise une clé qui change une fois au montage pour forcer Leaflet à bien s'initialiser.
  const [mapId, setMapId] = useState<number>(0);

  useEffect(() => {
    setMapId(Math.random());
  }, []);

  // Centre par défaut (Le Maroc)
  const defaultCenter: [number, number] = [31.7917, -7.0926];

  // Si on n'a pas encore de mapId (pendant le premier rendu serveur/client), on ne monte pas la carte.
  if (mapId === 0) return null;

  return (
    <div
      style={{
        height: "300px",
        width: "100%",
        borderRadius: "8px",
        overflow: "hidden",
        zIndex: 0,
      }}
    >
      <MapContainer
        key={mapId} // <--- C'EST CETTE LIGNE QUI RÈGLE VOTRE BUG
        center={position || defaultCenter}
        zoom={position ? 15 : 5}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        <LocationMarker
          position={position}
          onPositionChange={onPositionChange}
        />
      </MapContainer>
    </div>
  );
}
