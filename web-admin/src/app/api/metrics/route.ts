import { NextResponse } from "next/server";
import { register } from "../../../lib/metrics";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const metrics = await register.metrics();
    return new Response(metrics, {
      status: 200,
      headers: {
        "Content-Type": register.contentType,
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
