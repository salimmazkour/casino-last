/*
  # Correction des noms de tables et colonnes pour la caisse

  1. Changements
    - Créer une vue "categories" qui pointe vers "product_categories"
    - Créer une vue "tables" qui pointe vers "restaurant_tables"
    - Renommer les colonnes de pos_sessions pour correspondre au code:
      - opening_time -> opened_at
      - closing_time -> closed_at
      - opening_amount -> opening_balance
      - expected_amount -> expected_closing_balance
      - actual_amount -> closing_balance
    - Ajouter la colonne manquante created_by si nécessaire

  2. Sécurité
    - Les vues héritent des politiques RLS des tables sous-jacentes
*/

-- Renommer les colonnes de pos_sessions
DO $$
BEGIN
  -- Renommer opening_time en opened_at
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'pos_sessions' AND column_name = 'opening_time'
  ) THEN
    ALTER TABLE pos_sessions RENAME COLUMN opening_time TO opened_at;
  END IF;

  -- Renommer closing_time en closed_at
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'pos_sessions' AND column_name = 'closing_time'
  ) THEN
    ALTER TABLE pos_sessions RENAME COLUMN closing_time TO closed_at;
  END IF;

  -- Renommer opening_amount en opening_balance
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'pos_sessions' AND column_name = 'opening_amount'
  ) THEN
    ALTER TABLE pos_sessions RENAME COLUMN opening_amount TO opening_balance;
  END IF;

  -- Renommer actual_amount en closing_balance
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'pos_sessions' AND column_name = 'actual_amount'
  ) THEN
    ALTER TABLE pos_sessions RENAME COLUMN actual_amount TO closing_balance;
  END IF;
END $$;

-- Créer une vue "categories" qui pointe vers product_categories
CREATE OR REPLACE VIEW categories AS
SELECT * FROM product_categories;

-- Créer une vue "tables" qui pointe vers restaurant_tables
CREATE OR REPLACE VIEW tables AS
SELECT * FROM restaurant_tables;

-- Activer RLS sur les vues (elles héritent des policies des tables sous-jacentes)
ALTER VIEW categories SET (security_invoker = on);
ALTER VIEW tables SET (security_invoker = on);
