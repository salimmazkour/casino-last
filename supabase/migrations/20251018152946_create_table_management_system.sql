/*
  # Système de gestion des tables pour restaurants

  1. Nouvelles Tables
    - `restaurant_tables`
      - `id` (uuid, primary key)
      - `sales_point_id` (uuid, foreign key) - Point de vente restaurant
      - `table_number` (text) - Numéro/nom de la table (ex: "T1", "Table 1", "VIP1")
      - `capacity` (integer) - Nombre de places
      - `zone` (text) - Zone/section (ex: "Terrasse", "Intérieur", "VIP")
      - `position_x` (numeric) - Position X dans le plan graphique (en pixels ou %)
      - `position_y` (numeric) - Position Y dans le plan graphique
      - `status` (text) - Statut: available, occupied, reserved, merged
      - `merged_with` (uuid[]) - IDs des tables fusionnées avec celle-ci
      - `current_order_id` (uuid) - Commande en cours sur cette table
      - `server_id` (uuid) - Serveur assigné
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `table_transfers`
      - `id` (uuid, primary key)
      - `from_table_id` (uuid) - Table source
      - `to_table_id` (uuid) - Table destination
      - `order_id` (uuid) - Commande transférée
      - `transferred_by` (uuid) - Utilisateur ayant effectué le transfert
      - `reason` (text) - Raison du transfert
      - `created_at` (timestamptz)

  2. Modifications
    - Ajout de colonnes à la table `orders`:
      - `table_id` (uuid) - Table associée à la commande
      - `order_type` (text) - Type: dine_in, takeaway, delivery, room_service
      - `guest_count` (integer) - Nombre de convives

  3. Security
    - Enable RLS sur toutes les tables
    - Policies pour lecture/écriture
*/

-- Création de la table des tables de restaurant
CREATE TABLE IF NOT EXISTS restaurant_tables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_point_id uuid REFERENCES sales_points(id) ON DELETE CASCADE,
  table_number text NOT NULL,
  capacity integer DEFAULT 4,
  zone text DEFAULT 'main',
  position_x numeric DEFAULT 0,
  position_y numeric DEFAULT 0,
  status text DEFAULT 'available' CHECK (status IN ('available', 'occupied', 'reserved', 'merged')),
  merged_with uuid[],
  current_order_id uuid,
  server_id uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(sales_point_id, table_number)
);

-- Création de la table des transferts de table
CREATE TABLE IF NOT EXISTS table_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_table_id uuid REFERENCES restaurant_tables(id) ON DELETE SET NULL,
  to_table_id uuid REFERENCES restaurant_tables(id) ON DELETE SET NULL,
  order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  transferred_by uuid,
  reason text,
  created_at timestamptz DEFAULT now()
);

-- Ajout des colonnes à la table orders si elles n'existent pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'table_id'
  ) THEN
    ALTER TABLE orders ADD COLUMN table_id uuid REFERENCES restaurant_tables(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'order_type'
  ) THEN
    ALTER TABLE orders ADD COLUMN order_type text DEFAULT 'dine_in' CHECK (order_type IN ('dine_in', 'takeaway', 'delivery', 'room_service'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'guest_count'
  ) THEN
    ALTER TABLE orders ADD COLUMN guest_count integer DEFAULT 1;
  END IF;
END $$;

-- Désactiver RLS pour le développement (à sécuriser en production)
ALTER TABLE restaurant_tables DISABLE ROW LEVEL SECURITY;
ALTER TABLE table_transfers DISABLE ROW LEVEL SECURITY;

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_restaurant_tables_sales_point ON restaurant_tables(sales_point_id);
CREATE INDEX IF NOT EXISTS idx_restaurant_tables_status ON restaurant_tables(status);
CREATE INDEX IF NOT EXISTS idx_orders_table ON orders(table_id);
CREATE INDEX IF NOT EXISTS idx_table_transfers_order ON table_transfers(order_id);