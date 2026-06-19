"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "../../utils/supabase/client";
import Link from "next/link";

// 1. Le composant interne qui contient la logique du formulaire
function FormulaireDemande() {
  const searchParams = useSearchParams();
  const entrepriseId = searchParams.get("entreprise_id");
  const supabase = createClient();

  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  if (!entrepriseId) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500 font-medium mb-4">
          Erreur : Aucune entreprise sélectionnée.
        </p>
        <Link href="/entreprises" className="text-blue-600 hover:underline">
          &larr; Retourner à l'annuaire
        </Link>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setStatus("idle");
    setErrorMessage("");

    const formData = new FormData(e.currentTarget);

    try {
      // Appel de notre fonction RPC Supabase créée précédemment
      const { data, error } = await supabase.rpc("creer_demande_client", {
        p_entreprise_id: entrepriseId,
        p_nom_complet: formData.get("nom_complet") as string,
        p_telephone: formData.get("telephone") as string,
        p_email: (formData.get("email") as string) || null,
        p_adresse: formData.get("adresse") as string,
        p_titre: formData.get("titre") as string,
        p_description: formData.get("description") as string,
      });

      if (error) throw error;

      // Succès !
      setStatus("success");
    } catch (error: any) {
      console.error("Erreur RPC :", error);
      setStatus("error");
      setErrorMessage(
        error.message ||
          "Une erreur est survenue lors de l'envoi de votre demande.",
      );
    } finally {
      setLoading(false);
    }
  };

  // Affichage en cas de succès
  if (status === "success") {
    return (
      <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-8 rounded-2xl text-center shadow-sm">
        <div className="text-4xl mb-4">✅</div>
        <h2 className="text-2xl font-bold mb-2">
          Demande envoyée avec succès !
        </h2>
        <p className="mb-6 text-emerald-700">
          L'entreprise a bien reçu votre demande d'intervention. Un technicien
          vous contactera prochainement.
        </p>
        <Link
          href="/entreprises"
          className="inline-block bg-emerald-600 text-white font-medium px-6 py-2 rounded-lg hover:bg-emerald-700 transition-colors"
        >
          Retourner à l'accueil
        </Link>
      </div>
    );
  }

  // Le formulaire
  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 space-y-6"
    >
      {status === "error" && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg text-sm">
          ⚠️ {errorMessage}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label
            htmlFor="nom_complet"
            className="block text-sm font-medium text-gray-700"
          >
            Nom Complet <span className="text-red-500">*</span>
          </label>
          <input
            required
            type="text"
            id="nom_complet"
            name="nom_complet"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            placeholder="Ex: Jean Dupont"
          />
        </div>

        <div className="space-y-2">
          <label
            htmlFor="telephone"
            className="block text-sm font-medium text-gray-700"
          >
            Téléphone <span className="text-red-500">*</span>
          </label>
          <input
            required
            type="tel"
            id="telephone"
            name="telephone"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            placeholder="Ex: 06 00 00 00 00"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label
          htmlFor="email"
          className="block text-sm font-medium text-gray-700"
        >
          Email (Optionnel)
        </label>
        <input
          type="email"
          id="email"
          name="email"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          placeholder="Ex: jean.dupont@email.com"
        />
      </div>

      <div className="space-y-2">
        <label
          htmlFor="adresse"
          className="block text-sm font-medium text-gray-700"
        >
          Adresse géographique <span className="text-red-500">*</span>
        </label>
        <input
          required
          type="text"
          id="adresse"
          name="adresse"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          placeholder="Ex: 123 Rue de la Paix, Ville"
        />
      </div>

      <hr className="border-gray-100" />

      <div className="space-y-2">
        <label
          htmlFor="titre"
          className="block text-sm font-medium text-gray-700"
        >
          Sujet de l'intervention <span className="text-red-500">*</span>
        </label>
        <input
          required
          type="text"
          id="titre"
          name="titre"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          placeholder="Ex: Panne de climatisation"
        />
      </div>

      <div className="space-y-2">
        <label
          htmlFor="description"
          className="block text-sm font-medium text-gray-700"
        >
          Description détaillée <span className="text-red-500">*</span>
        </label>
        <textarea
          required
          id="description"
          name="description"
          rows={4}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
          placeholder="Décrivez votre problème en quelques mots..."
        ></textarea>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-colors disabled:opacity-70 flex justify-center items-center"
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <svg
              className="animate-spin h-5 w-5 text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            Envoi en cours...
          </span>
        ) : (
          "Envoyer ma demande"
        )}
      </button>
    </form>
  );
}

// 2. Le composant principal qui exporte la page avec la boundary Suspense
export default function DemandeInterventionPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <Link
            href="/entreprises"
            className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
          >
            &larr; Retour à la sélection
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mt-4">
            Demande d'intervention
          </h1>
          <p className="text-gray-500 mt-2">
            Remplissez ce formulaire. L'entreprise sera notifiée instantanément.
          </p>
        </div>

        {/* C'est ici que la magie de Next.js opère */}
        <Suspense
          fallback={
            <div className="p-8 text-center text-gray-500 bg-white rounded-2xl shadow-sm border border-gray-200">
              Chargement du formulaire...
            </div>
          }
        >
          <FormulaireDemande />
        </Suspense>
      </div>
    </div>
  );
}
