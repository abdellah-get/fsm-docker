import { NextResponse } from "next/server";

export function middleware() {
  // Laisse passer toutes les requêtes sans rien bloquer
  return NextResponse.next();
}
