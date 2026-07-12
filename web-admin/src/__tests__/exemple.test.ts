// web-admin/src/__tests__/exemple.test.ts
import { expect, test, describe } from "vitest";
import { calculerPrixTTC } from "../utils/calculs";

describe("Tests de la logique métier (Jalon 3)", () => {
  test("Calcule correctement le prix TTC avec la TVA par défaut (20%)", () => {
    const resultat = calculerPrixTTC(100);
    expect(resultat).toBe(120);
  });

  test("Calcule correctement avec une TVA spécifique (10%)", () => {
    const resultat = calculerPrixTTC(100, 0.1);
    expect(resultat).toBe(110);
  });
});
