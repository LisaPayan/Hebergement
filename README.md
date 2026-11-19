# H-bergement — Suivi des demandes informatiques

Application web permettant aux collaborateurs de **déclarer un incident**, **consulter les demandes** et **suivre leur résolution** (statuts : Ouvert, En cours, Résolu).

Projet réalisé dans le cadre du TP « Mise en production » : architecture trois tiers déployée sur Vercel (frontend), Render (API) et un hébergeur MySQL (base de données).

## Architecture

| Tier | Technologie | Hébergement |
|------|-------------|-------------|
| Frontend | Vite + JavaScript | Vercel |
| Backend (API) | Node.js + Express | Render |
| Base de données | MySQL 8 | WampServer en local, _hébergeur en ligne à compléter_ |
| Code source | Git | GitHub |

Schéma détaillé : [docs/architecture.md](docs/architecture.md)

## Liens

- Frontend : _à compléter_
- API : _à compléter_ (test : `<URL_API>/health`)

## Structure du dépôt

```
backend/            API REST
  src/server.js     routes, validation, CORS
  src/db.js         accès MySQL (ou mémoire si pas de base)
  sql/schema.sql    création de la table tickets
frontend/           interface utilisateur
  index.html
  src/main.js       appels à l'API et affichage
  src/style.css
docs/               schéma d'architecture
```

## API

| Méthode | Route | Fonction | Codes |
|---------|-------|----------|-------|
| GET | `/health` | Vérifie que l'API et la base répondent | 200, 503 |
| GET | `/api/tickets` | Liste des tickets | 200 |
| POST | `/api/tickets` | Crée un ticket `{ "titre", "description" }` | 201, 400 |
| PATCH | `/api/tickets/:id` | Modifie le statut `{ "statut": "ouvert" \| "en_cours" \| "resolu" }` | 200, 400, 404 |
| DELETE | `/api/tickets/:id` | Supprime un ticket (facultatif) | 204, 404 |

Toutes les réponses sont en JSON.

## Lancer le projet en local

Prérequis : Node.js 18 ou plus, WampServer (MySQL 8) et DBeaver.

**Base de données (WampServer + DBeaver)**
1. Lancer WampServer et attendre que l'icône soit verte (MySQL écoute sur le port 3306).
2. Dans DBeaver : nouvelle connexion **MySQL**, hôte `localhost`, port `3306`, utilisateur `root` (sans mot de passe par défaut avec WAMP).
3. Créer la base : `CREATE DATABASE tickets CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
4. Sélectionner la base `tickets`, ouvrir `backend/sql/schema.sql` et l'exécuter comme script (Alt+X).

**Backend**
```bash
cd backend
npm install
cp .env.example .env     # DATABASE_URL=mysql://root@localhost:3306/tickets
npm run dev              # http://localhost:3000
```
Vérifier : http://localhost:3000/health doit renvoyer `{"status":"ok","stockage":"mysql"}`.

**Frontend** (dans un autre terminal)
```bash
cd frontend
npm install
cp .env.example .env     # VITE_API_URL=http://localhost:3000
npm run dev              # http://localhost:5173
```

> Sans `DATABASE_URL`, l'API garde les tickets en mémoire : pratique pour tester, mais ils sont perdus au redémarrage.

## Déploiement

### 1. Base de données — MySQL en ligne
1. Créer une base MySQL 8 chez un hébergeur accessible depuis Internet (ex. Aiven, offre gratuite).
2. Se connecter à cette base avec **DBeaver** (hôte, port, utilisateur, mot de passe fournis par l'hébergeur, SSL activé) et exécuter `backend/sql/schema.sql`.
3. Construire l'URL de connexion : `mysql://UTILISATEUR:MOT_DE_PASSE@HOTE:PORT/NOM_BASE`

> **Pièges fréquents**
> - Si le mot de passe contient des caractères spéciaux, les encoder dans l'URL (`@` → `%40`, `#` → `%23`, `/` → `%2F`, `:` → `%3A`).
> - Si l'hébergeur fournit une URL se terminant par `?ssl-mode=REQUIRED` (ex. Aiven), **retirer** ce paramètre et définir `DATABASE_SSL=true` à la place.
> - La base locale WAMP n'est pas accessible depuis Internet : Render doit utiliser une base MySQL hébergée en ligne.

**Ordre de configuration** : l'API a besoin de l'URL du frontend (`CORS_ORIGIN`) et le frontend de l'URL de l'API (`VITE_API_URL`). Déployer l'API, puis le frontend avec `VITE_API_URL`, puis renseigner `CORS_ORIGIN` sur Render avec l'URL Vercel obtenue.

### 2. Backend — Render
Créer un **Web Service** relié au dépôt GitHub :

| Paramètre | Valeur |
|-----------|--------|
| Branch | `main` |
| Root Directory | `backend` |
| Runtime | Node |
| Build Command | `npm install` |
| Start Command | `npm start` |
| Health Check Path | `/health` |

Variables d'environnement (onglet **Environment**) :

| Variable | Valeur |
|----------|--------|
| `DATABASE_URL` | URL de connexion MySQL en ligne (**secret**) |
| `DATABASE_SSL` | `true` |
| `CORS_ORIGIN` | URL du frontend Vercel, ex. `https://mon-projet.vercel.app` (sans `/` final) |

Vérifier : `https://<service>.onrender.com/health` doit renvoyer `{"status":"ok","stockage":"mysql"}`.

### 3. Frontend — Vercel
Créer un projet relié au dépôt GitHub :

| Paramètre | Valeur |
|-----------|--------|
| Root Directory | `frontend` |
| Framework Preset | Vite (détecté automatiquement) |
| Build Command | `npm run build` |
| Output Directory | `dist` |

Variable d'environnement : `VITE_API_URL` = URL de l'API Render (sans `/` final).

> `VITE_API_URL` est intégrée au moment du build : après l'avoir modifiée, il faut **redéployer** le frontend.

### 4. Redéploiement automatique (CI/CD)
Chaque `git push` sur la branche `main` déclenche automatiquement un nouveau déploiement sur Render et Vercel.

## Sécurité

- Aucun secret dans le dépôt : les fichiers `.env` sont exclus par `.gitignore`, seuls les `.env.example` (sans valeur sensible) sont versionnés.
- Les identifiants de la base ne sont connus que du backend (variable d'environnement Render).
- CORS limité à l'URL du frontend.
- Données validées par l'API (champs obligatoires, longueurs, statuts autorisés) et contrainte `CHECK` en base.
- Requêtes SQL paramétrées, affichage via `textContent` (pas d'injection HTML).

## Points d'attention (offres gratuites)

- Render met le service en veille après 15 min d'inactivité : le premier appel peut prendre jusqu'à environ 1 minute.
- Les offres MySQL gratuites ont des limites (stockage, connexions) et peuvent mettre en pause une base inactive.
