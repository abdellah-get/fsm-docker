"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "../../../utils/supabase/client";
import Link from "next/link";
import SignatureCanvas from "react-signature-canvas";
import Button from "../../../components/ui/Button";
import Input from "../../../components/ui/Input";
import Modal from "../../../components/ui/Modal";
import Select from "../../../components/ui/Select";
import Textarea from "../../../components/ui/Textarea";

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
  signature_client: string | null;
  montant_final: number | null;
  prix_valide_a: string | null;
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

  // --- ÉTATS POUR LA SAISIE DU PRIX ---
  const [prixSaisis, setPrixSaisis] = useState<Record<string, string>>({});

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
            id, titre, description, statut, date_prevue, compte_rendu, signature_client,
            montant_final, prix_valide_a,
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
  // UTILS : CONVERSION BASE64 VERS BLOB
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

  const handlePrixChange = (id: string, valeur: string) => {
    setPrixSaisis((prev) => ({
      ...prev,
      [id]: valeur,
    }));
  };

  const handleValiderPrix = async (id: string) => {
    const montant = parseFloat(prixSaisis[id]);

    if (isNaN(montant) || montant <= 0) {
      alert("Veuillez saisir un montant valide.");
      return;
    }

    try {
      setActionLoadingId(id);
      const { error } = await supabase
        .from("interventions")
        .update({ montant_final: montant })
        .eq("id", id);

      if (error) throw error;

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

  const handleOuvrirSignature = (id: string) => {
    setSelectedInterventionId(id);
    setIsSignatureModalOpen(true);
  };

  const handleFinaliserCloture = async () => {
    if (!selectedInterventionId) return;

    if (signaturePadRef.current?.isEmpty()) {
      alert(
        "Veuillez demander au client de signer le canevas avant de valider.",
      );
      return;
    }

    try {
      setActionLoadingId(selectedInterventionId);

      const dataUrl = signaturePadRef.current
        ?.getTrimmedCanvas()
        .toDataURL("image/png");
      if (!dataUrl)
        throw new Error("Échec de la génération du rendu de signature.");
      const signatureBlob = dataURLtoBlob(dataUrl);

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error("Session utilisateur expirée.");
      const userId = session.user.id;

      const filePath = `${userId}/${selectedInterventionId}.png`;
      const { error: storageError } = await supabase.storage
        .from("signatures")
        .upload(filePath, signatureBlob, {
          contentType: "image/png",
          upsert: true,
        });

      if (storageError) throw storageError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("signatures").getPublicUrl(filePath);

      const texteRapport =
        rapportsSaisis[selectedInterventionId]?.trim() || null;

      // La signature vaut aussi acceptation finale du prix : on horodate
      // prix_valide_a a ce moment si un montant a deja ete saisi.
      const interventionConcernee = interventions.find(
        (inv) => inv.id === selectedInterventionId,
      );
      const updatePayload: Record<string, unknown> = {
        statut: "CLOTUREE",
        compte_rendu: texteRapport,
        signature_client: publicUrl,
      };

      if (
        interventionConcernee?.montant_final &&
        !interventionConcernee.prix_valide_a
      ) {
        updatePayload.prix_valide_a = new Date().toISOString();
      }

      const { error: dbError } = await supabase
        .from("interventions")
        .update(updatePayload)
        .eq("id", selectedInterventionId);

      if (dbError) throw dbError;

      // La signature du client vaut acceptation finale (travail + prix),
      // comme un recu signe chez un artisan. On cree donc la facture
      // immediatement, sans attendre une validation separee.
      if (interventionConcernee?.montant_final) {
        const montantTTC = interventionConcernee.montant_final;
        const tauxTVA = 20.0;
        const montantHT = Math.round((montantTTC / 1.2) * 100) / 100;

        const dateEcheance = new Date();
        dateEcheance.setDate(dateEcheance.getDate() + 30);

        const { data: profilTechnicien } = await supabase
          .from("utilisateurs")
          .select("entreprise_id")
          .eq("id", userId)
          .single();

        if (profilTechnicien?.entreprise_id) {
          const { error: factureError } = await supabase
            .from("factures")
            .insert([
              {
                entreprise_id: profilTechnicien.entreprise_id,
                intervention_id: selectedInterventionId,
                montant_ht: montantHT,
                taux_tva: tauxTVA,
                montant_ttc: montantTTC,
                statut: "EN_ATTENTE",
                date_echeance: dateEcheance.toISOString().split("T")[0],
              },
            ]);

          if (factureError) {
            console.error("Erreur creation facture automatique:", factureError);
          }
        }
      }

      setInterventions((prev) =>
        prev.map((inv) =>
          inv.id === selectedInterventionId
            ? {
                ...inv,
                statut: "CLOTUREE",
                compte_rendu: texteRapport,
                signature_client: publicUrl,
                prix_valide_a:
                  (updatePayload.prix_valide_a as string) || inv.prix_valide_a,
              }
            : inv,
        ),
      );

      setIsSignatureModalOpen(false);
      setSelectedInterventionId(null);
    } catch (error) {
      console.error("Erreur critique lors de la clôture signée :", error);
      alert("Erreur technique : Impossible de valider la clôture.");
    } finally {
      setActionLoadingId(null);
    }
  };

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
      <div className="flex items-center justify-center min-h-96 bg-gray-50 dark:bg-dark-900">
        <p className="text-gray-500 dark:text-gray-400 animate-pulse font-medium">
          Chargement de votre planning...
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Mon Planning
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Missions qui vous sont assignées.
        </p>
      </div>

      {interventions.length === 0 ? (
        <div className="text-center p-8 bg-gray-50 dark:bg-dark-800 rounded-xl border border-gray-100 dark:border-dark-700">
          <p className="text-gray-500 dark:text-gray-400 font-medium">
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

            const prixDejaSaisi = item.montant_final !== null;

            return (
              <div
                key={item.id}
                className="bg-white dark:bg-dark-800 border border-gray-200 dark:border-dark-700 rounded-xl p-5 shadow-sm space-y-4"
              >
                {/* EN-TÊTE DE LA CARTE */}
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg leading-tight">
                      {item.titre}
                    </h3>
                    <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400 mt-1">
                      📍 {item.clients?.nom_complet || "Client inconnu"}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-bold text-gray-700 dark:text-gray-300 capitalize">
                      {dateStr}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                      {timeStr}
                    </div>
                  </div>
                </div>

                {/* DESCRIPTION FOURNIE PAR LE GÉRANT */}
                {item.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-dark-700/50 p-3 rounded-lg border border-gray-100 dark:border-dark-700">
                    {item.description}
                  </p>
                )}

                {/* DYNAMIQUE SELON LE STATUT */}
                <div className="pt-2">
                  {/* ÉTAT 1 : À FAIRE — prix pas encore saisi */}
                  {item.statut === "A_FAIRE" && !prixDejaSaisi && (
                    <div className="space-y-3 animate-in fade-in duration-300">
                      <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800 p-3 rounded-lg">
                        <p className="text-xs font-bold text-blue-800 dark:text-blue-400 uppercase mb-2">
                          💰 Prix convenu avec le client
                        </p>
                        <p className="text-xs text-blue-700 dark:text-blue-300 mb-3">
                          Diagnostiquez sur place, mettez-vous d&apos;accord
                          avec le client, puis saisissez le montant final avant
                          de démarrer.
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

                  {/* ÉTAT 1bis : À FAIRE — prix deja saisi, pret a demarrer */}
                  {item.statut === "A_FAIRE" && prixDejaSaisi && (
                    <div className="space-y-3 animate-in fade-in duration-300">
                      <div className="bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-100 dark:border-emerald-800 p-3 rounded-lg flex items-center justify-between">
                        <span className="text-sm font-medium text-emerald-800 dark:text-emerald-400">
                          Prix convenu
                        </span>
                        <span className="font-bold text-emerald-900 dark:text-emerald-300">
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

                  {/* ÉTAT 2 : EN COURS */}
                  {item.statut === "EN_COURS" && (
                    <div className="space-y-3 animate-in fade-in duration-300">
                      <Textarea
                        label="📝 Compte-rendu intervention (Optionnel)"
                        placeholder="Décrivez les travaux réalisés, pièces changées..."
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

                  {/* ÉTAT 3 : CLÔTURÉE */}
                  {item.statut === "CLOTUREE" && (
                    <div className="space-y-3">
                      {item.montant_final && (
                        <div className="bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-100 dark:border-emerald-800 p-3 rounded-lg flex items-center justify-between">
                          <span className="text-sm font-medium text-emerald-800 dark:text-emerald-400">
                            Montant facturé
                          </span>
                          <span className="font-bold text-emerald-900 dark:text-emerald-300">
                            {item.montant_final.toLocaleString("fr-MA")} MAD
                          </span>
                        </div>
                      )}

                      {item.compte_rendu && (
                        <div className="bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-100 dark:border-emerald-800 p-3 rounded-lg">
                          <p className="text-xs font-bold text-emerald-800 dark:text-emerald-400 uppercase mb-1">
                            Bilan de intervention :
                          </p>
                          <p className="text-sm text-emerald-900 dark:text-emerald-300">
                            {item.compte_rendu}
                          </p>
                        </div>
                      )}

                      <div className="w-full py-2 bg-gray-100 dark:bg-dark-700 text-gray-500 dark:text-gray-400 rounded-lg font-bold text-sm text-center flex justify-center items-center gap-2">
                        <span>✅ Mission terminée</span>
                      </div>

                      <Link
                        href={`/dashboard/interventions/${item.id}/bon-intervention`}
                        className="block mt-2"
                      >
                        <Button
                          variant="primary"
                          className="w-full py-3 bg-gray-900 hover:bg-black text-white focus:ring-gray-700 dark:bg-gray-900 dark:hover:bg-gray-800"
                        >
                          📄 Afficher le Bon Intervention
                        </Button>
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
          💡 MODALE DE SIGNATURE TACTILE AVEC COMPOSANT MODAL
         ========================================================================= */}
      <Modal
        isOpen={isSignatureModalOpen}
        onClose={() => {
          if (!actionLoadingId) setIsSignatureModalOpen(false);
        }}
        title="✍ Signature du Client"
        maxWidth="md"
      >
        <div className="space-y-4">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Veuillez faire signer le client directement au doigt ou au stylet
            dans la zone ci-dessous :
          </p>

          {/* Zone Canvas Tactile */}
          <div className="border-2 border-dashed border-gray-300 dark:border-dark-700 rounded-xl bg-gray-50 dark:bg-dark-800 p-1">
            <SignatureCanvas
              ref={signaturePadRef}
              penColor="black"
              canvasProps={{
                className:
                  "w-full h-40 bg-white dark:bg-dark-900 rounded-lg cursor-crosshair",
              }}
            />
          </div>

          {/* Boutons d'action */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              onClick={() => signaturePadRef.current?.clear()}
              variant="secondary"
              className="w-1/3 py-2.5"
              disabled={actionLoadingId !== null}
            >
              Effacer
            </Button>
            <Button
              type="button"
              onClick={handleFinaliserCloture}
              variant="primary"
              className="w-2/3 py-2.5"
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
