import type { Metadata } from "next";
import "./globals.css"; // Assure-toi d'importer ton CSS global ici si tu en as un

export const metadata: Metadata = {
  title: "SaaS FSM Maroc - Espace Gérant",
  description: "Plateforme de gestion centralisée",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body>
        {/* Le paramètre children injectera automatiquement tes pages (login, dashboard...) ici */}
        {children}
      </body>
    </html>
  );
}
