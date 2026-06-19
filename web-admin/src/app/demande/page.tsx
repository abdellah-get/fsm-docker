import { useState } from "react";
import { createClient } from "../../utils/supabase/client";

export default function FormulaireClient({
  entrepriseId,
}: {
  entrepriseId: string;
}) {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);

    try {
      // Appel de notre super-fonction RPC
      const { data, error } = await supabase.rpc("creer_demande_client", {
        p_entreprise_id: entrepriseId, // L'ID de l'entreprise récupéré dans l'URL
        p_nom_complet: formData.get("nom_complet"),
        p_telephone: formData.get("telephone"),
        p_email: formData.get("email") || null, // Optionnel
        p_adresse: formData.get("adresse"),
        p_titre: formData.get("titre"), // ex: "Panne de climatisation"
        p_description: formData.get("description"),
      });

      if (error) throw error;

      alert("Votre demande a bien été envoyée !");
      // Rediriger vers une page de remerciement
    } catch (error) {
      console.error("Erreur lors de la soumission :", error);
      alert("Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 max-w-md mx-auto p-6 bg-white rounded-lg shadow"
    >
      {/* ... tes champs input (nom_complet, telephone, email, adresse, titre, description) ... */}
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700"
      >
        {loading ? "Envoi en cours..." : "Envoyer la demande"}
      </button>
    </form>
  );
}
