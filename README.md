# Matchpoint — suivi de tennis

MVP de suivi de performances sportives, actuellement consacré au tennis. L’application permet à plusieurs utilisateurs de tenir chacun leur historique privé.

## Architecture

- **Frontend :** React et Vite. En développement, Vite relaie `/api` vers Express.
- **Serveur :** Node.js et Express. En production, Express sert le build Vite et l’API sur la même origine.
- **Données :** PostgreSQL et `pg`. Les requêtes SQL utilisent des paramètres ; les matchs et rendez-vous sont rattachés au compte connecté.
- **Connexion :** mots de passe hachés avec bcrypt ; cookie de session HttpOnly et sessions persistées dans PostgreSQL.
- **Déploiement :** Docker Compose avec les services `app` et `db`, et volume PostgreSQL persistant.

## Démarrer avec Docker

Copier `.env.example` vers `.env`, puis remplacer `POSTGRES_PASSWORD` et `SESSION_SECRET` par des valeurs propres à l’instance. Ces secrets restent dans `.env`, qui n’est pas versionné.

```sh
docker compose up --build -d
```

Ouvrir <http://localhost:3000>. Les comptes se créent depuis l’écran d’accueil. Le volume `postgres-data` conserve les données après l’arrêt des conteneurs. Pour arrêter : `docker compose down` (ne pas ajouter `-v` si la base doit être conservée).

## Développement local

Pré-requis : Node.js 24 ou plus récent et Docker Compose.

```sh
npm install
```

Copier `.env.example` en `.env`, puis lancer PostgreSQL :

```sh
docker compose up -d db
```

Dans un terminal, démarrer l’API :

```sh
npm run dev:api
```

Dans un second terminal, démarrer Vite :

```sh
npm run dev
```

Ouvrir <http://localhost:5173>. Vite transmet les appels `/api` au serveur Express sur le port 3000.

## Fonctionnalités

- Création de compte, connexion, déconnexion et sessions persistantes.
- Enregistrement, consultation, modification et suppression des matchs amicaux ou de tournoi, en simple ou en double.
- Participants, classement FFT saisi au moment du match, équipes de double, surface, format, tour, durée, ressenti et score détaillé par set avec indicateur de super tie-break.
- Tableau de bord et historique avec indicateurs distincts pour simple et double : matchs, victoires, défaites, ratio, meilleure victoire, matchs par mois et taux de victoire selon le classement adverse.
- Rendez-vous à venir, modifiables et supprimables. Ils ne deviennent pas automatiquement des matchs joués : le résultat est à enregistrer manuellement.

Les classements suivent un ordre explicite du moins bien classé (`NC`) au mieux classé (`-30`) et ne sont pas comparés comme du texte. Pour le double, les taux contre des équipes mieux ou moins bien classées s’appuient sur la moyenne des rangs numériques des deux équipes ; les matchs sans rang complet sont exclus de ces deux taux.

## Publication et déploiement

`.github/workflows/ci.yml` construit le frontend et l’image Docker sur les pushes et pull requests. `.github/workflows/publish.yml` publie l’image dans GitHub Container Registry lorsqu’un tag de version `v*.*.*` est poussé. Le dépôt GitHub doit autoriser les Actions à publier des packages.

Le modèle de déploiement autonome est dans `deploy/student/compose.yaml`. Fournir `APP_IMAGE`, `POSTGRES_USER`, `POSTGRES_PASSWORD` et `SESSION_SECRET` dans l’environnement du serveur, puis exécuter :

```sh
docker compose -f deploy/student/compose.yaml up -d
```

Configurer le reverse proxy HTTPS devant le port de l’application. Le cookie de session devient `Secure` lorsque `NODE_ENV=production`.

## Périmètre et décisions

Le MVP traite le tennis uniquement. Il n’invite pas d’adversaires, n’envoie pas de notifications et ne connecte aucun service sportif. Les rencontres planifiées sont des notes personnelles. Les classements utilisés sont ceux saisis manuellement par le compte au moment du match.
