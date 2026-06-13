"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "../../../utils/supabase/client";
import Link from "next/link";
import SignatureCanvas from "react-signature-canvas"; // 💡 Pense à installer : npm install react-signature-canvas @types/react-signature-canvas

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
  signature_client_url?: string | null; // 💡 Ajout du champ pour l'URL de signature
}

export default function MesInterventionsPage() {
  const supabase = createClient();
  const signaturePadRef = useRef<SignatureCanvas>(null);

  // --- ÉTATS DES DONNÉES ---
  const [interventions, setInterventions] = useState<InterventionMobile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [rapportsSaisis, setRapportsSaisis] = useState<Record<string, string>>(
    {},
  );

  // --- ÉTATS POUR LA MODALE DE SIGNATURE ---
  const [isSignatureModalOpen, setIsSignatureModalOpen] =
    useState<boolean>(false);
  const [selectedInterventionId, setSelectedInterventionId] = useState<
    string | null
  >(null);

  // =========================================================================
  // CHARGEMENT DES DONNÉES
  // =========================================================================
  const fetchMyInterventions = useCallback(
    async (showSpinner = true) => {
      try {
        if (showSpinner) setLoading(true);

        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();
        if (sessionError || !session) throw new Error("Non authentifié.");

        const { data, error } = await supabase
          .from("interventions")
          .select(
            `
            id, titre, description, statut, date_prevue, compte_rendu, signature_client_url,
            clients ( nom_complet )
            `,
          )
          .eq("technicien_id", session.user.id)
          .order("date_prevue", { ascending: true });

        if (error) throw error;
        setInterventions(data as unknown as InterventionMobile[]);
      } catch (error) {
        console.error("Erreur chargement missions :", error);
      } finally {
        if (showSpinner) setLoading(false);
      }
    },
    [supabase],
  );

  useEffect(() => {
    const initPage = async () => {
      await Promise.resolve();
      fetchMyInterventions();
    };
    initPage();
  }, [fetchMyInterventions]);

  // =========================================================================
  // UTILS : CONVERSION BASE64 VERS BLOB (Nécessaire pour l'upload Storage)
  // =========================================================================
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
  // ACTIONS METIER
  // =========================================================================

  // Démarrer une intervention
  const handleDemarrer = async (id: string) => {
    try {
      setActionLoadingId(id);
      const { error } = await supabase
        .from("interventions")
        .update({ statut: "EN_COURS" })
        .eq("id", id);

      if (error) throw error;

      setInterventions((prev) =>
        prev.map((inv) =>
          inv.id === id ? { ...inv, statut: "EN_COURS" } : inv,
        ),
      );
    } catch (error) {
      console.error("Erreur de mise à jour :", error);
      alert("Impossible de démarrer la mission.");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Ouvrir la fenêtre de signature avant de valider la clôture
  const handleOuvrirSignature = (id: string) => {
    setSelectedInterventionId(id);
    setIsSignatureModalOpen(true);
  };

  // Clôturer l'intervention avec sauvegarde du compte-rendu ET transfert de la signature
  const handleFinaliserCloture = async () => {
    if (!selectedInterventionId) return;

    // Validation : Sécurité pour s'assurer que le client a bien tracé une signature
    if (signaturePadRef.current?.isEmpty()) {
      alert(
        "Veuillez demander au client de signer le canevas avant de valider.",
      );
      return;
    }

    try {
      setActionLoadingId(selectedInterventionId);

      // 1. Extraction de la signature du canvas en image Base64 PNG
      const dataUrl = signaturePadRef.current
        ?.getTrimmedCanvas()
        .toDataURL("image/png");
      if (!dataUrl)
        throw new Error("Échec de la génération du rendu de signature.");
      const signatureBlob = dataURLtoBlob(dataUrl);

      // 2. Récupération de l'ID utilisateur pour compartimenter le Storage
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error("Session utilisateur expirée.");
      const userId = session.user.id;

      // 3. Upload du fichier binaire vers Supabase Storage (Bucket: 'signatures')
      const filePath = `${userId}/${selectedInterventionId}.png`;
      const { error: storageError } = await supabase.storage
        .from("signatures")
        .upload(filePath, signatureBlob, {
          contentType: "image/png",
          upsert: true,
        });

      if (storageError) throw storageError;

      // 4. Génération de l'URL publique pérenne de l'image
      const {
        data: { publicUrl },
      } = supabase.storage.from("signatures").getPublicUrl(filePath);

      // 5. Mise à jour finale en Base de Données
      const texteRapport =
        rapportsSaisis[selectedInterventionId]?.trim() || null;
      const { error: dbError } = await supabase
        .from("interventions")
        .update({
          statut: "CLOTUREE",
          compte_rendu: texteRapport,
          signature_client_url: publicUrl,
        })
        .eq("id", selectedInterventionId);

      if (dbError) throw dbError;

      // 6. Optimistic UI : Synchronisation instantanée de l'état local
      setInterventions((prev) =>
        prev.map((inv) =>
          inv.id === selectedInterventionId
            ? {
                ...inv,
                statut: "CLOTUREE",
                compte_rendu: texteRapport,
                signature_client_url: publicUrl,
              }
            : inv,
        ),
      );

      // Fermeture propre de l'interface modale
      setIsSignatureModalOpen(false);
      setSelectedInterventionId(null);
    } catch (error) {
      console.error("Erreur critique lors de la clôture signée :", error);
      alert("Erreur technique : Impossible de valider la clôture.");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Mettre à jour le texte du rapport dans l'état local pendant la frappe
  const handleRapportChange = (id: string, texte: string) => {
    setRapportsSaisis((prev) => ({
      ...prev,
      [id]: texte,
    }));
  };

  // =========================================================================
  // RENDU UI
  // =========================================================================
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <p className="text-gray-500 animate-pulse font-medium">
          Chargement de votre planning...
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Mon Planning</h1>
        <p className="text-sm text-gray-500">
          Missions qui vous sont assignées.
        </p>
      </div>

      {interventions.length === 0 ? (
        <div className="text-center p-8 bg-gray-50 rounded-xl border border-gray-100">
          <p className="text-gray-500 font-medium">
            Vous avez aucune mission prévue pour le moment. ☕
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {interventions.map((item) => {
            const isActionLoading = actionLoadingId === item.id;
            const dateObj = new Date(item.date_prevue);
            const dateStr = dateObj.toLocaleDateString("fr-FR", {
              weekday: "long",
              day: "numeric",
              month: "long",
            });
            const timeStr = dateObj.toLocaleTimeString("fr-FR", {
              hour: "2-digit",
              minute: "2-digit",
            });

            return (
              <div
                key={item.id}
                className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-4"
              >
                {/* EN-TÊTE DE LA CARTE */}
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg leading-tight">
                      {item.titre}
                    </h3>
                    <p className="text-sm font-medium text-emerald-600 mt-1">
                      📍 {item.clients?.nom_complet || "Client inconnu"}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-bold text-gray-700 capitalize">
                      {dateStr}
                    </div>
                    <div className="text-xs text-gray-500 font-mono">
                      {timeStr}
                    </div>
                  </div>
                </div>

                {/* DESCRIPTION FOURNIE PAR LE GÉRANT */}
                {item.description && (
                  <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-100">
                    {item.description}
                  </p>
                )}

                {/* DYNAMIQUE SELON LE STATUT */}
                <div className="pt-2">
                  {/* ÉTAT 1 : À FAIRE */}
                  {item.statut === "A_FAIRE" && (
                    <button
                      onClick={() => handleDemarrer(item.id)}
                      disabled={isActionLoading}
                      className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-sm transition-colors shadow-sm disabled:opacity-50"
                    >
                      {isActionLoading
                        ? "Démarrage..."
                        : "▶ Démarrer l'intervention"}
                    </button>
                  )}

                  {/* ÉTAT 2 : EN COURS (Affiche le champ de compte-rendu) */}
                  {item.statut === "EN_COURS" && (
                    <div className="space-y-3 animate-in fade-in duration-300">
                      <div>
                        <label className="block text-xs font-bold uppercase text-gray-500 mb-2">
                          📝 Compte-rendu intervention (Optionnel)
                        </label>
                        <textarea
                          rows={3}
                          placeholder="Décrivez les travaux réalisés, pièces changées..."
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-gray-900"
                          value={rapportsSaisis[item.id] || ""}
                          onChange={(e) =>
                            handleRapportChange(item.id, e.target.value)
                          }
                        />
                      </div>
                      <button
                        onClick={() => handleOuvrirSignature(item.id)} // 💡 Redirection vers la modale au lieu du handleCloturer direct
                        disabled={isActionLoading}
                        className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-sm transition-colors shadow-sm disabled:opacity-50"
                      >
                        ✔ Faire signer et Terminer la mission
                      </button>
                    </div>
                  )}

                  {/* ÉTAT 3 : CLÔTURÉE */}
                  {item.statut === "CLOTUREE" && (
                    <div className="space-y-3">
                      {item.compte_rendu && (
                        <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-lg">
                          <p className="text-xs font-bold text-emerald-800 uppercase mb-1">
                            Bilan de intervention :
                          </p>
                          <p className="text-sm text-emerald-900">
                            {item.compte_rendu}
                          </p>
                        </div>
                      )}

                      <div className="w-full py-2 bg-gray-100 text-gray-500 rounded-lg font-bold text-sm text-center flex justify-center items-center gap-2">
                        <span>✅ Mission terminée</span>
                      </div>

                      <Link
                        href={`/dashboard/interventions/${item.id}/bon-intervention`}
                        className="w-full py-3 bg-gray-900 hover:bg-black text-white rounded-lg font-bold text-sm text-center display:flex justify-center items-center gap-2 transition-colors shadow-sm mt-2 block"
                      >
                        📄 Afficher le Bon Intervention
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* =========================================================================
          💡 MODALE DE SIGNATURE TACTILE (S'affiche par dessus l'application)
         ========================================================================= */}
      {isSignatureModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-100 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h2 className="text-base font-bold text-gray-900">
                ✍ Signature du Client
              </h2>
              <button
                onClick={() => {
                  if (!actionLoadingId) setIsSignatureModalOpen(false);
                }}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold focus:outline-none"
              >
                &times;
              </button>
            </div>

            <div className="p-5 space-y-4">
              <p className="text-xs text-gray-500">
                Veuillez faire signer le client directement au doigt ou au
                stylet dans la zone ci-dessous :
              </p>

              {/* Zone Canvas Tactile */}
              <div className="border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 p-1">
                <SignatureCanvas
                  ref={signaturePadRef}
                  penColor="black"
                  canvasProps={{
                    className:
                      "w-full h-40 bg-white rounded-lg cursor-crosshair",
                  }}
                />
              </div>

              {/* Barre de boutons d'action de la modale */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => signaturePadRef.current?.clear()}
                  className="w-1/3 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-medium transition-colors"
                  disabled={actionLoadingId !== null}
                >
                  Effacer
                </button>
                <button
                  type="button"
                  onClick={handleFinaliserCloture}
                  disabled={actionLoadingId !== null}
                  className="w-2/3 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {actionLoadingId !== null ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white animate-spin rounded-full"></span>
                      Enregistrement...
                    </>
                  ) : (
                    "Confirmer & Clôturer"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
