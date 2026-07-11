import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import fs from "fs";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "Aucun fichier reçu." },
        { status: 400 },
      );
    }

    // Transformer le fichier en buffer lisible par NodeJS
    const buffer = Buffer.from(await file.arrayBuffer());
    const filename = file.name.replaceAll(" ", "_");

    // Définir le chemin vers le dossier public/uploads/factures de Next.js
    const uploadDir = path.join(process.cwd(), "public", "uploads", "factures");

    // Créer le dossier s'il n'existe pas encore
    if (!fs.existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    // Écrire le fichier sur le disque
    const filePath = path.join(uploadDir, filename);
    await writeFile(filePath, buffer);

    // L'URL publique sera accessible directement depuis ton nom de domaine / localhost
    const publicUrl = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/uploads/factures/${filename}`;

    return NextResponse.json({ success: true, publicUrl });
  } catch (error) {
    console.error("Erreur d'upload local :", error);
    return NextResponse.json(
      { error: "Erreur serveur lors de l'upload." },
      { status: 500 },
    );
  }
}
