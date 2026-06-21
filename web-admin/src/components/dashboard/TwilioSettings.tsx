"use client";

import { useState, useEffect } from "react";
import { createClient } from "../../utils/supabase/client";

interface TwilioSettingsProps {
  entrepriseId: string;
}

export default function TwilioSettings({ entrepriseId }: TwilioSettingsProps) {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showToken, setShowToken] = useState(false);

  // États du formulaire
  const [accountSid, setAccountSid] = useState("");
  const [authToken, setAuthToken] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");

  // 1. Charger les données existantes au montage du composant
  useEffect(() => {
    async function loadTwilioConfig() {
      try {
        const { data, error } = await supabase
          .from("entreprises")
          .select(
            "twilio_account_sid, twilio_auth_token, twilio_whatsapp_number",
          )
          .eq("id", entrepriseId)
          .single();

        if (error) throw error;

        if (data) {
          setAccountSid(data.twilio_account_sid || "");
          setAuthToken(data.twilio_auth_token || "");
          setWhatsappNumber(data.twilio_whatsapp_number || "");
        }
      } catch (err) {
        console.error("Erreur lors du chargement de la config Twilio:", err);
      } finally {
        setLoading(false);
      }
    }

    if (entrepriseId) loadTwilioConfig();
  }, [entrepriseId, supabase]);

  // 2. Sauvegarder la configuration
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      // Nettoyage rapide du numéro WhatsApp pour s'assurer qu'il a le préfixe whatsapp:
      let formattedNumber = whatsappNumber.trim();
      if (formattedNumber && !formattedNumber.startsWith("whatsapp:")) {
        formattedNumber = `whatsapp:${formattedNumber}`;
      }

      const { error } = await supabase
        .from("entreprises")
        .update({
          twilio_account_sid: accountSid.trim(),
          twilio_auth_token: authToken.trim(),
          twilio_whatsapp_number: formattedNumber,
        })
        .eq("id", entrepriseId);

      if (error) throw error;

      alert("✅ Configuration Twilio enregistrée avec succès !");
    } catch (err) {
      console.error(err);
      alert("❌ Impossible de sauvegarder la configuration.");
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <p className="text-sm text-gray-500 animate-pulse">
        Chargement des paramètres...
      </p>
    );

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 max-w-2xl">
      <div className="border-b border-gray-100 pb-4 mb-6">
        <h2 className="text-lg font-semibold text-gray-900">
          Configuration WhatsApp (Twilio)
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Connectez votre propre compte Twilio pour envoyer les factures
          directement depuis votre numéro WhatsApp professionnel.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-5">
        {/* Account SID */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
            Twilio Account SID
          </label>
          <input
            type="text"
            value={accountSid}
            onChange={(e) => setAccountSid(e.target.value)}
            placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
            className="w-full text-sm px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
            required
          />
        </div>

        {/* Auth Token avec option masquer/afficher */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
            Twilio Auth Token
          </label>
          <div className="relative">
            <input
              type={showToken ? "text" : "password"}
              value={authToken}
              onChange={(e) => setAuthToken(e.target.value)}
              placeholder="Votre Auth Token secret"
              className="w-full text-sm px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all pr-12"
              required
            />
            <button
              type="button"
              onClick={() => setShowToken(!showToken)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm text-gray-500 hover:text-gray-700"
            >
              {showToken ? "Masquer" : "Afficher"}
            </button>
          </div>
        </div>

        {/* Numéro WhatsApp de l'expéditeur */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
            Numéro WhatsApp Expéditeur Twilio
          </label>
          <input
            type="text"
            value={whatsappNumber}
            onChange={(e) => setWhatsappNumber(e.target.value)}
            placeholder="+2126XXXXXXXX ou whatsapp:+2126XXXXXXXX"
            className="w-full text-sm px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
            required
          />
          <p className="text-xs text-gray-400 mt-1.5">
            Ce numéro doit être approuvé et configuré dans votre console Twilio
            Sandbox ou Live WhatsApp.
          </p>
        </div>

        {/* Bouton de soumission */}
        <div className="flex justify-end pt-4 border-t border-gray-100">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center justify-center bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm py-2 px-4 rounded-lg transition-colors shadow-sm disabled:opacity-50"
          >
            {saving ? "Enregistrement..." : "Sauvegarder les paramètres"}
          </button>
        </div>
      </form>
    </div>
  );
}
