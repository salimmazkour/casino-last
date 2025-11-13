/*
  # Système de workflow des tickets (style Orchestra)
  
  1. Modifications
    - Ajout de colonnes à la table `orders` pour gérer les états du ticket
    - `kitchen_status`: Statut de l'envoi en cuisine/bar (pending, sent, completed)
    - `is_on_hold`: Indique si le ticket est en attente (dans l'onglet Tickets)
    - `hold_time`: Horodatage de la mise en attente
    - `sent_to_kitchen_at`: Horodatage du premier envoi en cuisine
    - `last_printed_at`: Horodatage de la dernière impression
    - `print_count`: Nombre d'impressions du ticket
    
  2. Notes
    - Un ticket peut être imprimé plusieurs fois
    - Le premier envoi déclenche la fabrication en cuisine
    - Les tickets en attente peuvent être rechargés
    - Le workflow suit le modèle Orchestra
*/

-- Ajouter les colonnes de workflow aux commandes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'kitchen_status'
  ) THEN
    ALTER TABLE orders ADD COLUMN kitchen_status text DEFAULT 'pending' CHECK (kitchen_status IN ('pending', 'sent', 'completed'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'is_on_hold'
  ) THEN
    ALTER TABLE orders ADD COLUMN is_on_hold boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'hold_time'
  ) THEN
    ALTER TABLE orders ADD COLUMN hold_time timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'sent_to_kitchen_at'
  ) THEN
    ALTER TABLE orders ADD COLUMN sent_to_kitchen_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'last_printed_at'
  ) THEN
    ALTER TABLE orders ADD COLUMN last_printed_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'print_count'
  ) THEN
    ALTER TABLE orders ADD COLUMN print_count integer DEFAULT 0;
  END IF;
END $$;

-- Créer un index pour les tickets en attente
CREATE INDEX IF NOT EXISTS idx_orders_on_hold 
ON orders(sales_point_id, is_on_hold, hold_time) 
WHERE is_on_hold = true;

-- Créer un index pour les tickets en cuisine
CREATE INDEX IF NOT EXISTS idx_orders_kitchen_status 
ON orders(sales_point_id, kitchen_status, sent_to_kitchen_at);
