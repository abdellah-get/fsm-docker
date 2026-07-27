import { NextResponse } from "next/server";
import client from "prom-client";

// Force Next.js à exécuter la route dynamiquement à chaque scraping (indispensable en prod)
export const dynamic = "force-dynamic";

// Initialisation unique pour éviter les erreurs lors des rechargements (Hot Reload)
const globalForPrometheus = globalThis as unknown as {
  prometheusInitialized?: boolean;
};

if (!globalForPrometheus.prometheusInitialized) {
  client.collectDefaultMetrics({ prefix: "fsm_web_admin_" });
  globalForPrometheus.prometheusInitialized = true;
}

export async function GET() {
  try {
    const metrics = await client.register.metrics();
    return new Response(metrics, {
      status: 200,
      headers: {
        "Content-Type": client.register.contentType,
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Erreur lors de la récupération des métriques" },
      { status: 500 },
    );
  }
}
