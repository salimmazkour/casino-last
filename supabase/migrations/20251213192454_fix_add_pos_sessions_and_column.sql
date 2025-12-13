/*
  # Ajouter le système de sessions POS

  1. Problème identifié
    - La table pos_sessions n'existe pas dans la base actuelle
    - La table orders n'a pas de colonne pos_session_id
    - Les migrations essaient d'utiliser cette colonne et créer des index dessus
    - Erreur: "column pos_session_id does not exist"

  2. Solution
    - Créer la table pos_sessions si elle n'existe pas
    - Ajouter la colonne pos_session_id à orders (nullable pour ne pas casser les données existantes)
    - Créer les index nécessaires

  3. Sécurité
    - Utilise IF NOT EXISTS pour éviter les erreurs
    - RLS désactivé pour développement
    - La colonne est nullable pour préserver les commandes existantes
*/

-- Créer la table pos_sessions si elle n'existe pas
CREATE TABLE IF NOT EXISTS pos_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_point_id uuid REFERENCES sales_points(id) ON DELETE CASCADE NOT NULL,
  employee_id uuid REFERENCES employees(id) NOT NULL,
  opening_time timestamptz DEFAULT now() NOT NULL,
  closing_time timestamptz,
  opening_amount numeric DEFAULT 0 NOT NULL,
  expected_amount numeric DEFAULT 0,
  actual_amount numeric,
  difference numeric,
  status text DEFAULT 'open' NOT NULL,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- Désactiver RLS pour développement
ALTER TABLE pos_sessions DISABLE ROW LEVEL SECURITY;

-- Ajouter pos_session_id à orders si elle n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'pos_session_id'
  ) THEN
    -- Ajouter la colonne comme nullable pour ne pas casser les données existantes
    ALTER TABLE orders
    ADD COLUMN pos_session_id uuid REFERENCES pos_sessions(id) ON DELETE SET NULL;
    
    RAISE NOTICE 'Colonne pos_session_id ajoutée à orders';
  ELSE
    RAISE NOTICE 'La colonne pos_session_id existe déjà dans orders';
  END IF;
END $$;

-- Créer les index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_pos_sessions_sales_point ON pos_sessions(sales_point_id);
CREATE INDEX IF NOT EXISTS idx_pos_sessions_status ON pos_sessions(status);
CREATE INDEX IF NOT EXISTS idx_orders_session ON orders(pos_session_id);

-- Créer la table payments si elle n'existe pas
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
  payment_method text NOT NULL,
  amount numeric NOT NULL,
  reference text,
  created_at timestamptz DEFAULT now()
);

-- Désactiver RLS pour développement
ALTER TABLE payments DISABLE ROW LEVEL SECURITY;

-- Créer l'index pour payments
CREATE INDEX IF NOT EXISTS idx_payments_order ON payments(order_id);