"use client";

import { useState, useRef } from "react";
import { createClient } from "../../utils/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Input, Textarea } from "../../components/ui";
import dynamic from "next/dynamic";

const MapPicker = dynamic(() => import("./MapPicker"), {
  ssr: false,
  loading: () => (
    <div className="h-[300px] w-full bg-gray-100 animate-pulse rounded-lg flex items-center justify-center text-gray-500">
      Chargement de la carte...
    </div>
  ),
});

export default function FormulaireClient() {
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const entrepriseId = searchParams.get("entreprise_id");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // États Adresse
  const [adresseText, setAdresseText] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);

  // États Carte et Géolocalisation
  const [showMap, setShowMap] = useState(false);
  const [mapPosition, setMapPosition] = useState<[number, number] | null>(null);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  // États Photos
  const [photos, setPhotos] = useState<File[]>([]);

  if (!entrepriseId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md text-center p-6 bg-amber-50 border border-amber-200 rounded-xl">
          <h2 className="text-lg font-bold text-amber-950 mb-2">
            Lien invalide
          </h2>
          <p className="text-sm text-amber-900">
            Aucune entreprise n'est indiquée dans ce lien.
          </p>
        </div>
      </div>
    );
  }

  // --- 📍 FONCTION 1 : GÉOLOCALISATION ---
  const handleGeolocate = () => {
    if (!navigator.geolocation) {
      alert("Votre navigateur ne supporte pas la géolocalisation.");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setMapPosition([lat, lng]);
        setShowMap(true);

        // Convertir les coordonnées GPS en adresse texte
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
          );
          const data = await res.json();
          if (data && data.display_name) {
            setAdresseText(data.display_name);
            setSuggestions([]);
          }
        } catch (err) {
          console.error("Erreur de reverse geocoding:", err);
        } finally {
          setIsLocating(false);
        }
      },
      (err) => {
        alert(
          "Impossible d'obtenir votre position. Veuillez vérifier vos autorisations.",
        );
        setIsLocating(false);
      },
    );
  };

  const handleAddressChange = (text: string) => {
    setAdresseText(text);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (text.length < 3) {
      setSuggestions([]);
      return;
    }
    searchTimeout.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(text)}&countrycodes=ma&addressdetails=1&limit=5`,
        );
        const data = await res.json();
        setSuggestions(data);
      } catch (err) {
        console.error("Erreur recherche :", err);
      } finally {
        setIsSearching(false);
      }
    }, 600);
  };

  const handleSelectSuggestion = (suggestion: any) => {
    setAdresseText(suggestion.display_name);
    setMapPosition([parseFloat(suggestion.lat), parseFloat(suggestion.lon)]);
    setSuggestions([]);
    setShowMap(true);
  };

  const handleMapPositionChange = async (lat: number, lng: number) => {
    setMapPosition([lat, lng]);
    setIsGeocoding(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      );
      const data = await res.json();
      if (data && data.display_name) {
        setAdresseText(data.display_name);
        setSuggestions([]);
      }
    } catch (err) {
      console.error("Erreur :", err);
    } finally {
      setIsGeocoding(false);
    }
  };

  // --- 📸 FONCTION 2 : GESTION DES PHOTOS ---
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      // Limiter à 2 photos maximum pour ne pas surcharger le stockage
      const selectedFiles = Array.from(e.target.files).slice(0, 2);
      setPhotos(selectedFiles);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    const formData = new FormData(e.currentTarget);

    try {
      const nom_complet = formData.get("nom_complet") as string;
      const telephone = formData.get("telephone") as string;
      const email = formData.get("email") as string;
      const titre = formData.get("titre") as string;
      const description = formData.get("description") as string;
      const date_disponibilite = formData.get("date_disponibilite") as string;
      const preference_horaire = formData.get("preference_horaire") as string;

      if (!nom_complet || !telephone || !titre || !adresseText.trim()) {
        throw new Error("Veuillez remplir tous les champs obligatoires.");
      }

      // --- UPLOAD DES PHOTOS DANS SUPABASE STORAGE ---
      const uploadedPhotoUrls: string[] = [];
      if (photos.length > 0) {
        for (const photo of photos) {
          const fileExt = photo.name.split(".").pop();
          const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
          const filePath = `${entrepriseId}/${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from("photos_interventions")
            .upload(filePath, photo);

          if (uploadError)
            throw new Error("Erreur lors de l'envoi des photos.");

          const { data: publicUrlData } = supabase.storage
            .from("photos_interventions")
            .getPublicUrl(filePath);

          uploadedPhotoUrls.push(publicUrlData.publicUrl);
        }
      }

      // --- INSERTION DANS LA BASE DE DONNÉES ---
      const { error } = await supabase.from("demandes").insert([
        {
          entreprise_id: entrepriseId,
          nom_complet: nom_complet,
          telephone: telephone,
          email: email || null,
          adresse: adresseText,
          latitude: mapPosition ? mapPosition[0] : null,
          longitude: mapPosition ? mapPosition[1] : null,
          titre: titre,
          description: description || null,
          date_disponibilite: date_disponibilite || null,
          preference_horaire: preference_horaire || null,
          photos: uploadedPhotoUrls, // Les URLs des images qu'on vient d'uploader
          statut: "EN_ATTENTE",
        },
      ]);

      if (error) throw error;

      setSuccess(true);
      setAdresseText("");
      setMapPosition(null);
      setPhotos([]);
      (e.target as HTMLFormElement).reset();

      setTimeout(() => {
        router.push("/entreprises");
      }, 3000);
    } catch (error) {
      console.error("Erreur lors de la soumission :", error);
      setError(
        error instanceof Error ? error.message : "Une erreur est survenue.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-900 py-12 px-4">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Demande d'Intervention
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Remplissez ce formulaire pour nous aider à intervenir rapidement.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg">
            ❌ {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg">
            ✅ Demande envoyée avec succès ! Redirection en cours...
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="space-y-6 bg-white dark:bg-dark-800 p-6 rounded-xl shadow-lg border border-gray-100"
        >
          {/* INFORMATIONS CLIENT */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">
              1. Vos coordonnées
            </h3>
            <Input
              label="Nom Complet *"
              name="nom_complet"
              id="nom_complet"
              placeholder="Ex: Halima Osman"
              required
            />
            <Input
              label="Téléphone *"
              name="telephone"
              id="telephone"
              type="tel"
              placeholder="Ex: 06 08 38 37 78"
              required
            />
            <Input
              label="Email"
              name="email"
              id="email"
              type="email"
              placeholder="Optionnel"
            />
          </div>

          {/* ADRESSE ET GÉOLOCALISATION */}
          <div className="space-y-2 relative">
            <div className="flex justify-between items-end mb-1">
              <h3 className="text-lg font-semibold">2. Lieu d'intervention</h3>
              <button
                type="button"
                onClick={handleGeolocate}
                disabled={isLocating}
                className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200 flex items-center gap-1 transition"
              >
                {isLocating ? "⏳ Localisation..." : "📍 Me localiser"}
              </button>
            </div>

            <Input
              label="Adresse Complète *"
              name="adresse"
              id="adresse"
              value={adresseText}
              onChange={(e) => handleAddressChange(e.target.value)}
              placeholder="Saisissez ou utilisez 'Me localiser'..."
              required
              autoComplete="off"
            />

            {suggestions.length > 0 && (
              <ul className="absolute z-50 w-full bg-white border border-gray-200 shadow-xl rounded-lg mt-1 max-h-60 overflow-auto top-[90px]">
                {suggestions.map((suggestion, index) => (
                  <li
                    key={index}
                    onClick={() => handleSelectSuggestion(suggestion)}
                    className="px-4 py-3 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-0 text-sm"
                  >
                    📍 {suggestion.display_name}
                  </li>
                ))}
              </ul>
            )}

            <button
              type="button"
              onClick={() => setShowMap(!showMap)}
              className="text-sm font-medium text-blue-600 hover:text-blue-700 mt-1"
            >
              {showMap ? "❌ Masquer la carte" : "🗺️ Ajuster sur la carte"}
            </button>

            {showMap && (
              <div className="mt-2 relative z-0">
                <MapPicker
                  position={mapPosition}
                  onPositionChange={handleMapPositionChange}
                />
              </div>
            )}
          </div>

          {/* DÉTAILS DU PROBLÈME ET PHOTOS */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">
              3. Le problème
            </h3>
            <Input
              label="Titre du problème *"
              name="titre"
              id="titre"
              placeholder="Ex: Fuite d'eau sous l'évier"
              required
            />
            <Textarea
              label="Description détaillée"
              name="description"
              id="description"
              placeholder="Décrivez le problème..."
              rows={3}
            />

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">
                Photos (Optionnel, Max 2)
              </label>
              <input
                type="file"
                accept="image/png, image/jpeg, image/webp"
                multiple
                onChange={handlePhotoChange}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
              />
              {photos.length > 0 && (
                <p className="text-xs text-green-600 mt-1">
                  {photos.length} photo(s) sélectionnée(s)
                </p>
              )}
            </div>
          </div>

          {/* DISPONIBILITÉS */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">
              4. Vos disponibilités
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Date souhaitée"
                name="date_disponibilite"
                id="date_disponibilite"
                type="date"
              />
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">
                  Moment préféré
                </label>
                <select
                  name="preference_horaire"
                  className="px-3 py-2 border rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Peu importe</option>
                  <option value="Matin (8h-12h)">Matin (8h-12h)</option>
                  <option value="Après-midi (14h-18h)">
                    Après-midi (14h-18h)
                  </option>
                  <option value="Urgence absolue">Urgence absolue</option>
                </select>
              </div>
            </div>
          </div>

          <Button
            type="submit"
            variant="primary"
            loading={loading}
            className="w-full py-3 text-lg"
            disabled={loading}
          >
            {loading ? "Envoi en cours..." : "Envoyer ma demande"}
          </Button>
        </form>
      </div>
    </div>
  );
}
