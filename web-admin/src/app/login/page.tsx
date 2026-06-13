"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../utils/supabase/client";
import { Lock, Mail, Loader2 } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      // 1. Authentification de l'utilisateur
      const { data: authData, error: authError } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        });

      if (authError || !authData.user) {
        throw new Error("Identifiants incorrects ou utilisateur introuvable.");
      }

      // 2. 💡 PRO FIX : Récupération du rôle dans la table utilisateurs
      const { data: profile, error: profileError } = await supabase
        .from("utilisateurs")
        .select("role")
        .eq("id", authData.user.id)
        .single();

      if (profileError || !profile) {
        throw new Error("Impossible de récupérer le profil utilisateur.");
      }

      // 3. 🔀 Redirection intelligente basée sur le rôle
      router.refresh();

      if (profile.role === "TECHNICIEN") {
        router.push("/dashboard/mes-interventions"); // Redirection vers l'app mobile
      } else {
        router.push("/dashboard"); // Redirection vers l'espace Gérant
      }
    } catch (error: unknown) {
      console.error("Erreur de connexion :", error);

      // On vérifie proprement le type de l'erreur
      if (error instanceof Error) {
        setErrorMsg(error.message);
      } else {
        setErrorMsg("Une erreur est survenue lors de la connexion.");
      }

      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md space-y-8 bg-white p-8 rounded-2xl border border-gray-200 shadow-sm">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-gray-900">
            SaaS FSM Maroc
          </h2>
          <p className="mt-2 text-sm text-gray-500">Portail de Connexion</p>
        </div>

        {errorMsg && (
          <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg text-center">
            {errorMsg}
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          <div className="space-y-4 rounded-md shadow-sm">
            <div>
              <label className="text-sm font-medium text-gray-700">
                Adresse Email
              </label>
              <div className="relative mt-1">
                <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-gray-900 placeholder-gray-400 focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm outline-none"
                  placeholder="email@entreprise.ma"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">
                Mot de passe
              </label>
              <div className="relative mt-1">
                <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-gray-900 placeholder-gray-400 focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm outline-none"
                />
              </div>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative flex w-full justify-center rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50 transition-colors"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                "Se connecter"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
