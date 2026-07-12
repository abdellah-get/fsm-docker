// web-admin/src/utils/calculs.ts

export function calculerPrixTTC(prixHT: number, tva: number = 0.2): number {
  return prixHT + prixHT * tva;
}
