import { NextResponse } from "next/server";
import pool from "../../../lib/db"; // Pour vérifier que la DB est bien connectée !

export async function GET() {
  try {
    // Petit test pour s'assurer que l'app parle bien à la DB
    await pool.query("SELECT 1");
    return NextResponse.json(
      { status: "OK", database: "Connected" },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json(
      { status: "ERROR", database: "Disconnected" },
      { status: 500 },
    );
  }
}
