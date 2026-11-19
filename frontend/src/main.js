import './style.css';

// URL de l'API : définie par la variable d'environnement VITE_API_URL (Vercel ou fichier .env)
const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/$/, '');

const STATUTS = {
  ouvert: 'Ouvert',
  en_cours: 'En cours',
  resolu: 'Résolu',
};

const form = document.querySelector('#ticket-form');
const titreInput = document.querySelector('#titre');
const descriptionInput = document.querySelector('#description');
const submitBtn = document.querySelector('#submit-btn');
const formMessage = document.querySelector('#form-message');
const list = document.querySelector('#ticket-list');
const listMessage = document.querySelector('#list-message');
const count = document.querySelector('#count');
const filterSelect = document.querySelector('#filter');
const searchInput = document.querySelector('#search');

let tickets = [];

// --- Appels à l'API ---
async function api(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (response.status === 204) return null;

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.error || `Erreur ${response.status}`);
  }
  return data;
}

function showMessage(element, text, type = 'info') {
  element.textContent = text;
  element.className = `message ${text ? type : ''}`;
}

// --- F1 : afficher les tickets ---
async function loadTickets() {
  // L'offre gratuite de Render met le serveur en veille : le 1er appel peut être lent
  const slowTimer = setTimeout(
    () => showMessage(listMessage, 'Réveil du serveur en cours, cela peut prendre jusqu\'à une minute...'),
    3000
  );
  showMessage(listMessage, 'Chargement...');

  try {
    tickets = await api('/api/tickets');
    showMessage(listMessage, '');
    render();
  } catch (err) {
    showMessage(listMessage, `Impossible de charger les tickets : ${err.message}`, 'error');
  } finally {
    clearTimeout(slowTimer);
  }
}

function formatDate(value) {
  return new Date(value).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
}

function render() {
  const filtre = filterSelect.value;
  const recherche = searchInput.value.trim().toLowerCase();

  const visibles = tickets.filter(
    (t) =>
      (!filtre || t.statut === filtre) &&
      (!recherche ||
        t.titre.toLowerCase().includes(recherche) ||
        t.description.toLowerCase().includes(recherche))
  );

  count.textContent = `(${visibles.length})`;
  list.replaceChildren();

  if (visibles.length === 0) {
    const empty = document.createElement('li');
    empty.className = 'empty';
    empty.textContent = tickets.length ? 'Aucun ticket ne correspond.' : 'Aucun ticket pour le moment.';
    list.append(empty);
    return;
  }

  for (const ticket of visibles) {
    list.append(renderTicket(ticket));
  }
}

// Construction du DOM avec textContent (et non innerHTML) : protège contre l'injection de code (XSS)
function renderTicket(ticket) {
  const li = document.createElement('li');
  li.className = `ticket statut-${ticket.statut}`;

  const header = document.createElement('div');
  header.className = 'ticket-header';

  const title = document.createElement('h3');
  title.textContent = ticket.titre;

  const badge = document.createElement('span');
  badge.className = `badge badge-${ticket.statut}`;
  badge.textContent = STATUTS[ticket.statut] ?? ticket.statut;

  header.append(title, badge);

  const description = document.createElement('p');
  description.className = 'description';
  description.textContent = ticket.description;

  const footer = document.createElement('div');
  footer.className = 'ticket-footer';

  const date = document.createElement('small');
  date.textContent = `#${ticket.id} · créé le ${formatDate(ticket.created_at)}`;

  const actions = document.createElement('div');
  actions.className = 'actions';

  // F3 : modifier le statut
  const select = document.createElement('select');
  select.setAttribute('aria-label', 'Changer le statut');
  for (const [value, label] of Object.entries(STATUTS)) {
    select.append(new Option(label, value, false, value === ticket.statut));
  }
  select.addEventListener('change', () => updateStatus(ticket.id, select.value, select));

  const deleteBtn = document.createElement('button');
  deleteBtn.type = 'button';
  deleteBtn.className = 'btn-delete';
  deleteBtn.textContent = 'Supprimer';
  deleteBtn.addEventListener('click', () => deleteTicket(ticket.id));

  actions.append(select, deleteBtn);
  footer.append(date, actions);
  li.append(header, description, footer);
  return li;
}

// --- F2 : créer un ticket ---
form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const titre = titreInput.value.trim();
  const description = descriptionInput.value.trim();

  if (!titre || !description) {
    showMessage(formMessage, 'Le titre et la description sont obligatoires.', 'error');
    return;
  }

  submitBtn.disabled = true;
  showMessage(formMessage, 'Envoi...');
  try {
    const ticket = await api('/api/tickets', {
      method: 'POST',
      body: JSON.stringify({ titre, description }),
    });
    tickets.unshift(ticket);
    render();
    form.reset();
    showMessage(formMessage, 'Ticket créé.', 'success');
  } catch (err) {
    showMessage(formMessage, `Erreur : ${err.message}`, 'error');
  } finally {
    submitBtn.disabled = false;
  }
});

// --- F3 : modifier le statut ---
async function updateStatus(id, statut, select) {
  select.disabled = true;
  try {
    const updated = await api(`/api/tickets/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ statut }),
    });
    tickets = tickets.map((t) => (t.id === id ? updated : t));
    showMessage(listMessage, '');
  } catch (err) {
    showMessage(listMessage, `Erreur lors de la mise à jour : ${err.message}`, 'error');
  }
  render();
}

// --- Facultatif : supprimer un ticket ---
async function deleteTicket(id) {
  if (!confirm('Supprimer ce ticket ?')) return;
  try {
    await api(`/api/tickets/${id}`, { method: 'DELETE' });
    tickets = tickets.filter((t) => t.id !== id);
    showMessage(listMessage, '');
    render();
  } catch (err) {
    showMessage(listMessage, `Erreur lors de la suppression : ${err.message}`, 'error');
  }
}

filterSelect.addEventListener('change', render);
searchInput.addEventListener('input', render);

loadTickets();
