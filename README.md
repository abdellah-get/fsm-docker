# Génération du contenu du fichier README.md

readme_content = """# 🛠️ Guide d'intégration : Créer ton compte en local

Bienvenue sur le projet ! Pour pouvoir te connecter à l'application sur ta propre machine, tu dois créer ton compte directement dans ta base de données locale. Suis ces 4 étapes simples.

## 📌 Prérequis

1. Le projet doit être installé sur ton PC (`npm install`).
2. Ton conteneur Docker avec la base de données doit tourner.
3. Ton fichier `.env.local` doit être configuré avec le bon port (**5433**).
4. Ouvre **DBeaver** et connecte-toi à la base de données `fsm_db` sur le port **5433**.

---

## 🚀 Étape 1 : Récupérer l'ID de notre entreprise

Nous devons lier ton compte à l'entreprise déjà existante dans la base.
Dans DBeaver, ouvre un éditeur SQL et exécute :
Action : Copie l'identifiant (UUID) qui s'affiche dans la colonne id.

## Étape 2 : Préparer ton mot de passe crypté

L'application utilise bcryptjs pour la sécurité. Le mot de passe dans la base de données doit être crypté et commencer obligatoirement par $2a$.

Pour utiliser le mot de passe standard 123456, utilise ce hash tout prêt :
$2b$10$5EuJ2Y48Rl3ecEvc8Mvcu.NWrBsHCiYEE8Fa51qEjoAxQMuZ888Hi

(Optionnel) Si tu veux générer ton propre mot de passe, ouvre un terminal dans le dossier du projet et tape :
node -e "console.log(require('bcryptjs').hashSync('TON_MOT_DE_PASSE', 10))"

## Étape 3 : Créer ton profil utilisateur

Dans DBeaver, exécute la requête suivante en remplaçant les valeurs entre les commentaires par tes informations :

INSERT INTO utilisateurs (
id,
entreprise_id,
nom_complet,
telephone,
email,
password_hash,
role
)
VALUES (
gen_random_uuid(),
'COLLE_L_ID_DE_L_ENTREPRISE_ICI', -- L'UUID récupéré à l'étape 1
'Nom de mon Binôme', -- Ton prénom et nom
'+212600000000', -- Ton numéro
'binome@nouvelleusine.com', -- L'email que tu vas utiliser pour te connecter
'$2a$10$yO5F9.wW6A.6.G1M3q3Z1.A7Q/w6rK.xG.y.G.y.G.y.G.y.G.y.G', -- Le hash du mot de passe (123456 par défaut)
'GERANT' -- Ton rôle (GERANT ou TECHNICIEN)
);

Note : Si DBeaver n'est pas en mode auto-commit (généralement activé par défaut sur le port 5433), n'oublie pas d'exécuter la commande COMMIT; juste après.

## Étape 4 : Connecte-toi !

Lance l'application avec la commande : npm run dev

Ouvre ton navigateur sur : http://localhost:3001/login

Connecte-toi avec l'email défini à l'étape 3 et ton mot de passe.

Bienvenue sur le Dashboard !
