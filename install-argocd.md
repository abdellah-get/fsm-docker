# Field Service Management (FSM) - Déploiement GitOps

Suite à l'intégration du travail d'Abdellah sur la conteneurisation, nous entamons le **Jalon 9**. L'objectif de cette phase est d'établir un flux de déploiement continu déclaratif (GitOps) à l'aide d'Argo CD sur nos clusters locaux.

Ce document détaille la procédure standardisée pour monter l'environnement de déploiement.

---

## 📋 Prérequis
* Un cluster Kubernetes local actif (k3d sous Windows Subsystem for Linux - WSL).
* L'outil en ligne de commande `kubectl` configuré pour communiquer avec le cluster local.

## 🚀 Installation d'Argo CD

### 1. Création de l'espace de noms
Argo CD doit être strictement isolé des applications métiers. Nous le déployons dans son propre namespace :

```bash
kubectl create namespace argocd
```

### 2. Application des manifestes

**Important :** Le fichier de configuration officiel est trop volumineux pour une application client standard. L'utilisation du paramètre `--server-side` est obligatoire pour déléguer la gestion au serveur Kubernetes et éviter l'erreur de dépassement de capacité (Too long: may not be more than 262144 bytes).

```bash
kubectl apply -n argocd --server-side -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
```

### 3. Suivi du déploiement

Vérifiez que tous les composants démarrent correctement :

```bash
kubectl get pods -n argocd
```

⚠️ **Difficultés Techniques : Latence WSL**

Sur notre environnement de développement local (k3d/WSL), une latence importante a été constatée lors du téléchargement des images Docker d'Argo CD. Les pods peuvent stagner dans l'état `ContainerCreating` ou `Init:0/1` pendant près de 20 minutes. Il s'agit d'une contrainte de ressources liée à WSL et non d'une erreur de configuration. Il faut impérativement patienter jusqu'à ce que tous les pods affichent le statut `Running`.

### 4. Accès à l'interface d'administration

Pour accéder à l'interface graphique (UI) depuis la machine hôte, établissez un tunnel réseau. Exécutez cette commande dans un terminal dédié et laissez-la tourner en arrière-plan :

```bash
kubectl port-forward svc/argocd-server -n argocd 8080:443
```

### 5. Récupération des identifiants

Lors de l'installation, Argo CD génère un secret Kubernetes contenant le mot de passe administrateur. Exécutez cette commande pour le déchiffrer :

```bash
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d; echo
```

### 6. Connexion

Accédez au tableau de bord via votre navigateur Web :

* **URL :** https://localhost:8080
* **Utilisateur :** admin
* **Mot de passe :** (Le résultat retourné par la commande de l'étape 5)

*(Note : Acceptez l'avertissement de sécurité du navigateur lié à l'utilisation d'un certificat SSL auto-signé en local).*
