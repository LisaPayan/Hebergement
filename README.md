# H-bergement — Suivi des demandes informatiques

Application web permettant aux collaborateurs de **déclarer un incident**, **consulter les demandes** et **suivre leur résolution** (statuts : Ouvert, En cours, Résolu).

Projet réalisé dans le cadre du TP « Mise en production » : architecture trois tiers déployée sur Vercel (frontend), Render (API) et Aiven (base de données MySQL).

## Architecture

| Tier | Technologie | Hébergement |
|------|-------------|-------------|
| Frontend | Vite + JavaScript | Vercel |
| Backend (API) | Node.js + Express | Render |
| Base de données | MySQL 8 | Aiven (WampServer en local) |
| Code source | Git | GitHub |

Schéma détaillé : [docs/architecture.md](docs/architecture.md)

## Liens

| Service | URL publique |
|---------|--------------|
| Frontend (Vercel) | https://tp-deploiement-frontend.vercel.app |
| API (Render) | https://hebergement-om3e.onrender.com |
| Vérification de l'API | https://hebergement-om3e.onrender.com/health |
| Liste des tickets (JSON) | https://hebergement-om3e.onrender.com/api/tickets |

> Offre gratuite Render : si l'API était en veille, le premier chargement peut prendre jusqu'à environ 1 minute.

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

### 1. Base de données — Aiven (MySQL)
Supabase ne proposant que PostgreSQL, la base MySQL est hébergée sur **Aiven** (offre gratuite, connexion SSL obligatoire).

1. Se connecter à https://console.aiven.io (compte GitHub), créer un service **MySQL** en offre gratuite et attendre l'état *Running*.
2. Récupérer les paramètres de connexion (onglet *Overview*) : hôte, port, utilisateur, mot de passe, base `defaultdb`.
3. Dans **DBeaver** : nouvelle connexion MySQL avec ces paramètres, onglet *SSL* → « Utiliser SSL », tester la connexion.
4. Ouvrir un éditeur SQL sur la base `defaultdb` et exécuter `backend/sql/schema.sql` (création de la table `tickets` + 3 tickets d'exemple).
5. URL de connexion pour le backend : copier la *Service URI* d'Aiven, de la forme `mysql://UTILISATEUR:MOT_DE_PASSE@HOTE:PORT/defaultdb`. Elle n'est renseignée **que** dans les variables d'environnement de Render.

> **Pièges fréquents**
> - Si le mot de passe contient des caractères spéciaux, les encoder dans l'URL (`@` → `%40`, `#` → `%23`, `/` → `%2F`, `:` → `%3A`).
> - Si l'hébergeur fournit une URL se terminant par `?ssl-mode=REQUIRED` (ex. Aiven), **retirer** ce paramètre et définir `DATABASE_SSL=true` à la place.
> - La base locale WAMP n'est pas accessible depuis Internet : Render doit utiliser une base MySQL hébergée en ligne.

**Ordre de configuration** : l'API a besoin de l'URL du frontend (`CORS_ORIGIN`) et le frontend de l'URL de l'API (`VITE_API_URL`). Déployer l'API, puis le frontend avec `VITE_API_URL`, puis renseigner `CORS_ORIGIN` sur Render avec l'URL Vercel obtenue.

### 2. Backend — Render
Service **Web Service** (offre gratuite) créé à partir du dépôt GitHub :

| Paramètre | Valeur |
|-----------|--------|
| Branch | `dev` |
| Root Directory | `backend` |
| Runtime | Node |
| Build Command | `npm install` |
| Start Command | `node src/server.js` (équivalent à `npm start`) |
| Port | fourni automatiquement par Render via `PORT` (10000) |

Variables d'environnement (onglet **Environment**) :

| Variable | Valeur |
|----------|--------|
| `DATABASE_URL` | URL de connexion MySQL en ligne (**secret**) |
| `DATABASE_SSL` | `true` |
| `CORS_ORIGIN` | `https://tp-deploiement-frontend.vercel.app` (sans `/` final) |

Vérification : https://hebergement-om3e.onrender.com/health renvoie `{"status":"ok","stockage":"mysql"}`.

> Si le dépôt n'apparaît pas dans la liste de Render (droits insuffisants sur le dépôt), il peut être importé via **Public Git Repository**. Dans ce cas, vérifier dans *Settings* que l'*Auto-Deploy* est bien actif (voir section 4).

### 3. Frontend — Vercel
Déploiement réalisé avec la **CLI Vercel**, depuis la racine du dépôt :

```bash
npm i -g vercel                                        # installation de la CLI
vercel login                                           # connexion au compte Vercel
vercel --cwd frontend                                  # premier déploiement (Vite détecté automatiquement)
vercel env add VITE_API_URL production --cwd frontend  # saisir l'URL de l'API : https://hebergement-om3e.onrender.com
vercel --prod --cwd frontend                           # déploiement en production
```

| Paramètre | Valeur |
|-----------|--------|
| Framework | Vite (`npm run build`, dossier `dist`) |
| `VITE_API_URL` | `https://hebergement-om3e.onrender.com` (sans `/` final) |

> `VITE_API_URL` est intégrée au moment du build : après l'avoir modifiée, il faut **redéployer** le frontend (`vercel --prod --cwd frontend`).
>
> Un déploiement fait avec la CLI n'est pas relié automatiquement à GitHub. Pour le redéploiement automatique, relier le projet au dépôt : *Settings → Git → Connect Git Repository*, avec **Root Directory = `frontend`**.

### 4. Redéploiement automatique (CI/CD)
Lorsque les services sont reliés au dépôt GitHub, chaque `git push` sur la branche suivie déclenche automatiquement un nouveau build et un nouveau déploiement :

- **Render** : redéploie l'API à chaque push sur la branche configurée (*Settings → Auto-Deploy*).
- **Vercel** : redéploie le frontend à chaque push, une fois le projet relié au dépôt (*Settings → Git*).

Test de redéploiement : modifier un élément visible (ex. le titre dans `frontend/index.html`), commit, push, observer le nouveau déploiement dans le tableau de bord, puis vérifier la modification sur le site public.

## Sécurité

- Aucun secret dans le dépôt : les fichiers `.env` sont exclus par `.gitignore`, seuls les `.env.example` (sans valeur sensible) sont versionnés.
- Les identifiants de la base ne sont connus que du backend (variable d'environnement Render).
- CORS limité à l'URL du frontend.
- Données validées par l'API (champs obligatoires, longueurs, statuts autorisés) et contrainte `CHECK` en base.
- Requêtes SQL paramétrées, affichage via `textContent` (pas d'injection HTML).

## Points d'attention (offres gratuites)

- Render met le service en veille après 15 min d'inactivité : le premier appel peut prendre jusqu'à environ 1 minute.
- L'offre gratuite d'Aiven a des limites (stockage, connexions) et peut mettre en pause un service inactif.
