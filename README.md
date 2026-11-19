# H-bergement — Suivi des demandes informatiques

Application web permettant aux collaborateurs de **déclarer un incident**, **consulter les demandes** et **suivre leur résolution** (statuts : Ouvert, En cours, Résolu).

Projet réalisé dans le cadre du TP « Mise en production » : architecture trois tiers déployée sur Vercel, Render et Supabase.

## Architecture

| Tier | Technologie | Hébergement |
|------|-------------|-------------|
| Frontend | Vite + JavaScript | Vercel |
| Backend (API) | Node.js + Express | Render |
| Base de données | PostgreSQL | Supabase |
| Code source | Git | GitHub |

Schéma détaillé : [docs/architecture.md](docs/architecture.md)

## Liens

- Frontend : _à compléter_
- API : _à compléter_ (test : `<URL_API>/health`)

## Structure du dépôt

```
backend/            API REST
  src/server.js     routes, validation, CORS
  src/db.js         accès PostgreSQL (ou mémoire si pas de base)
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

Prérequis : Node.js 18 ou plus.

**Backend**
```bash
cd backend
npm install
cp .env.example .env     # puis remplir DATABASE_URL (sinon : stockage en mémoire)
npm run dev              # http://localhost:3000
```

**Frontend** (dans un autre terminal)
```bash
cd frontend
npm install
cp .env.example .env     # VITE_API_URL=http://localhost:3000
npm run dev              # http://localhost:5173
```

> Sans `DATABASE_URL`, l'API garde les tickets en mémoire : pratique pour tester, mais ils sont perdus au redémarrage.

## Déploiement

### 1. Base de données — Supabase
1. Créer un projet Supabase (noter le mot de passe de la base).
2. **SQL Editor** : exécuter le contenu de `backend/sql/schema.sql`.
3. **Connect** (ou Project Settings > Database) : copier la chaîne de connexion **Session pooler** (compatible IPv4, nécessaire pour Render), sous la forme
   `postgresql://postgres.<ref>:<MOT_DE_PASSE>@aws-0-<region>.pooler.supabase.com:5432/postgres`

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
| `DATABASE_URL` | chaîne de connexion Supabase (**secret**) |
| `CORS_ORIGIN` | URL du frontend Vercel, ex. `https://mon-projet.vercel.app` (sans `/` final) |

Vérifier : `https://<service>.onrender.com/health` doit renvoyer `{"status":"ok","stockage":"postgres"}`.

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
- Supabase met en pause les projets gratuits inactifs pendant plusieurs jours.
