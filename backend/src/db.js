// Accès aux données : MySQL si DATABASE_URL est défini, sinon stockage en mémoire.
import mysql from 'mysql2/promise';

const COLUMNS = 'id, titre, description, statut, created_at';

function createMysqlStore(uri) {
  const pool = mysql.createPool({
    uri,
    // Les hébergeurs MySQL en ligne exigent généralement une connexion chiffrée (SSL)
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
    timezone: 'Z', // dates échangées en UTC
    charset: 'utf8mb4', // accents et caractères spéciaux
    connectionLimit: 5,
  });

  async function findById(id) {
    // Requête paramétrée (?) : protège contre l'injection SQL
    const [rows] = await pool.query(`SELECT ${COLUMNS} FROM tickets WHERE id = ?`, [id]);
    return rows[0] ?? null;
  }

  return {
    mode: 'mysql',

    async ping() {
      await pool.query('SELECT 1');
    },

    async list() {
      const [rows] = await pool.query(
        `SELECT ${COLUMNS} FROM tickets ORDER BY created_at DESC, id DESC`
      );
      return rows;
    },

    async create({ titre, description }) {
      const [result] = await pool.query(
        'INSERT INTO tickets (titre, description) VALUES (?, ?)',
        [titre, description]
      );
      return findById(result.insertId);
    },

    async updateStatus(id, statut) {
      const [result] = await pool.query('UPDATE tickets SET statut = ? WHERE id = ?', [statut, id]);
      if (result.affectedRows === 0) return null;
      return findById(id);
    },

    async remove(id) {
      const [result] = await pool.query('DELETE FROM tickets WHERE id = ?', [id]);
      return result.affectedRows > 0;
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
  ? createMysqlStore(process.env.DATABASE_URL)
  : createMemoryStore();
