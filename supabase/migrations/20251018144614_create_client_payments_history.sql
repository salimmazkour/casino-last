/*
  # Créer la table d'historique des paiements clients

  1. Nouvelles Tables
    - `client_payments`
      - `id` (uuid, clé primaire)
      - `client_id` (uuid, référence vers clients)
      - `amount` (numeric, montant du paiement)
      - `payment_method` (text, mode de paiement: espèces, carte, virement, etc.)
      - `reference` (text, numéro de référence ou de reçu)
      - `notes` (text, notes optionnelles)
      - `created_at` (timestamptz, date du paiement)
      - `created_by` (text, utilisateur ayant enregistré le paiement)

  2. Sécurité
    - Désactiver RLS pour le développement
    - Index sur client_id pour les requêtes rapides
    - Contrainte de clé étrangère vers la table clients

  3. Notes importantes
    - Tous les paiements sont enregistrés avec un historique complet
    - Le montant est toujours positif (c'est un encaissement)
    - La référence permet de tracer les paiements
*/

CREATE TABLE IF NOT EXISTS client_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  amount numeric NOT NULL CHECK (amount > 0),
  payment_method text NOT NULL DEFAULT 'espèces',
  reference text,
  notes text,
  created_at timestamptz DEFAULT now(),
  created_by text
);

-- Index pour améliorer les performances des requêtes par client
CREATE INDEX IF NOT EXISTS idx_client_payments_client_id ON client_payments(client_id);
CREATE INDEX IF NOT EXISTS idx_client_payments_created_at ON client_payments(created_at DESC);

-- Désactiver RLS pour le développement
ALTER TABLE client_payments DISABLE ROW LEVEL SECURITY;
