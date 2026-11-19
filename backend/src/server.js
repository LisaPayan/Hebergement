// API REST de gestion des tickets
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { store } from './db.js';

const PORT = process.env.PORT || 3000;
const STATUTS = ['ouvert', 'en_cours', 'resolu'];
const TITRE_MAX = 200;
const DESCRIPTION_MAX = 5000;

const app = express();

// --- CORS : seules les origines listées dans CORS_ORIGIN peuvent appeler l'API ---
const allowedOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((o) => o.trim().replace(/\/$/, ''))
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      // Pas d'en-tête Origin (curl, navigateur sur l'URL directe) ou origine autorisée
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      return callback(null, false);
    },
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  })
);

app.use(express.json({ limit: '20kb' }));

// --- Fonctions de validation ---
function parseId(raw) {
  return /^\d+$/.test(raw) ? Number(raw) : null;
}

function validateTicket(body) {
  const errors = [];
  const titre = typeof body?.titre === 'string' ? body.titre.trim() : '';
  const description = typeof body?.description === 'string' ? body.description.trim() : '';

  if (!titre) errors.push('Le titre est obligatoire.');
  else if (titre.length > TITRE_MAX) errors.push(`Le titre ne doit pas dépasser ${TITRE_MAX} caractères.`);

  if (!description) errors.push('La description est obligatoire.');
  else if (description.length > DESCRIPTION_MAX)
    errors.push(`La description ne doit pas dépasser ${DESCRIPTION_MAX} caractères.`);

  return { errors, value: { titre, description } };
}

// --- Routes ---
app.get('/', (req, res) => {
  res.json({ message: 'API Tickets', routes: ['/health', '/api/tickets'] });
});

// Vérifie que l'API répond et que la base est joignable
app.get('/health', async (req, res) => {
  try {
    await store.ping();
    res.json({ status: 'ok', stockage: store.mode });
  } catch (err) {
    console.error('Health check - base injoignable :', err.message);
    res.status(503).json({ status: 'erreur', stockage: store.mode, message: 'Base de données injoignable' });
  }
});

// F1 - Lister les tickets
app.get('/api/tickets', async (req, res, next) => {
  try {
    res.json(await store.list());
  } catch (err) {
    next(err);
  }
});

// F2 - Créer un ticket
app.post('/api/tickets', async (req, res, next) => {
  const { errors, value } = validateTicket(req.body);
  if (errors.length) return res.status(400).json({ error: errors.join(' ') });

  try {
    res.status(201).json(await store.create(value));
  } catch (err) {
    next(err);
  }
});

// F3 - Modifier le statut d'un ticket
app.patch('/api/tickets/:id', async (req, res, next) => {
  const id = parseId(req.params.id);
  if (id === null) return res.status(400).json({ error: 'Identifiant invalide.' });

  const statut = req.body?.statut;
  if (!STATUTS.includes(statut)) {
    return res.status(400).json({ error: `Statut invalide. Valeurs possibles : ${STATUTS.join(', ')}.` });
  }

  try {
    const ticket = await store.updateStatus(id, statut);
    if (!ticket) return res.status(404).json({ error: 'Ticket introuvable.' });
    res.json(ticket);
  } catch (err) {
    next(err);
  }
});

// Facultatif - Supprimer un ticket
app.delete('/api/tickets/:id', async (req, res, next) => {
  const id = parseId(req.params.id);
  if (id === null) return res.status(400).json({ error: 'Identifiant invalide.' });

  try {
    const deleted = await store.remove(id);
    if (!deleted) return res.status(404).json({ error: 'Ticket introuvable.' });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

// Route inconnue
app.use((req, res) => {
  res.status(404).json({ error: 'Route introuvable.' });
});

// Gestion centralisée des erreurs (JSON invalide, erreur base de données...)
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Corps de requête JSON invalide.' });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Requête trop volumineuse.' });
  }
  console.error(err);
  res.status(500).json({ error: 'Erreur interne du serveur.' });
});

app.listen(PORT, () => {
  console.log(`API démarrée sur le port ${PORT} (stockage : ${store.mode})`);
  if (store.mode === 'memoire') {
    console.warn('ATTENTION : DATABASE_URL non défini, les tickets sont stockés en mémoire (non persistants).');
  }
  if (allowedOrigins.length === 0) {
    console.warn('ATTENTION : CORS_ORIGIN non défini, aucun site web ne pourra appeler l\'API depuis un navigateur.');
  }
});
