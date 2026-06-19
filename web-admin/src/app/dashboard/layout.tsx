"use client";

import { ReactNode, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "../../utils/supabase/client";
import {
  LayoutDashboard,
  FileText,
  Users,
  Settings,
  Building2,
  LogOut,
  ClipboardList,
  Loader2,
} from "lucide-react";
import Button from "../../components/ui/Button";
import ThemeToggle from "../../components/ui/ThemeToggle";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  // --- ÉTATS SÉCURITÉ & PROFIL ---
  const [role, setRole] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);

  // --- SÉCURISATION ET ROUTE GUARD ---
  useEffect(() => {
    const checkAccess = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          router.push("/login");
          return;
        }

        const { data: profile, error } = await supabase
          .from("utilisateurs")
          .select("role, nom_complet")
          .eq("id", session.user.id)
          .single();

        if (error || !profile) {
          router.push("/login");
          return;
        }

        setRole(profile.role);
        setUserName(profile.nom_complet || "");

        if (profile.role === "TECHNICIEN") {
          const routesAutorisees = [
            "/dashboard/mes-interventions",
            "/dashboard/parametres",
          ];

          if (!routesAutorisees.includes(pathname)) {
            router.push("/dashboard/mes-interventions");
            return;
          }
        }
      } catch (err) {
        console.error("Erreur contrôle d'accès layout :", err);
        router.push("/login");
      } finally {
        setLoading(false);
      }
    };

    checkAccess();
  }, [pathname, router, supabase]);

  // Gestion de la déconnexion
  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      router.refresh();
      router.push("/login");
    } catch (error) {
      console.error("Erreur lors de la déconnexion :", error);
    }
  };

  // Helper styles onglets
  const getNavLinkClass = (path: string) => {
    const baseClass =
      "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all font-medium text-sm";
    const activeClass =
      "bg-emerald-50 text-emerald-700 border border-emerald-100/50 shadow-sm dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800/50";
    const inactiveClass =
      "text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-dark-700 dark:hover:text-gray-100";

    return `${baseClass} ${pathname === path ? activeClass : inactiveClass}`;
  };

  // ⏳ Écran de chargement
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-dark-900">
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600 dark:text-emerald-400 mx-auto" />
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Validation des accès sécurisés...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-dark-900 text-gray-900 dark:text-gray-100 font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-white dark:bg-dark-800 border-r border-gray-200 dark:border-dark-700 flex flex-col">
        {/* Branding Logo */}
        <div className="h-16 flex items-center px-6 border-b border-gray-200 dark:border-dark-700">
          <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400 tracking-tight">
            SaaS FSM Maroc
          </span>
        </div>

        {/* Navigation Principale */}
        <nav className="flex-1 px-4 py-6 space-y-1.5">
          {role === "GERANT" && (
            <>
              <Link href="/dashboard" className={getNavLinkClass("/dashboard")}>
                <LayoutDashboard size={18} />
                Tableau de bord
              </Link>

              <Link
                href="/dashboard/interventions"
                className={getNavLinkClass("/dashboard/interventions")}
              >
                <FileText size={18} />
                Interventions
              </Link>

              <Link
                href="/dashboard/factures"
                className={getNavLinkClass("/dashboard/factures")}
              >
                <Building2 size={18} />
                Facturation DGI
              </Link>

              <Link
                href="/dashboard/clients"
                className={getNavLinkClass("/dashboard/clients")}
              >
                <Users size={18} />
                Clients
              </Link>

              <Link
                href="/dashboard/equipe"
                className={getNavLinkClass("/dashboard/equipe")}
              >
                <Users size={18} />
                Équipe
              </Link>
            </>
          )}

          {role === "TECHNICIEN" && (
            <Link
              href="/dashboard/mes-interventions"
              className={getNavLinkClass("/dashboard/mes-interventions")}
            >
              <ClipboardList size={18} />
              Mon Planning
            </Link>
          )}
        </nav>

        {/* Pied de la Sidebar */}
        <div className="p-4 border-t border-gray-200 dark:border-dark-700 space-y-1">
          <Link
            href="/dashboard/parametres"
            className={getNavLinkClass("/dashboard/parametres")}
          >
            <Settings size={18} />
            Paramètres
          </Link>

          <Button
            onClick={handleLogout}
            variant="danger"
            className="w-full justify-start px-3 py-2.5 text-sm font-medium"
          >
            <LogOut size={18} />
            Déconnexion
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white dark:bg-dark-800 border-b border-gray-200 dark:border-dark-700 flex items-center justify-between px-8">
          <h1 className="text-base font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
            {role === "TECHNICIEN"
              ? "Espace Terrain Technicien"
              : "Espace Direction Gérant"}
          </h1>

          <div className="flex items-center gap-4">
            <ThemeToggle />

            <span className="text-base font-medium text-gray-800 dark:text-gray-200">
              {userName}
            </span>
            <div className="w-9 h-9 bg-emerald-600 dark:bg-emerald-500 text-white rounded-full flex items-center justify-center font-bold text-sm shadow-sm uppercase">
              {role === "TECHNICIEN" ? "T" : "G"}
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-8 bg-gray-50/50 dark:bg-dark-900/50">
          {children}
        </div>
      </main>
    </div>
  );
}
