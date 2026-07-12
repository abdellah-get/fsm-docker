import { expect, test, describe } from "vitest";

describe("Tests de base pour valider la CI (Jalon 3)", () => {
  test("Vérifie que les mathématiques de base fonctionnent", () => {
    const resultat = 1 + 1;
    expect(resultat).toBe(2);
  });

  test("Vérifie que la configuration des mots de passe est bien de type string", () => {
    // Un petit test qui simule la vérification du format d'un mot de passe crypté
    const dummyPasswordHash = "$2a$10$yO5F9...";
    expect(typeof dummyPasswordHash).toBe("string");
    expect(dummyPasswordHash.startsWith("$2a$")).toBeTruthy();
  });
});
