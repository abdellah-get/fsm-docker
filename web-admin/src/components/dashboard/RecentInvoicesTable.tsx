"use client";

import { PDFDownloadLink, pdf } from "@react-pdf/renderer";
import { InvoiceTemplate, InvoiceData } from "../pdf/InvoiceTemplate";
import { createClient } from "../../utils/supabase/client";

// Interfaces de la base de données
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

// Fonction de formatage automatique du numéro au format international (+212...)
const formatTelephoneMaroc = (tel: string | undefined): string => {
  if (!tel) return "+212600000000";

  // Enlever les espaces, points ou tirets éventuels
  let cleaned = tel.replace(/[\s.-]/g, "");

  // Si le numéro commence par un 0 (ex: 0612345678)
  if (cleaned.startsWith("0")) {
    cleaned = "+212" + cleaned.substring(1);
  }

  // Si le numéro commence par 212 sans le "+" (ex: 212612345678)
  if (cleaned.startsWith("212") && !cleaned.startsWith("+")) {
    cleaned = "+" + cleaned;
  }

  return cleaned;
};

export default function RecentInvoicesTable({
  invoices,
  onSendWhatsApp,
}: RecentInvoicesTableProps) {
  // Initialisation de Supabase pour le Storage
  const supabase = createClient();

  // 📍 CORRECTION 1 : Plus besoin de passer le timestamp en argument ici
  const handleSendWhatsApp = async (
    fac: FactureDbRow,
    pdfData: InvoiceData,
  ) => {
    try {
      alert("⏳ Préparation du PDF et envoi en cours...");

      // 1. On génère le PDF en arrière-plan sous forme de Blob (fichier)
      const blob = await pdf(
        <InvoiceTemplate invoiceData={pdfData} />,
      ).toBlob();

      // 📍 CORRECTION 2 : On génère le timestamp ici, à l'intérieur de la fonction d'action.
      // Cela évite l'erreur "impure function during render" de React.
      const timestamp = new Date().getTime();
      const fileName = `facture_${pdfData.invoiceNumber}_${timestamp}.pdf`;

      // 📍 CORRECTION 3 : On supprime 'data: uploadData' pour éliminer définitivement l'erreur ESLint / TS(6133)
      const { error: uploadError } = await supabase.storage
        .from("factures")
        .upload(fileName, blob, {
          contentType: "application/pdf",
          upsert: true,
        });

      if (uploadError) {
        console.error("Erreur Upload:", uploadError);
        throw new Error("Impossible de sauvegarder le PDF sur Supabase.");
      }

      // 4. On récupère l'URL publique officielle
      const { data: publicUrlData } = supabase.storage
        .from("factures")
        .getPublicUrl(fileName);

      const lienPdfPublic = publicUrlData.publicUrl;
      console.log("LIEN SUPABASE GÉNÉRÉ :", lienPdfPublic);

      // 5. Récupération dynamique et formatage automatique du téléphone du client
      const numeroBrutDuClient = fac.interventions?.clients?.telephone;
      const telephoneClient = formatTelephoneMaroc(numeroBrutDuClient);
      const montantTTC = pdfData.totalTTC.toString();

      console.log(
        "🚀 Tentative d'envoi WhatsApp vers le numéro formaté :",
        telephoneClient,
      );

      // 6. On déclenche l'envoi !
      await onSendWhatsApp(
        telephoneClient,
        montantTTC,
        lienPdfPublic,
        fac.id,
        fac.entreprise_id,
      );
    } catch (error) {
      console.error(error);
      alert("❌ Une erreur est survenue lors de la préparation de l'envoi.");
    }
  };

  // La logique de conversion
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

                    {/* BOUTON WHATSAPP */}
                    <button
                      onClick={() => handleSendWhatsApp(fac, pdfData)}
                      className="inline-flex items-center gap-1.5 text-xs bg-emerald-600 border border-emerald-600 hover:bg-emerald-700 text-white font-medium py-1.5 px-3 rounded-md transition-colors shadow-sm"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
                      </svg>
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
