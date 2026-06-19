import type { Metadata } from "next";
import "./globals.css";
import ThemeProvider from "../components/providers/ThemeProvider";

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
    <html lang="fr" suppressHydrationWarning>
      <body className="bg-white dark:bg-dark-900 text-gray-900 dark:text-gray-100 transition-colors duration-300">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
