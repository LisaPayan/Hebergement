-- Script de création de la table tickets (MySQL 8).
-- À exécuter une fois dans DBeaver sur la base "tickets" (en local avec WAMP, puis sur la base en ligne).
SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS tickets (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  titre       VARCHAR(200) NOT NULL,
  description TEXT         NOT NULL,
  statut      VARCHAR(20)  NOT NULL DEFAULT 'ouvert',
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  -- Contrôle des valeurs de statut par la base (MySQL 8.0.16 ou plus)
  CONSTRAINT chk_statut CHECK (statut IN ('ouvert', 'en_cours', 'resolu'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Données de démonstration (facultatif)
INSERT INTO tickets (titre, description, statut) VALUES
  ('Imprimante en panne', 'L''imprimante du 2e étage affiche une erreur de bourrage papier.', 'ouvert'),
  ('Accès VPN', 'Impossible de me connecter au VPN depuis chez moi.', 'en_cours'),
  ('Nouveau poste', 'Installation du poste du nouvel arrivant au service comptable.', 'resolu');
