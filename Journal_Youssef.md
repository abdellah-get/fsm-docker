# JOURNAL DE BORD – STAGE WELANCE Ouchen Youssef

**Période concernée :** 06 Juillet

---

## 1. Réalisations

- Finalisation complète du **Jalon 0**.
- Configuration de l'espace de travail sous **VS Code** et synchronisation avec **GitHub**.
- Prise d'avance sur le planning : conteneurisation réussie de l'application **Next.js** à l'aide de **Docker** et **Docker Compose**.

## 2. Difficultés techniques rencontrées

Les points suivants ont constitué des freins temporaires au cours de la session :

| Problème rencontré           | Description                                                                                                  |
| :--------------------------- | :----------------------------------------------------------------------------------------------------------- |
| **Conflit de conteneur**     | Un ancien conteneur était toujours actif et entrait en conflit avec la nouvelle instance.                    |
| **Erreur de dossier racine** | Un mauvais paramétrage du dossier racine dans VS Code a perturbé l'exécution des commandes Git et du projet. |

## 3. Prochaines étapes

- Ouvrir une **Pull Request** pour permettre à mon binôme (Abdellah) de consulter et valider le travail effectué.
- Transmettre le **bilan de fin de Jalon 0** à notre encadrant.

## 4. Temps investi

- **Durée totale :** 3 heures.

| Problème rencontré           | Description                                                                                                  |
| :--------------------------- | :----------------------------------------------------------------------------------------------------------- |
| **Conflit de conteneur**     | Un ancien conteneur était toujours actif et entrait en conflit avec la nouvelle instance.                    |
| **Erreur de dossier racine** | Un mauvais paramétrage du dossier racine dans VS Code a perturbé l'exécution des commandes Git et du projet. |

## 3. Prochaines étapes

- Ouvrir une **Pull Request** pour permettre à mon binôme Abdellah de consulter et valider le travail effectué.
- Transmettre le **bilan de fin de Jalon 0** à notre encadrant.

## 4. Temps investi

- **Durée totale :** 3 heures.

# Journal de Bord – Jalon 0 (Période du 05 au 06 Juillet)

## 1. Objectif du sprint

Préparer le socle technique et organisationnel : configuration des environnements, définition des rituels d'équipe et sélection de l'application support du projet (fil rouge).

## 2. Travaux réalisés

- **Environnement de développement** : Installation et paramétrage de Git et VS Code.
- **Application cible** : Choix et initialisation d'une application web Next.js. Le code est versionné sur GitHub et pleinement opérationnel en local via Docker.

## 3. Preuves et critères de validation

- **Dépôt source** : [https://github.com/abdellah-get/fsm-docker.git](https://github.com/abdellah-get/fsm-docker.git)

## 4. Incidents techniques et correctifs

| Problème rencontré                | Solution apportée                                                     |
| :-------------------------------- | :-------------------------------------------------------------------- |
| Échec de connexion à l'API Docker | Redémarrage de Docker Desktop.                                        |
| Conflit avec un ancien conteneur  | Nettoyage des ressources via la commande `docker-compose down`.       |
| Git non détecté dans VS Code      | Réouverture du projet depuis le bon répertoire racine (`fsm-docker`). |

## 5. Points d'attention et questions en suspens

Aucun blocage ou question ouverte à ce stade.

## 6. Temps investi et prochaines étapes

- **Charge estimée** : 3 heures.

## prochaines étapes

- **Suite du planning** : Démarrage du Jalon 1 avec mon binôme en respectant notre système de Pull Requests.

# Compte rendu -- 07 Juillet

## Ce que j'ai fait

J'ai bien avancé sur le **Jalon 1** en travaillant sur une branche
dédiée (`feat/jalon1`) selon le Git Flow. J'ai développé une
route API `/health` avec Next.js, vérifié le contenu du `.gitignore`
afin d'éviter le versionnement de fichiers sensibles, puis amélioré le
`README.md` pour faciliter le lancement du projet avec Docker. Enfin,
j'ai ouvert une Pull Request pour proposer mes modifications.

## Ce qui me bloque

Aucun blocage majeur. En revanche, ESLint a signalé plusieurs problèmes
courants dans le projet existant, notamment des variables déclarées mais
inutilisées, des imports non utilisés et quelques avertissements liés au
formatage du code. Un nettoyage est nécessaire avant de finaliser le
jalon.

## Ce que je vais faire ensuite

Corriger les remarques d'ESLint (avec `--fix` lorsque c'est possible),
ajouter un commit de correction sur ma branche, puis demander à mon
binôme Yousef de relire et valider la Pull Request.

**Temps passé :** 2h

# Bilan du Jalon 1 : Fondations Git et qualité du code

**Période :** du 07 Juillet au 08 Juillet

## Objectif

Mettre en place un environnement de développement collaboratif avec Git,
préparer une base de projet propre et intégrer un contrôle de la qualité
du code.

## Réalisations

- Création d'une route `/api/health` fonctionnelle.
- Mise à jour du `README.md` avec les étapes de lancement via Docker.
- Vérification du `.gitignore`.
- Configuration et exécution d'ESLint.
- Respect du Git Flow avec un développement sur une branche dédiée.

## Preuves

- Dépôt GitHub : https://github.com/abdellah-get/fsm-docker.git
- Pull Request : #11
- Capture d'écran du GitHub Board transmise à l'encadrant.

## Critères validés

- Aucun push direct sur `main`.
- Historique des commits clair.
- Projet lançable en suivant le `README`.
- Tableau de bord mis à jour.

## Difficultés rencontrées et solutions

- VS Code affichait une erreur liée aux types de Next.js
  (`Cannot find module 'next/server'`). Le problème a été résolu après
  l'installation des dépendances avec `npm install` et le redémarrage
  du serveur TypeScript.
- ESLint a détecté plusieurs erreurs fréquentes (imports inutilisés,
  variables non utilisées et problèmes de mise en forme). Une
  correction automatique suivie d'une vérification manuelle a permis
  de résoudre ces points.

## Questions en attente

Aucune.

## Temps passé et prochaines étapes

**Temps passé :** 3h

La prochaine étape consiste à préparer les tâches du **Jalon 2**, les
ajouter au GitHub Board et commencer le développement sur une nouvelle
branche.

# Compte rendu -- 08 Juillet

**Période concernée :** 08 Juillet

---

## 1. Réalisations

- Optimisation du **Dockerfile** de l'application Next.js (Field Service Management) pour la production :
  - Mise en place d'un **build multi‑étapes** (séparation construction / exécution).
  - Utilisation d'une image de base `node:20-alpine` pour réduire la taille.
  - Limitation des dépendances installées (`npm ci --only=production`) dans l'image finale.
  - Activation du mode **standalone** de Next.js pour une image encore plus légère (< 100 Mo).
- Création et enrichissement du fichier **`.dockerignore`** pour exclure `node_modules`, `.next`, `.env`, et les fichiers inutiles du contexte de build.
- Mise à jour du fichier **`docker-compose.yml`** :

## 2. Difficultés techniques rencontrées

- **Aucune difficulté technique notable pour le moment.**  
  Les modifications apportées (Dockerfile, .dockerignore, docker-compose) se sont déroulées sans erreur bloquante.

## 3. Prochaines étapes

- **Construire l’image Docker de production** à l’aide du Dockerfile optimisé (`docker build -t fsm-app:light .`).
- **Lancer l’environnement complet** avec `docker compose up` pour valider le dialogue entre les services (app + base de données).
- Partager le travail avec mon binôme Abdellah via une **Pull Request**.
- Préparer le **bilan du Jalon 2** pour notre encadrant.

## 4. Temps investi

- **Durée totale :** 3 heures.
