import jsPDF from "jspdf";

interface RapportData {
  id: string;
  date: string;
  titre: string;
  clientNom: string;
  adresse: string;
  compteRendu: string;
  montant: number;
  signatureClientBase64: string;
  signatureTechBase64: string;
}

export const genererBonInterventionPDF = (data: RapportData) => {
  // Création d'un document A4
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  // --- EN-TÊTE ---
  doc.setFontSize(22);
  doc.setTextColor(33, 37, 41);
  doc.text("BON D'INTERVENTION", 105, 20, { align: "center" });

  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Référence : ${data.id.split("-")[0].toUpperCase()}`, 105, 28, {
    align: "center",
  });
  doc.text(`Date de clôture : ${data.date}`, 105, 34, { align: "center" });

  doc.setDrawColor(200, 200, 200);
  doc.line(20, 40, 190, 40);

  // --- INFORMATIONS CLIENT ET MISSION ---
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold");
  doc.text("Détails de l'intervention :", 20, 50);

  doc.setFont("helvetica", "normal");
  doc.text(`Client : ${data.clientNom}`, 20, 60);
  doc.text(`Adresse : ${data.adresse || "Non renseignée"}`, 20, 68);
  doc.text(`Mission : ${data.titre}`, 20, 76);

  doc.setFont("helvetica", "bold");
  doc.text(
    `Montant TTC validé : ${data.montant.toLocaleString("fr-MA")} MAD`,
    20,
    84,
  );

  // --- COMPTE-RENDU ---
  doc.text("Compte-rendu du technicien :", 20, 100);
  doc.setFont("helvetica", "normal");

  // Cette fonction coupe le texte s'il est trop long pour tenir sur une ligne
  const splitCompteRendu = doc.splitTextToSize(
    data.compteRendu || "Aucun compte-rendu saisi.",
    170,
  );
  doc.text(splitCompteRendu, 20, 108);

  // --- SIGNATURES ---
  const signatureY = 160;
  doc.line(20, signatureY - 10, 190, signatureY - 10);

  doc.setFont("helvetica", "bold");
  doc.text("Signature du Client", 45, signatureY, { align: "center" });
  if (data.signatureClientBase64) {
    doc.addImage(data.signatureClientBase64, "PNG", 20, signatureY + 5, 50, 30);
  }

  doc.text("Signature du Technicien", 155, signatureY, { align: "center" });
  if (data.signatureTechBase64) {
    doc.addImage(data.signatureTechBase64, "PNG", 130, signatureY + 5, 50, 30);
  }

  // --- PIED DE PAGE ---
  doc.setFontSize(9);
  doc.setTextColor(150, 150, 150);
  doc.setFont("helvetica", "normal");
  doc.text(
    "Ce document atteste de la réalisation des travaux mentionnés ci-dessus.",
    105,
    280,
    { align: "center" },
  );

  // Téléchargement automatique
  doc.save(`Bon_Intervention_${data.clientNom.replace(/\s+/g, "_")}.pdf`);
};
