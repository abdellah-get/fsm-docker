"use client";

import { useState, useEffect, useCallback, use } from "react";
import { createClient } from "../../../../../utils/supabase/client";
import { Printer, ArrowLeft, Loader2, CheckCircle } from "lucide-react";
import Link from "next/link";
import Button from "../../../../../components/ui/Button";
import Modal from "../../../../../components/ui/Modal";
import Select from "../../../../../components/ui/Select";
import Textarea from "../../../../../components/ui/Textarea";

// Définition des interfaces
interface ClientRelation {
  nom_complet: string;
  email: string | null;
  telephone: string | null;
  adresse_geographique: string | null;
}

interface UtilisateurRelation {
  nom_complet: string;
  role: string;
}

interface EntrepriseRelation {
  nom: string;
  telephone: string | null;
  email: string | null;
}

interface InterventionBonData {
  id: string;
  titre: string;
  description: string | null;
  statut: string;
  date_prevue: string;
  signature_client: string | null;
  signature_technicien: string | null;
  clients: ClientRelation | null;
  utilisateurs: UtilisateurRelation | null;
  entreprises: EntrepriseRelation | null;
}

interface BonInterventionProps {
  params: Promise<{
    id: string;
  }>;
}

export default function BonInterventionPage({ params }: BonInterventionProps) {
  const supabase = createClient();

  const unwrappedParams = use(params);
  const id = unwrappedParams.id;

  const [data, setData] = useState<InterventionBonData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [backUrl, setBackUrl] = useState<string>("/dashboard");

  const fetchBonData = useCallback(async () => {
    try {
      setLoading(true);

      const { data: authData } = await supabase.auth.getUser();
      if (authData.user) {
        const { data: currentUser } = await supabase
          .from("utilisateurs")
          .select("role")
          .eq("id", authData.user.id)
          .single();

        if (currentUser?.role === "TECHNICIEN") {
          setBackUrl("/dashboard/mes-interventions");
        } else {
          setBackUrl("/dashboard/interventions");
        }
      }

      const { data: intervention, error: interError } = await supabase
        .from("interventions")
        .select(
          `
          *,
          clients ( nom_complet, email, telephone, adresse_geographique ),
          utilisateurs ( nom_complet, role ),
          entreprises ( nom, telephone, email )
        `,
        )
        .eq("id", id)
        .single();

      if (interError) throw interError;
      if (!intervention) throw new Error("Intervention introuvable");

      setData(intervention as unknown as InterventionBonData);
    } catch (err: unknown) {
      const e = err as Error;
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [id, supabase]);

  useEffect(() => {
    const init = async () => {
      await fetchBonData();
    };
    init();
  }, [fetchBonData]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-dark-900">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600 dark:text-emerald-400 mb-4" />
        <p className="text-gray-500 dark:text-gray-400 font-medium">
          Génération du document...
        </p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 text-center text-red-500 dark:text-red-400">
        <p>Erreur: {error || "Document indisponible"}</p>
        <Link
          href={backUrl}
          className="text-emerald-600 dark:text-emerald-400 underline mt-4 inline-block bg-transparent border-none cursor-pointer"
        >
          Retour à la liste
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-dark-900 p-4 sm:p-8 font-sans text-gray-900 dark:text-gray-100">
      <div className="max-w-4xl mx-auto mb-6 flex justify-between items-center print:hidden">
        <Link href={backUrl}>
          <Button variant="secondary" className="flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" /> Retour
          </Button>
        </Link>

        <Button
          onClick={handlePrint}
          variant="primary"
          className="flex items-center gap-2"
        >
          <Printer className="w-4 h-4" />
          Imprimer / Télécharger PDF
        </Button>
      </div>

      <div className="max-w-4xl mx-auto bg-white dark:bg-dark-800 p-10 sm:p-16 rounded-xl shadow-lg dark:shadow-dark-lg print:shadow-none print:p-0 print:m-0">
        <div className="flex justify-between items-start border-b border-gray-200 dark:border-dark-700 pb-8 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 tracking-tight uppercase">
              Bon intervention
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1 font-mono text-sm">
              Réf: BI-{data.id.split("-")[0].toUpperCase()}
            </p>
          </div>
          <div className="text-right">
            <h2 className="text-xl font-bold text-emerald-800 dark:text-emerald-400">
              {data.entreprises?.nom || "Mon Entreprise"}
            </h2>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              {data.entreprises?.telephone || ""}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-12 mb-10">
          <div>
            <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
              Intervention réalisée chez :
            </h3>
            <div className="bg-gray-50 dark:bg-dark-700/50 p-4 rounded-lg border border-gray-100 dark:border-dark-700">
              <p className="font-bold text-gray-900 dark:text-gray-100 text-lg">
                {data.clients?.nom_complet}
              </p>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                {data.clients?.adresse_geographique || "Adresse non spécifiée"}
              </p>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                {data.clients?.telephone}
              </p>
            </div>
          </div>
          <div>
            <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
              Détails de la mission :
            </h3>
            <table className="w-full text-sm">
              <tbody>
                <tr className="border-b border-gray-100 dark:border-dark-700">
                  <td className="py-2 text-gray-500 dark:text-gray-400 font-medium">
                    Date prévue :
                  </td>
                  <td className="py-2 text-right font-semibold text-gray-900 dark:text-gray-100">
                    {new Date(data.date_prevue).toLocaleDateString("fr-FR")}
                  </td>
                </tr>
                <tr className="border-b border-gray-100 dark:border-dark-700">
                  <td className="py-2 text-gray-500 dark:text-gray-400 font-medium">
                    Technicien :
                  </td>
                  <td className="py-2 text-right font-semibold text-gray-900 dark:text-gray-100">
                    {data.utilisateurs?.nom_complet || "Non assigné"}
                  </td>
                </tr>
                <tr>
                  <td className="py-2 text-gray-500 dark:text-gray-400 font-medium">
                    Statut :
                  </td>
                  <td className="py-2 text-right font-semibold text-gray-900 dark:text-gray-100">
                    {data.statut === "CLOTUREE" ? (
                      <span className="flex items-center justify-end gap-1 text-emerald-600 dark:text-emerald-400">
                        <CheckCircle className="w-4 h-4" /> Terminée
                      </span>
                    ) : (
                      data.statut.replace("_", " ")
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="mb-12">
          <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
            Nature de intervention
          </h3>
          <div className="border border-gray-200 dark:border-dark-700 rounded-lg p-6">
            <h4 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">
              {data.titre}
            </h4>
            <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
              {data.description ||
                "Aucune description détaillée n'a été fournie pour cette mission."}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-12 pt-8 mt-16 border-t border-gray-200 dark:border-dark-700">
          <div className="text-center">
            <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-6">
              Signature du Technicien
            </h3>
            {data.signature_technicien ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={data.signature_technicien}
                alt="Signature Technicien"
                className="h-24 object-contain mx-auto print:max-h-20"
              />
            ) : (
              <div className="border-b-2 border-dashed border-gray-300 dark:border-dark-600 w-48 mx-auto mt-10"></div>
            )}
          </div>
          <div className="text-center">
            <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-2">
              Signature du Client
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
              Précédée de la mention Bon pour accord
            </p>
            {data.signature_client ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={data.signature_client}
                alt="Signature Client"
                className="h-24 object-contain mx-auto print:max-h-20"
              />
            ) : (
              <div className="border-b-2 border-dashed border-gray-300 dark:border-dark-600 w-48 mx-auto mt-10"></div>
            )}
          </div>
        </div>

        <div className="mt-16 text-center text-xs text-gray-400 dark:text-gray-500 print:absolute print:bottom-0 print:left-0 print:w-full print:pb-8">
          Document généré informatiquement le{" "}
          {new Date().toLocaleDateString("fr-FR")} — {data.entreprises?.nom}
        </div>
      </div>
    </div>
  );
}
