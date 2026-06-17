"use client";

import { PDFDownloadLink } from "@react-pdf/renderer";
import { InvoiceTemplate, InvoiceData } from "../pdf/InvoiceTemplate";

// Interfaces de la base de données
export interface ClientJointure {
  nom_complet: string;
  adresse_geographique: string;
}

export interface InterventionJointure {
  titre: string;
  clients: ClientJointure | null;
}

export interface FactureDbRow {
  id: string;
  montant_ht: number;
  montant_ttc: number;
  statut: string;
  created_at: string;
  interventions: InterventionJointure | null;
}

interface RecentInvoicesTableProps {
  invoices: FactureDbRow[];
}

export default function RecentInvoicesTable({
  invoices,
}: RecentInvoicesTableProps) {
  // La logique de conversion est maintenant encapsulée ici
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
                  <PDFDownloadLink
                    document={<InvoiceTemplate invoiceData={pdfData} />}
                    fileName={`Facture_${pdfData.invoiceNumber}.pdf`}
                    className="inline-flex items-center gap-1.5 text-xs bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium py-1.5 px-3 rounded-md transition-colors shadow-sm"
                  >
                    {({ loading }) =>
                      loading ? "Calcul..." : "Télécharger PDF"
                    }
                  </PDFDownloadLink>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
