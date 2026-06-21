"use client";

import { useState } from "react";
import { createClient } from "../../utils/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Input, Textarea } from "../../components/ui";

export default function FormulaireClient() {
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const entrepriseId = searchParams.get("entreprise_id");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Si le lien ne contient pas entreprise_id, on bloque tout de suite
  // plutot que de laisser l'utilisateur remplir un formulaire qui echouera.
  if (!entrepriseId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md text-center p-6 bg-amber-50 border border-amber-200 rounded-xl">
          <h2 className="text-lg font-bold text-amber-950 mb-2">
            Lien invalide
          </h2>
          <p className="text-sm text-amber-900">
            Aucune entreprise n&apos;est indiquée dans ce lien. Vérifiez que
            vous avez bien copié l&apos;adresse complète fournie par votre
            prestataire.
          </p>
        </div>
      </div>
    );
  }

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
      const adresse = formData.get("adresse") as string;
      const titre = formData.get("titre") as string;
      const description = formData.get("description") as string;

      // Validation des champs obligatoires
      if (!nom_complet || !telephone || !titre) {
        throw new Error("Veuillez remplir tous les champs obligatoires.");
      }

      // Insertion directe dans la table demandes (sans RPC)
      const { data, error } = await supabase
        .from("demandes")
        .insert([
          {
            entreprise_id: entrepriseId,
            nom_complet: nom_complet,
            telephone: telephone,
            email: email || null,
            adresse: adresse || null,
            titre: titre,
            description: description || null,
            statut: "EN_ATTENTE",
          },
        ])
        .select();

      if (error) {
        console.error("Erreur Supabase:", error);
        // Gestion specifique des erreurs
        if (error.code === "42P01") {
          throw new Error(
            "La table 'demandes' n'existe pas. Veuillez contacter l'administrateur.",
          );
        }
        if (error.code === "23503") {
          throw new Error(
            "L'entreprise sélectionnée n'existe pas. Veuillez réessayer.",
          );
        }
        throw new Error(
          error.message || "Erreur lors de l'envoi de la demande.",
        );
      }

      setSuccess(true);

      // Reinitialiser le formulaire
      (e.target as HTMLFormElement).reset();

      // Rediriger apres 3 secondes
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
            Remplissez ce formulaire pour faire une demande d'intervention
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg">
            ❌ {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 rounded-lg">
            ✅ Votre demande a été envoyée avec succès ! Redirection vers
            l'annuaire...
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="space-y-4 bg-white dark:bg-dark-800 p-6 rounded-xl shadow-lg border border-gray-100 dark:border-dark-700"
        >
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
            placeholder="Ex: halima@email.com"
            helper="Optionnel"
          />

          <Input
            label="Adresse"
            name="adresse"
            id="adresse"
            placeholder="Ex: Boulevard Abdellah Ibrahim, Casablanca"
            helper="Optionnel"
          />

          <Input
            label="Titre de la demande *"
            name="titre"
            id="titre"
            placeholder="Ex: Panne de climatisation"
            required
          />

          <Textarea
            label="Description"
            name="description"
            id="description"
            placeholder="Décrivez votre demande en détail..."
            rows={4}
            helper="Optionnel"
          />

          <Button
            type="submit"
            variant="primary"
            loading={loading}
            className="w-full py-2.5"
            disabled={loading}
          >
            {loading ? "Envoi en cours..." : "Envoyer la demande"}
          </Button>
        </form>
      </div>
    </div>
  );
}
