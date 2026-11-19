// Accès aux données : PostgreSQL si DATABASE_URL est défini, sinon stockage en mémoire.
import pg from 'pg';

const COLUMNS = 'id, titre, description, statut, created_at';

function createPostgresStore(connectionString) {
  const pool = new pg.Pool({
    connectionString,
    // Supabase impose une connexion chiffrée (SSL)
    ssl: process.env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: false },
  });

  return {
    mode: 'postgres',

    async ping() {
      await pool.query('SELECT 1');
    },

    async list() {
      const { rows } = await pool.query(
        `SELECT ${COLUMNS} FROM tickets ORDER BY created_at DESC, id DESC`
      );
      return rows;
    },

    async create({ titre, description }) {
      // Requête paramétrée ($1, $2) : protège contre l'injection SQL
      const { rows } = await pool.query(
        `INSERT INTO tickets (titre, description) VALUES ($1, $2) RETURNING ${COLUMNS}`,
        [titre, description]
      );
      return rows[0];
    },

    async updateStatus(id, statut) {
      const { rows } = await pool.query(
        `UPDATE tickets SET statut = $1 WHERE id = $2 RETURNING ${COLUMNS}`,
        [statut, id]
      );
      return rows[0] ?? null;
    },

    async remove(id) {
      const { rowCount } = await pool.query('DELETE FROM tickets WHERE id = $1', [id]);
      return rowCount > 0;
    },
  };
}

function createMemoryStore() {
  const tickets = [];
  let nextId = 1;

  return {
    mode: 'memoire',

    async ping() {},

    async list() {
      return [...tickets].sort((a, b) => b.id - a.id);
    },

    async create({ titre, description }) {
      const ticket = {
        id: nextId++,
        titre,
        description,
        statut: 'ouvert',
        created_at: new Date().toISOString(),
      };
      tickets.push(ticket);
      return ticket;
    },

    async updateStatus(id, statut) {
      const ticket = tickets.find((t) => t.id === id);
      if (!ticket) return null;
      ticket.statut = statut;
      return ticket;
    },

    async remove(id) {
      const index = tickets.findIndex((t) => t.id === id);
      if (index === -1) return false;
      tickets.splice(index, 1);
      return true;
    },
  };
}

export const store = process.env.DATABASE_URL
  ? createPostgresStore(process.env.DATABASE_URL)
  : createMemoryStore();
