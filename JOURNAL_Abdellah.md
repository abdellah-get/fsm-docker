# JOURNAL DE BORD - STAGE WELANCE (Abdellah ANECLOUB)

## Le 06 Juillet

- **Ce que j'ai fait :** Finalisation du Jalon 0. J'ai configuré l'espace de travail sur VS Code et GitHub. J'ai pris de l'avance en réussissant à conteneuriser notre application Next.js avec Docker et Docker Compose.
- **Ce qui me bloque :** Plus rien ! J'ai eu quelques soucis techniques aujourd'hui (le moteur Docker qui n'était pas allumé, un conflit avec un ancien conteneur, et un problème de dossier racine dans VS Code), mais j'ai tout résolu.
- **Ce que je vais faire ensuite :** Faire une Pull Request pour que mon binôme Yousef consulte le travail, et envoyer le bilan de fin de Jalon 0 à notre encadrant.
- **Temps passé :** 2h

---

## Bilan du jalon 0 : Prise en main et cadrage

- **Dates :** du 05 Juillet au 06 Juillet
- **Objectif rappelé en une phrase :** Préparer l'environnement de travail, définir les rituels et choisir l'application fil rouge.
- **Ce que j'ai réalisé :** Outils installés et configurés (Git, VS Code). L'application web (Next.js) est choisie, poussée sur GitHub et déjà fonctionnelle sous Docker. Le board Kanban est en place.
- **Preuves :** https://github.com/abdellah-get/fsm-docker.git
- **Critères validés :** Outils installés et fonctionnels, dépôt/board/journal créés, application validée et prête à être développée. Engagement sur le rythme de suivi validé.
- **Difficultés rencontrées et solutions :** - Erreur de connexion API Docker : résolue en démarrant Docker Desktop.
  - Conflit de nom de conteneur : résolu en nettoyant avec `docker-compose down`.
  - Problème Git dans VS Code : résolu en ouvrant le bon dossier racine (`fsm-docker`).
- **Questions en attente :** Aucune pour le moment.
- **Temps passé et prochaines étapes :** 2 heures. Prochaine étape : Entamer le Jalon 1 avec mon binôme en respectant notre système de Pull Requests.

Le 07 Juillet
Ce que j'ai fait : Début et avancée majeure sur le Jalon 1. J'ai utilisé le Git Flow en créant une branche dédiée (feat/jalon1-fondations). J'ai codé une route API /health sous Next.js, vérifié la sécurité du .gitignore, et réécrit complètement le README.md pour que n'importe qui puisse lancer le projet via Docker. Enfin, j'ai ouvert ma Pull Request.

Ce qui me bloque : Rien de bloquant, mais un petit chantier en vue : l'outil d'analyse de code (ESLint) m'a sorti une quarantaine d'erreurs de syntaxe et de variables non utilisées dans l'ancien code. Je dois nettoyer ça avant de clôturer définitivement le jalon.

Ce que je vais faire ensuite : Corriger les erreurs de linting (notamment avec --fix), rajouter un commit de correction sur ma branche, puis demander à mon binôme Yousef de valider et de "Merge" la PR.

Temps passé : 2h30

Bilan du jalon 1 : Fondations Git et qualité de code
Dates : du 07 Juillet au 08 Juillet

Objectif rappelé en une phrase : Mettre en place un environnement de travail propre en équipe via Git (branches, pull requests), configurer une base d'application saine et intégrer une vérification de la qualité du code.

Ce que j'ai réalisé : Implémentation d'une route /api/health fonctionnelle. Mise à jour du README.md pour expliquer le lancement via Docker. Vérification du .gitignore pour protéger les variables d'environnement. Mise en place et test du linter (ESLint). Utilisation stricte des branches pour coder sans toucher au main.

Preuves : - Lien du dépôt : https://github.com/abdellah-get/fsm-docker.git

Lien de la Pull Request : https://github.com/abdellah-get/fsm-docker/pull/10

Capture d'écran du board GitHub envoyée à l'encadrant.

Critères validés : Zéro push direct sur la branche principale, historique de commits lisible, projet lançable uniquement avec le README, et tableau de bord mis à jour avec les futures tâches.

Difficultés rencontrées et solutions : - Erreur VS Code sur TypeScript (Cannot find module 'next/server') à cause de Docker : résolue en installant les dépendances localement (npm install) et en redémarrant le serveur TS de l'éditeur.

Beaucoup d'erreurs remontées par le linter (apostrophes non échappées en JSX, hooks React mal placés) : analyse comprise, stratégie de correction automatique et manuelle mise en place.

Questions en attente : Aucune pour le moment.

Temps passé et prochaines étapes : 2h30. Prochaine étape : Découper les tâches du Jalon 2, les ajouter au Board, et commencer le développement sur une nouvelle branche fraîche.
