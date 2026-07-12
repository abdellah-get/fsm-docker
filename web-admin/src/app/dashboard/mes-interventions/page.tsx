"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { getSession } from "next-auth/react";
import { genererBonInterventionPDF } from "../../../utils/pdfGenerator";
import Link from "next/link";
import SignatureCanvas from "react-signature-canvas";
import Button from "../../../components/ui/Button";
import Input from "../../../components/ui/Input";
import Modal from "../../../components/ui/Modal";
import Textarea from "../../../components/ui/Textarea";

// 📍 IMPORT DES ACTIONS SQL
import {
  getMyInterventionsSQL,
  updateLocationSQL,
  updateInterventionPrixSQL,
  demarrerInterventionSQL,
  cloturerInterventionSQL,
} from "./actions";

// =========================================================================
// TYPES & INTERFACES
// =========================================================================
interface InterventionMobile {
  id: string;
  titre: string;
  description: string;
  statut: "A_FAIRE" | "EN_COURS" | "CLOTUREE";
  date_prevue: string;
  compte_rendu: string | null;
  clients: { nom_complet: string } | null;
  demandes: {
    adresse: string | null;
    latitude: number | null;
    longitude: number | null;
  } | null;
  signature_client: string | null;
  signature_technicien: string | null;
  montant_final: number | null;
  prix_valide_a: string | null;
}

export default function MesInterventionsPage() {
  const signatureClientRef = useRef<SignatureCanvas>(null);
  const signatureTechRef = useRef<SignatureCanvas>(null);

  const [interventions, setInterventions] = useState<InterventionMobile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [rapportsSaisis, setRapportsSaisis] = useState<Record<string, string>>(
    {},
  );
  const [userId, setUserId] = useState<string | null>(null);
  const [prixSaisis, setPrixSaisis] = useState<Record<string, string>>({});
  const [isSignatureModalOpen, setIsSignatureModalOpen] =
    useState<boolean>(false);
  const [selectedInterventionId, setSelectedInterventionId] = useState<
    string | null
  >(null);

  // =========================================================================
  // CHARGEMENT DES DONNÉES (VIA SQL)
  // =========================================================================
  const fetchMyInterventions = useCallback(
    async (showSpinner = true) => {
      try {
        if (showSpinner) setLoading(true);

        // Récupérer la session via NextAuth 100% local
        const session = await getSession();
        if (!session || !session.user) throw new Error("Non authentifié.");

        const currentUserId = (session.user as any).id;
        setUserId(currentUserId);

        // Appel SQL
        const result = await getMyInterventionsSQL(currentUserId);
        if (!result.success) throw new Error(result.error);

        setInterventions(
          (result.data as unknown as InterventionMobile[]) || [],
        );
      } catch (error) {
        console.error("Erreur chargement missions :", error);
      } finally {
        if (showSpinner) setLoading(false);
      }
    },
    [], // <-- Le tableau de dépendances est maintenant vide
  );

  useEffect(() => {
    let isMounted = true;

    const initPage = async () => {
      if (isMounted) await fetchMyInterventions();
    };
    initPage();

    // Polling (rafraîchissement toutes les 10 secondes au lieu du WebSocket Supabase)
    const intervalId = setInterval(() => {
      if (isMounted) fetchMyInterventions(false);
    }, 10000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [fetchMyInterventions]);

  // =========================================================================
  // TRACKING GPS (VIA SQL)
  // =========================================================================
  const hasMissionEnCours = interventions.some(
    (inv) => inv.statut === "EN_COURS",
  );

  useEffect(() => {
    if (!userId || !hasMissionEnCours) return;
    if (!navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        await updateLocationSQL(userId, latitude, longitude); // Appel SQL
      },
      (err) => console.error("Erreur GPS :", err.message),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [userId, hasMissionEnCours]);

  const dataURLtoBlob = (dataURL: string) => {
    const arr = dataURL.split(",");
    const mime = arr[0].match(/:(.*?);/)?.[1] || "image/png";
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  };

  // =========================================================================
  // ACTIONS METIER (VIA SQL)
  // =========================================================================
  const handlePrixChange = (id: string, valeur: string) => {
    setPrixSaisis((prev) => ({ ...prev, [id]: valeur }));
  };

  const handleValiderPrix = async (id: string) => {
    const montant = parseFloat(prixSaisis[id]);
    if (isNaN(montant) || montant <= 0) {
      alert("Veuillez saisir un montant valide.");
      return;
    }

    try {
      setActionLoadingId(id);

      const result = await updateInterventionPrixSQL(id, montant); // Appel SQL
      if (!result.success) throw new Error(result.error);

      setInterventions((prev) =>
        prev.map((inv) =>
          inv.id === id ? { ...inv, montant_final: montant } : inv,
        ),
      );
    } catch (error) {
      console.error("Erreur enregistrement prix :", error);
      alert("Impossible d'enregistrer le prix.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDemarrer = async (id: string) => {
    try {
      setActionLoadingId(id);

      const result = await demarrerInterventionSQL(id); // Appel SQL
      if (!result.success) throw new Error(result.error);

      setInterventions((prev) =>
        prev.map((inv) =>
          inv.id === id ? { ...inv, statut: "EN_COURS" } : inv,
        ),
      );
    } catch (error) {
      alert("Impossible de démarrer la mission.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleOuvrirSignature = (id: string) => {
    setSelectedInterventionId(id);
    setIsSignatureModalOpen(true);
  };

  const handleFinaliserCloture = async () => {
    if (!selectedInterventionId || !userId) return;

    if (
      signatureClientRef.current?.isEmpty() ||
      signatureTechRef.current?.isEmpty()
    ) {
      alert(
        "Les signatures du client ET du technicien sont obligatoires pour clôturer l'intervention.",
      );
      return;
    }

    const interventionConcernee = interventions.find(
      (inv) => inv.id === selectedInterventionId,
    );
    if (!interventionConcernee) return;

    setInterventions((prev) =>
      prev.filter((inv) => inv.id !== selectedInterventionId),
    );
    setIsSignatureModalOpen(false);
    setActionLoadingId(selectedInterventionId);

    try {
      // 1. On récupère directement le format texte (Base64) généré par le canvas
      const clientDataUrl = signatureClientRef.current
        ?.getTrimmedCanvas()
        .toDataURL("image/png");
      const techDataUrl = signatureTechRef.current
        ?.getTrimmedCanvas()
        .toDataURL("image/png");

      if (!clientDataUrl || !techDataUrl)
        throw new Error("Erreur rendu signatures");

      const texteRapport =
        rapportsSaisis[selectedInterventionId]?.trim() || null;

      // 2. Transaction SQL : On envoie les signatures directement en texte !
      const payload = {
        compte_rendu: texteRapport,
        signature_client: clientDataUrl, // Plus besoin d'URL Supabase
        signature_technicien: techDataUrl, // Plus besoin d'URL Supabase
        prix_valide_a:
          interventionConcernee.montant_final &&
          !interventionConcernee.prix_valide_a
            ? new Date().toISOString()
            : null,
      };

      const result = await cloturerInterventionSQL(
        selectedInterventionId,
        userId,
        payload,
        interventionConcernee.montant_final,
      );

      if (!result.success) throw new Error(result.error);

      // 3. Génération PDF Client
      genererBonInterventionPDF({
        id: selectedInterventionId,
        date: new Date().toLocaleDateString("fr-FR"),
        titre: interventionConcernee.titre,
        clientNom:
          interventionConcernee.clients?.nom_complet || "Client inconnu",
        adresse: interventionConcernee.demandes?.adresse || "Non renseignée",
        compteRendu: texteRapport || "Aucun compte-rendu saisi.",
        montant: interventionConcernee.montant_final || 0,
        signatureClientBase64: clientDataUrl,
        signatureTechBase64: techDataUrl,
      });

      setSelectedInterventionId(null);
    } catch (error) {
      // ... la suite reste identique (le catch)
      console.error("Erreur clôture :", error);
      // Rollback UI
      setInterventions((prev) =>
        [...prev, interventionConcernee].sort(
          (a, b) =>
            new Date(a.date_prevue).getTime() -
            new Date(b.date_prevue).getTime(),
        ),
      );
      alert("⚠️ Échec. L'intervention a été restaurée, veuillez réessayer.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRapportChange = (id: string, texte: string) => {
    setRapportsSaisis((prev) => ({ ...prev, [id]: texte }));
  };

  // =========================================================================
  // RENDU UI
  // =========================================================================
  if (loading)
    return (
      <div className="flex items-center justify-center min-h-96">
        <p className="animate-pulse">Chargement...</p>
      </div>
    );

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6">
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Mon Planning
          </h1>
          <p className="text-sm text-gray-500">
            Missions qui vous sont assignées.
          </p>
        </div>
        {hasMissionEnCours && (
          <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full text-xs font-semibold">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            GPS Actif
          </div>
        )}
      </div>

      {interventions.length === 0 ? (
        <div className="text-center p-8 bg-gray-50 rounded-xl">
          <p className="text-gray-500 font-medium">Aucune mission prévue. ☕</p>
        </div>
      ) : (
        <div className="space-y-4">
          {interventions.map((item) => {
            const isActionLoading = actionLoadingId === item.id;
            const dateObj = new Date(item.date_prevue);
            const prixDejaSaisi = item.montant_final !== null;

            return (
              <div
                key={item.id}
                className={`bg-white border ${item.statut === "EN_COURS" ? "border-emerald-400 ring-2 ring-emerald-50" : "border-gray-200"} rounded-xl p-5 shadow-sm space-y-4`}
              >
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <h3 className="font-bold text-lg">{item.titre}</h3>
                    <p className="text-sm font-medium text-emerald-600 mt-1">
                      👤 {item.clients?.nom_complet || "Client inconnu"}
                    </p>
                    {item.demandes?.adresse && (
                      <p className="text-sm text-gray-600 mt-1">
                        📍 {item.demandes.adresse}
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-bold capitalize">
                      {dateObj.toLocaleDateString("fr-FR", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                      })}
                    </div>
                    <div className="text-xs text-gray-500 font-mono">
                      {dateObj.toLocaleTimeString("fr-FR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                </div>

                {item.demandes?.latitude && item.demandes?.longitude && (
                  <div className="pt-1 pb-2">
                    <a
                      href={`http://maps.google.com/maps?q=${item.demandes.latitude},${item.demandes.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 border border-blue-200 text-sm font-medium rounded-lg"
                    >
                      🚗 Ouvrir l'itinéraire GPS
                    </a>
                  </div>
                )}

                {item.description && (
                  <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                    {item.description}
                  </p>
                )}

                <div className="pt-2">
                  {/* 1. SAISIE DU PRIX */}
                  {item.statut === "A_FAIRE" && !prixDejaSaisi && (
                    <div className="space-y-3">
                      <div className="bg-blue-50 border border-blue-100 p-3 rounded-lg">
                        <p className="text-xs font-bold text-blue-800 uppercase mb-2">
                          💰 Prix convenu avec le client
                        </p>
                        <p className="text-xs text-blue-700 mb-3">
                          Diagnostiquez sur place, mettez-vous d'accord avec le
                          client, puis saisissez le montant.
                        </p>
                        <Input
                          type="number"
                          placeholder="Ex: 350"
                          value={prixSaisis[item.id] || ""}
                          onChange={(e) =>
                            handlePrixChange(item.id, e.target.value)
                          }
                        />
                      </div>
                      <Button
                        onClick={() => handleValiderPrix(item.id)}
                        disabled={isActionLoading || !prixSaisis[item.id]}
                        variant="primary"
                        className="w-full py-3"
                      >
                        {isActionLoading
                          ? "Enregistrement..."
                          : "✔ Valider le prix"}
                      </Button>
                    </div>
                  )}

                  {/* 2. DEMARRER LA MISSION */}
                  {item.statut === "A_FAIRE" && prixDejaSaisi && (
                    <div className="space-y-3">
                      <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-lg flex items-center justify-between">
                        <span className="text-sm font-medium text-emerald-800">
                          Prix convenu
                        </span>
                        <span className="font-bold text-emerald-900">
                          {item.montant_final?.toLocaleString("fr-MA")} MAD
                        </span>
                      </div>
                      <Button
                        onClick={() => handleDemarrer(item.id)}
                        disabled={isActionLoading}
                        variant="primary"
                        className="w-full py-3"
                      >
                        {isActionLoading
                          ? "Démarrage..."
                          : "▶ Démarrer l'intervention"}
                      </Button>
                    </div>
                  )}

                  {/* 3. CLOTURER LA MISSION */}
                  {item.statut === "EN_COURS" && (
                    <div className="space-y-3">
                      <Textarea
                        label="📝 Compte-rendu intervention (Optionnel)"
                        placeholder="Décrivez les travaux réalisés..."
                        value={rapportsSaisis[item.id] || ""}
                        onChange={(e) =>
                          handleRapportChange(item.id, e.target.value)
                        }
                        rows={3}
                      />
                      <Button
                        onClick={() => handleOuvrirSignature(item.id)}
                        disabled={isActionLoading}
                        variant="primary"
                        className="w-full py-3"
                      >
                        ✔ Faire signer et Terminer la mission
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODALE AVEC LES DEUX SIGNATURES */}
      <Modal
        isOpen={isSignatureModalOpen}
        onClose={() => {
          if (!actionLoadingId) setIsSignatureModalOpen(false);
        }}
        title="✍ Signatures de validation"
        maxWidth="md"
      >
        <div className="space-y-6">
          <div className="space-y-2">
            <h4 className="font-semibold text-gray-800 text-sm">
              1. Signature du Client
            </h4>
            <div className="border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 p-1">
              <SignatureCanvas
                ref={signatureClientRef}
                penColor="black"
                canvasProps={{
                  className: "w-full h-32 bg-white rounded-lg cursor-crosshair",
                }}
              />
            </div>
            <button
              onClick={() => signatureClientRef.current?.clear()}
              className="text-xs text-red-500 hover:text-red-700 font-medium"
            >
              Effacer signature client
            </button>
          </div>

          <hr className="border-gray-200" />

          <div className="space-y-2">
            <h4 className="font-semibold text-gray-800 text-sm">
              2. Signature du Technicien
            </h4>
            <div className="border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 p-1">
              <SignatureCanvas
                ref={signatureTechRef}
                penColor="blue"
                canvasProps={{
                  className: "w-full h-32 bg-white rounded-lg cursor-crosshair",
                }}
              />
            </div>
            <button
              onClick={() => signatureTechRef.current?.clear()}
              className="text-xs text-red-500 hover:text-red-700 font-medium"
            >
              Effacer signature technicien
            </button>
          </div>

          <div className="pt-4">
            <Button
              type="button"
              onClick={handleFinaliserCloture}
              variant="primary"
              className="w-full py-3"
              disabled={actionLoadingId !== null}
              loading={actionLoadingId !== null}
            >
              {actionLoadingId !== null
                ? "Enregistrement..."
                : "Confirmer & Clôturer"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
