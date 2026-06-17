import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

// 1. DÉFINITION DES TYPES
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
  clientICE?: string;
  items: InvoiceItem[];
  totalHT: number;
  tva: number;
  totalTTC: number;
}

interface InvoiceTemplateProps {
  invoiceData: InvoiceData;
}

// 2. STYLES DU PDF (Optimisés pour @react-pdf/renderer)
// Note d'expert : Les propriétés raccourcies comme `border: "1pt solid #xxx"`
// provoquent souvent des crashs silencieux. Il faut les décomposer.
const styles = StyleSheet.create({
  page: {
    padding: 45,
    fontSize: 10, // 10pt est plus élégant et professionnel pour une facture
    fontFamily: "Helvetica",
    color: "#1f2937",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 35,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
    paddingBottom: 20,
  },
  title: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    color: "#0f172a",
    letterSpacing: 0.5,
  },
  metaText: {
    marginTop: 6,
    fontSize: 9,
    color: "#4b5563",
  },
  companyName: {
    fontFamily: "Helvetica-Bold",
    fontSize: 12,
    color: "#1e3a8a", // Une touche de bleu corporatif
    textAlign: "right",
  },
  companyInfo: {
    fontSize: 9,
    color: "#4b5563",
    lineHeight: 1.4,
    textAlign: "right",
    marginTop: 4,
  },
  clientBlock: {
    marginTop: 10,
    marginBottom: 30,
    padding: 12,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "#e2e8f0",
    borderRadius: 6,
  },
  clientTitle: {
    fontFamily: "Helvetica-Bold",
    color: "#475569",
    marginBottom: 6,
    fontSize: 9,
    textTransform: "uppercase",
  },
  clientText: {
    lineHeight: 1.4,
    color: "#0f172a",
  },
  // Structure du tableau
  table: {
    width: "100%",
    marginTop: 10,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "#e2e8f0",
    borderRadius: 4,
    overflow: "hidden",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f1f5f9",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    padding: 8,
    fontFamily: "Helvetica-Bold",
    color: "#334155",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    padding: 8,
    alignItems: "center",
  },
  // Alignements des colonnes (Totalisant 100%)
  colDescription: { width: "45%" },
  colQty: { width: "10%", textAlign: "center" },
  colPrice: { width: "20%", textAlign: "right" },
  colTotal: { width: "25%", textAlign: "right" },

  // Section des calculs finaux
  totalsContainer: {
    marginTop: 25,
    alignItems: "flex-end",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "45%",
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  totalRowFinal: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "45%",
    paddingVertical: 8,
    marginTop: 4,
    borderTopWidth: 1.5,
    borderTopColor: "#0f172a",
    fontFamily: "Helvetica-Bold",
    fontSize: 11,
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 45,
    right: 45,
    textAlign: "center",
    fontSize: 7.5,
    color: "#64748b",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingTop: 12,
    lineHeight: 1.4,
  },
});

// 3. COMPOSANT COMPATIBLE PRODUCTION
export const InvoiceTemplate = ({ invoiceData }: InvoiceTemplateProps) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* En-tête : Émetteur vs Titre */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>FACTURE</Text>
          <Text style={styles.metaText}>Réf : {invoiceData.invoiceNumber}</Text>
          <Text style={styles.metaText}>
            Date émission : {invoiceData.date}
          </Text>
        </View>
        <View>
          <Text style={styles.companyName}>MON ENTREPRISE S.A.R.L</Text>
          <Text style={styles.companyInfo}>
            123 Boulevard Hassan II, Casablanca
          </Text>
          <Text style={styles.companyInfo}>
            Contact : contact@monentreprise.ma
          </Text>
          <Text style={styles.companyInfo}>Tél : +212 5 22 00 00 00</Text>
        </View>
      </View>

      {/* Informations Client */}
      <View style={styles.clientBlock}>
        <Text style={styles.clientTitle}>Déstinataire</Text>
        <Text
          style={[
            styles.clientText,
            { fontFamily: "Helvetica-Bold", marginBottom: 2 },
          ]}
        >
          {invoiceData.clientName}
        </Text>
        <Text style={styles.clientText}>{invoiceData.clientAddress}</Text>
        {invoiceData.clientICE && (
          <Text
            style={[
              styles.clientText,
              { marginTop: 4, color: "#475569", fontSize: 9 },
            ]}
          >
            ICE : {invoiceData.clientICE}
          </Text>
        )}
      </View>

      {/* Tableau des prestations */}
      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={styles.colDescription}>Désignation</Text>
          <Text style={styles.colQty}>Qté</Text>
          <Text style={styles.colPrice}>P.U HT</Text>
          <Text style={styles.colTotal}>Montant HT</Text>
        </View>

        {invoiceData.items.map((item, index) => {
          const rowTotal = item.quantity * item.priceHT;
          return (
            <View style={styles.tableRow} key={index}>
              <Text style={styles.colDescription}>{item.description}</Text>
              <Text style={styles.colQty}>{item.quantity}</Text>
              <Text style={styles.colPrice}>
                {item.priceHT.toLocaleString("fr-MA")} MAD
              </Text>
              <Text style={styles.colTotal}>
                {rowTotal.toLocaleString("fr-MA")} MAD
              </Text>
            </View>
          );
        })}
      </View>

      {/* Bloc de Clôture Financière */}
      <View style={styles.totalsContainer}>
        <View style={styles.totalRow}>
          <Text style={{ color: "#64748b" }}>Total Global HT</Text>
          <Text>{invoiceData.totalHT.toLocaleString("fr-MA")} MAD</Text>
        </View>
        <View style={styles.totalRow}>
          <Text style={{ color: "#64748b" }}>TVA (20%)</Text>
          <Text>{invoiceData.tva.toLocaleString("fr-MA")} MAD</Text>
        </View>
        <View style={styles.totalRowFinal}>
          <Text>NET À PAYER TTC</Text>
          <Text>{invoiceData.totalTTC.toLocaleString("fr-MA")} MAD</Text>
        </View>
      </View>

      {/* Mention Légale Obligatoire Maroc (DGI) */}
      <View style={styles.footer}>
        <Text>MON ENTREPRISE S.A.R.L au capital de 100 000 MAD</Text>
        <Text>
          ICE : 000000000000000 | Identifiant Fiscal : 0000000 | RC : 00000
          Casablanca | Patente : 00000000
        </Text>
        <Text style={{ marginTop: 4, fontSize: 6.5, color: "#94a3b8" }}>
          Généré automatiquement par le système de gestion technique interne.
        </Text>
      </View>
    </Page>
  </Document>
);
