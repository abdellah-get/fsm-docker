"use client";

import { useState, useEffect } from "react";
import { getTwilioConfigSQL, updateTwilioConfigSQL } from "./actions"; // 👈 Import de nos actions SQL

interface TwilioSettingsProps {
  entrepriseId: string;
}

export default function TwilioSettings({ entrepriseId }: TwilioSettingsProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showToken, setShowToken] = useState(false);

  // États du formulaire
  const [accountSid, setAccountSid] = useState("");
  const [authToken, setAuthToken] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");

  // 1. Charger les données existantes au montage du composant via SQL
  useEffect(() => {
    async function loadTwilioConfig() {
      try {
        setLoading(true);
        const result = await getTwilioConfigSQL(entrepriseId);

        if (!result.success) throw new Error(result.error);

        if (result.data) {
          setAccountSid(result.data.twilio_account_sid || "");
          setAuthToken(result.data.twilio_auth_token || "");
          setWhatsappNumber(result.data.twilio_whatsapp_number || "");
        }
      } catch (err) {
        console.error("Erreur lors du chargement de la config Twilio:", err);
      } finally {
        setLoading(false);
      }
    }

    if (entrepriseId) loadTwilioConfig();
  }, [entrepriseId]);

  // 2. Sauvegarder la configuration via SQL
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      // Nettoyage rapide du numéro WhatsApp pour s'assurer qu'il a le préfixe whatsapp:
      let formattedNumber = whatsappNumber.trim();
      if (formattedNumber && !formattedNumber.startsWith("whatsapp:")) {
        formattedNumber = `whatsapp:${formattedNumber}`;
      }

      const payload = {
        twilio_account_sid: accountSid.trim(),
        twilio_auth_token: authToken.trim(),
        twilio_whatsapp_number: formattedNumber,
      };

      const result = await updateTwilioConfigSQL(entrepriseId, payload);

      if (!result.success) throw new Error(result.error);

      alert("✅ Configuration Twilio enregistrée avec succès !");
    } catch (err) {
      console.error(err);
      alert("❌ Impossible de sauvegarder la configuration.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse flex space-x-4">
        <div className="flex-1 space-y-4 py-1">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {/* SID du compte */}
      <div>
        <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
          Account SID
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

      {/* Auth Token */}
      <div>
        <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
          Auth Token
        </label>
        <div className="relative">
          <input
            type={showToken ? "text" : "password"}
            value={authToken}
            onChange={(e) => setAuthToken(e.target.value)}
            placeholder="Votre Auth Token secret"
            className="w-full text-sm px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all pr-24"
            required
          />
          <button
            type="button"
            onClick={() => setShowToken(!showToken)}
            className="absolute inset-y-0 right-0 px-4 text-xs font-medium text-gray-500 hover:text-gray-700"
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
          className="inline-flex items-center justify-center bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm py-2 px-4 rounded-lg transition-colors shadow-sm disabled:opacity-70"
        >
          {saving ? "Enregistrement..." : "Sauvegarder"}
        </button>
      </div>
    </form>
  );
}
