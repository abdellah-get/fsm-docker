// web-admin/src/app/api/role/route.ts
import { NextResponse } from "next/server";
import pool from "../../../lib/db"; // 👈 Ajuste le chemin vers lib/db.ts

export async function GET(request: Request) {
  // On récupère l'ID de l'utilisateur depuis l'URL
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ role: null }, { status: 400 });
  }

  try {
    const { rows } = await pool.query(
      "SELECT role FROM utilisateurs WHERE id = $1",
      [userId],
    );
    return NextResponse.json({ role: rows[0]?.role || null });
  } catch (error) {
    console.error("Erreur API Role :", error);
    return NextResponse.json({ role: null }, { status: 500 });
  }
}
