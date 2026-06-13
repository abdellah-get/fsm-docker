import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

// 1. DÉFINITION DES TYPES (Le contrat de données pro)
export interface InvoiceItem {
  description: string;
  quantity: number;
  priceHT: number;
}

export interface InvoiceData {
  invoiceNumber: string;
  date: string;
  clientName: string;
  clientAddress: string;
  clientICE?: string; // Le "?" signifie que ce champ est optionnel
  items: InvoiceItem[];
  totalHT: number;
  tva: number;
  totalTTC: number;
}

interface InvoiceTemplateProps {
  invoiceData: InvoiceData;
}

// 2. STYLES DU PDF
const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 12, fontFamily: "Helvetica" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 40,
  },
  title: { fontSize: 24, fontWeight: "bold" },
  companyInfo: { fontSize: 10, color: "#4b5563", lineHeight: 1.5 },
  clientInfo: {
    marginTop: 20,
    padding: 10,
    backgroundColor: "#f3f4f6",
    borderRadius: 4,
  },
  table: { width: "100%", marginTop: 30, border: "1pt solid #e5e7eb" },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f9fafb",
    borderBottom: "1pt solid #e5e7eb",
    padding: 8,
    fontWeight: "bold",
  },
  tableRow: {
    flexDirection: "row",
    borderBottom: "1pt solid #e5e7eb",
    padding: 8,
  },
  col1: { width: "50%" },
  col2: { width: "20%", textAlign: "center" },
  col3: { width: "30%", textAlign: "right" },
  totals: { marginTop: 20, alignItems: "flex-end" },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "40%",
    paddingVertical: 4,
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: "center",
    fontSize: 8,
    color: "#9ca3af",
    borderTop: "1pt solid #e5e7eb",
    paddingTop: 10,
  },
});

// 3. COMPOSANT (On remplace les "any" par nos interfaces propres)
export const InvoiceTemplate = ({ invoiceData }: InvoiceTemplateProps) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* En-tête : Logo et Numéro de facture */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>FACTURE</Text>
          <Text style={{ marginTop: 8 }}>N° : {invoiceData.invoiceNumber}</Text>
          <Text>Date : {invoiceData.date}</Text>
        </View>
        <View style={{ textAlign: "right" }}>
          <Text style={{ fontWeight: "bold", fontSize: 14 }}>
            MON ENTREPRISE S.A.R.L
          </Text>
          <Text style={styles.companyInfo}>
            123 Boulevard Hassan II, Casablanca
          </Text>
          <Text style={styles.companyInfo}>Tél: +212 6 00 00 00 00</Text>
        </View>
      </View>

      {/* Informations du client */}
      <View style={styles.clientInfo}>
        <Text style={{ fontWeight: "bold", marginBottom: 4 }}>Facturé à :</Text>
        <Text>{invoiceData.clientName}</Text>
        <Text>{invoiceData.clientAddress}</Text>
        <Text>ICE Client : {invoiceData.clientICE || "Non renseigné"}</Text>
      </View>

      {/* Tableau des articles */}
      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={styles.col1}>Désignation</Text>
          <Text style={styles.col2}>Qté</Text>
          <Text style={styles.col3}>Prix Unitaire HT</Text>
        </View>

        {/* Typage implicite : grâce à notre interface, map sait déjà que "item" est un InvoiceItem */}
        {invoiceData.items.map((item, index) => (
          <View style={styles.tableRow} key={index}>
            <Text style={styles.col1}>{item.description}</Text>
            <Text style={styles.col2}>{item.quantity}</Text>
            <Text style={styles.col3}>{item.priceHT} MAD</Text>
          </View>
        ))}
      </View>

      {/* Totaux */}
      <View style={styles.totals}>
        <View style={styles.totalRow}>
          <Text>Total HT :</Text>
          <Text>{invoiceData.totalHT} MAD</Text>
        </View>
        <View style={styles.totalRow}>
          <Text>TVA (20%) :</Text>
          <Text>{invoiceData.tva} MAD</Text>
        </View>
        <View
          style={[
            styles.totalRow,
            {
              fontWeight: "bold",
              borderTop: "1pt solid #000",
              marginTop: 4,
              paddingTop: 4,
            },
          ]}
        >
          <Text>Total TTC :</Text>
          <Text>{invoiceData.totalTTC} MAD</Text>
        </View>
      </View>

      {/* Pied de page obligatoire DGI */}
      <View style={styles.footer}>
        <Text>MON ENTREPRISE S.A.R.L au capital de 100 000 MAD</Text>
        <Text>
          ICE : 000000000000000 | IF : 0000000 | RC : 00000 | Patente : 00000000
        </Text>
      </View>
    </Page>
  </Document>
);
