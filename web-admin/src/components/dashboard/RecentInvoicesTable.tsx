"use client";

import { PDFDownloadLink, pdf } from "@react-pdf/renderer";
import { InvoiceTemplate, InvoiceData } from "../pdf/InvoiceTemplate";
// ❌ Supabase a été supprimé ici !

export interface ClientJointure {
  nom_complet: string;
  adresse_geographique: string;
  telephone?: string;
}

export interface InterventionJointure {
  titre: string;
  clients: ClientJointure | null;
}

export interface FactureDbRow {
  id: string;
  entreprise_id: string;
  montant_ht: number;
  montant_ttc: number;
  statut: string;
  created_at: string;
  interventions: InterventionJointure | null;
  url_pdf?: string;
}

interface RecentInvoicesTableProps {
  invoices: FactureDbRow[];
  onSendWhatsApp: (
    telephone: string,
    montant: string,
    lienPdf: string,
    factureId: string,
    entrepriseId: string,
  ) => void;
}

const formatTelephoneMaroc = (tel: string | undefined): string => {
  if (!tel) return "+212600000000";
  let cleaned = tel.replace(/[\s.-]/g, "");
  if (cleaned.startsWith("0")) {
    cleaned = "+212" + cleaned.substring(1);
  }
  if (cleaned.startsWith("212") && !cleaned.startsWith("+")) {
    cleaned = "+" + cleaned;
  }
  return cleaned;
};

export default function RecentInvoicesTable({
  invoices,
  onSendWhatsApp,
}: RecentInvoicesTableProps) {
  const handleSendWhatsApp = async (
    fac: FactureDbRow,
    pdfData: InvoiceData,
  ) => {
    try {
      alert("⏳ Préparation du PDF et sauvegarde locale en cours...");

      // 1. On génère le PDF en arrière-plan sous forme de Blob
      const blob = await pdf(
        <InvoiceTemplate invoiceData={pdfData} />,
      ).toBlob();

      const timestamp = new Date().getTime();
      const fileName = `facture_${pdfData.invoiceNumber}_${timestamp}.pdf`;

      // 2. 📍 NOUVEAU SYSTÈME 100% LOCAL : On envoie le fichier à notre API
      const formData = new FormData();
      formData.append("file", blob, fileName);

      const uploadResponse = await fetch("/api/upload-pdf", {
        method: "POST",
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error("Impossible de sauvegarder le PDF localement.");
      }

      // 3. On récupère l'URL locale générée par notre serveur
      const { publicUrl } = await uploadResponse.json();
      console.log("LIEN LOCAL GÉNÉRÉ :", publicUrl);

      // 4. Formatage du téléphone
      const numeroBrutDuClient = fac.interventions?.clients?.telephone;
      const telephoneClient = formatTelephoneMaroc(numeroBrutDuClient);
      const montantTTC = pdfData.totalTTC.toString();

      console.log(
        "🚀 Tentative d'envoi WhatsApp vers le numéro formaté :",
        telephoneClient,
      );

      // 5. On déclenche l'envoi !
      await onSendWhatsApp(
        telephoneClient,
        montantTTC,
        publicUrl,
        fac.id,
        fac.entreprise_id,
      );
    } catch (error) {
      console.error(error);
      alert("❌ Une erreur est survenue lors de la préparation de l'envoi.");
    }
  };

  const mapFactureToPDF = (facture: FactureDbRow): InvoiceData => {
    const intervention = facture.interventions;
    const client = intervention?.clients;

    return {
      invoiceNumber: `FAC-${facture.id.slice(0, 8).toUpperCase()}`,
      date: new Date(facture.created_at).toLocaleDateString("fr-FR"),
      clientName: client?.nom_complet || "Client Inconnu",
      clientAddress: client?.adresse_geographique || "Non renseignée",
      clientICE: "Non renseigné",
      items: [
        {
          description: intervention?.titre || "Intervention Technique",
          quantity: 1,
          priceHT: Number(facture.montant_ht || 0),
        },
      ],
      totalHT: Number(facture.montant_ht || 0),
      tva: Number(facture.montant_ttc || 0) - Number(facture.montant_ht || 0),
      totalTTC: Number(facture.montant_ttc || 0),
    };
  };

  if (invoices.length === 0) {
    return (
      <p className="p-8 text-gray-500 text-sm text-center">
        Aucune facture trouvée pour votre entreprise.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        {/* ... L'entête de la table reste identique ... */}
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            <th className="p-4">N° Facture</th>
            <th className="p-4">Date</th>
            <th className="p-4">Client</th>
            <th className="p-4">Montant TTC</th>
            <th className="p-4">Statut</th>
            <th className="p-4 text-right">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 text-sm">
          {invoices.map((fac) => {
            const pdfData = mapFactureToPDF(fac);
            return (
              <tr key={fac.id} className="hover:bg-gray-50 transition-colors">
                <td className="p-4 font-medium text-gray-900">
                  {pdfData.invoiceNumber}
                </td>
                <td className="p-4 text-gray-500">
                  {new Date(fac.created_at).toLocaleDateString("fr-FR")}
                </td>
                <td className="p-4 text-gray-600">{pdfData.clientName}</td>
                <td className="p-4 font-semibold text-gray-900">
                  {pdfData.totalTTC.toLocaleString("fr-MA")} MAD
                </td>
                <td className="p-4">
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                      fac.statut === "PAYEE"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-amber-50 text-amber-700 border border-amber-200"
                    }`}
                  >
                    {fac.statut === "PAYEE" ? "Payée" : "En attente"}
                  </span>
                </td>
                <td className="p-4 text-right">
                  <div className="flex justify-end items-center gap-2">
                    <PDFDownloadLink
                      document={<InvoiceTemplate invoiceData={pdfData} />}
                      fileName={`Facture_${pdfData.invoiceNumber}.pdf`}
                      className="inline-flex items-center gap-1.5 text-xs bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium py-1.5 px-3 rounded-md transition-colors shadow-sm"
                    >
                      {({ loading }) =>
                        loading ? "Calcul..." : "Télécharger PDF"
                      }
                    </PDFDownloadLink>
                    <button
                      onClick={() => handleSendWhatsApp(fac, pdfData)}
                      className="inline-flex items-center gap-1.5 text-xs bg-emerald-600 border border-emerald-600 hover:bg-emerald-700 text-white font-medium py-1.5 px-3 rounded-md transition-colors shadow-sm"
                    >
                      WhatsApp
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
