"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { signIn, getSession } from "next-auth/react"; // 👈 Les nouveaux outils NextAuth
import { Lock, Mail, Building2 } from "lucide-react";
import { Button, Input } from "../../components/ui";

export default function LoginPage() {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const router = useRouter();

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      // 1. Authentification via NextAuth (100% Local)
      // On utilise "credentials" comme défini dans notre route.ts
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false, // On empêche la redirection automatique pour gérer le rôle
      });

      // Si l'API renvoie une erreur (ex: mauvais mot de passe)
      if (res?.error) {
        throw new Error(res.error);
      }

      // 2. Récupération de la session (qui contient maintenant le rôle et l'entreprise !)
      const session = await getSession();

      if (!session || !session.user) {
        throw new Error("Impossible de récupérer la session utilisateur.");
      }

      router.refresh();

      // 3. Redirection basée sur le rôle (récupéré depuis la session NextAuth)
      if (session.user.role === "TECHNICIEN") {
        router.push("/dashboard/mes-interventions");
      } else {
        router.push("/dashboard");
      }
    } catch (error: unknown) {
      console.error("Erreur de connexion :", error);
      setErrorMsg(
        error instanceof Error
          ? error.message
          : "Une erreur est survenue lors de la connexion.",
      );
    } finally {
      setLoading(false); // On s'assure d'arrêter le chargement quoi qu'il arrive
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-dark-900 px-4">
      <div className="w-full max-w-md space-y-8 bg-white dark:bg-dark-800 p-8 rounded-2xl border border-gray-200 dark:border-dark-700 shadow-sm">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center">
              <Building2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
          <h2 className="text-3xl font-extrabold text-gray-900 dark:text-gray-100">
            SaaS FSM Maroc
          </h2>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Portail de Connexion
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-center">
            {errorMsg}
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          <div className="space-y-4">
            <Input
              label="Adresse Email"
              icon={<Mail size={18} />}
              type="email"
              placeholder="email@entreprise.ma"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <Input
              label="Mot de passe"
              icon={<Lock size={18} />}
              type="password"
              placeholder="Votre mot de passe"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            loading={loading}
            className="w-full py-2.5"
          >
            {loading ? "Connexion..." : "Se connecter"}
          </Button>
        </form>
      </div>
    </div>
  );
}
