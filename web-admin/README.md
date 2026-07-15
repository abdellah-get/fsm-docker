# Web Admin - Application SaaS

[![Pipeline CI/CD](https://github.com/abdellah-get/fsm-docker/actions/workflows/ci.yml/badge.svg)](https://github.com/abdellah-get/fsm-docker/actions/workflows/ci.yml)

## Lancer le projet avec Docker

1. Assurez-vous que Docker Desktop est allumé.
2. À la racine du projet (dossier FSM-DOCKER), lancez la commande :
   `docker-compose up --build`
3. Ouvrez votre navigateur à l'adresse : http://localhost:3000
4. Pour vérifier que l'API fonctionne, visitez : http://localhost:3000/api/health

## Procédure de Rollback (Retour arrière)

En cas de problème critique en production suite à une mise à jour (site inaccessible, bug bloquant), voici la procédure pour redéployer la version stable précédente :

1. **Accéder à l'hébergeur :** Connectez-vous au tableau de bord Railway et sélectionnez le service `fsm-docker`.
2. **Ouvrir l'historique :** Allez dans l'onglet **Deployments**.
3. **Identifier la version stable :** Parcourez la liste et repérez le dernier déploiement valide (marqué d'un succès) précédant l'incident.
4. **Lancer le rollback :** Cliquez sur les trois petits points (`...`) situés à droite de ce déploiement spécifique.
5. **Redéployer :** Cliquez sur **Redeploy**. Railway va instantanément relancer le conteneur en utilisant l'ancienne image Docker fonctionnelle.
6. **Validation :** Une fois le service relancé, testez l'URL de production pour confirmer que le site est de nouveau opérationnel.
