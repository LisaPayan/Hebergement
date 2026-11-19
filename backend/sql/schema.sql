-- Script de création de la base (à exécuter une fois dans Supabase > SQL Editor)

CREATE TABLE IF NOT EXISTS tickets (
  id          SERIAL PRIMARY KEY,
  titre       VARCHAR(200) NOT NULL,
  description TEXT         NOT NULL,
  statut      VARCHAR(20)  NOT NULL DEFAULT 'ouvert'
              CHECK (statut IN ('ouvert', 'en_cours', 'resolu')),
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- Sécurité Supabase : bloque l'accès direct à la table via l'API publique de Supabase
-- (clé "anon"). Seul notre backend, connecté avec l'utilisateur propriétaire, y accède.
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

-- Données de démonstration (facultatif)
INSERT INTO tickets (titre, description, statut) VALUES
  ('Imprimante en panne', 'L''imprimante du 2e étage affiche une erreur de bourrage papier.', 'ouvert'),
  ('Accès VPN', 'Impossible de me connecter au VPN depuis chez moi.', 'en_cours'),
  ('Nouveau poste', 'Installation du poste du nouvel arrivant au service comptable.', 'resolu');
