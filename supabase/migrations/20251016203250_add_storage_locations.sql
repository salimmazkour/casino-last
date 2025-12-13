/*
  # Ajout de la gestion des dépôts de stockage

  ## Description
  Création d'un système de gestion des dépôts de stockage pour permettre
  de suivre les stocks par emplacement (Bar Jardin, Économat, Bar Salle de jeux, etc.)
  et d'associer les produits composés à un dépôt spécifique pour le prélèvement des ingrédients.

  ## Nouvelles tables
  1. `storage_locations` - Dépôts de stockage
    - `id` (uuid, primary key)
    - `name` (text) - Nom du dépôt (ex: "Bar Jardin")
    - `code` (text, unique) - Code court (ex: "BAR-JAR")
    - `description` (text) - Description optionnelle
    - `is_active` (boolean) - Statut actif/inactif
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  ## Modifications des tables existantes
  1. `product_stocks` - Ajout de la colonne storage_location_id
    - Lie chaque ligne de stock à un dépôt spécifique
  
  2. `products` - Ajout de la colonne storage_location_id
    - Pour les produits composés, indique le dépôt d'où prélever les ingrédients

  ## Sécurité
  - RLS activé sur storage_locations
  - Policies permettant l'accès avec anon et authenticated
*/

-- Create storage_locations table
CREATE TABLE IF NOT EXISTS storage_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text UNIQUE NOT NULL,
  description text DEFAULT '',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Drop the 'type' column if it exists (cleanup from manual changes)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'storage_locations' AND column_name = 'type'
  ) THEN
    ALTER TABLE storage_locations DROP COLUMN type;
  END IF;
END $$;

-- Add storage_location_id to product_stocks
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'product_stocks' AND column_name = 'storage_location_id'
  ) THEN
    ALTER TABLE product_stocks 
    ADD COLUMN storage_location_id uuid REFERENCES storage_locations(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add storage_location_id to products (for composed products)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'storage_location_id'
  ) THEN
    ALTER TABLE products 
    ADD COLUMN storage_location_id uuid REFERENCES storage_locations(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Enable RLS on storage_locations
ALTER TABLE storage_locations ENABLE ROW LEVEL SECURITY;

-- Create policy for storage_locations
CREATE POLICY "Allow all operations on storage_locations"
  ON storage_locations FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Create index for better performance
DO $$
BEGIN
  -- Index sur product_stocks.storage_location_id seulement si la colonne existe
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'product_stocks' AND column_name = 'storage_location_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_product_stocks_storage_location
      ON product_stocks(storage_location_id);
  END IF;

  -- Index sur products.storage_location_id seulement si la colonne existe
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'storage_location_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_products_storage_location
      ON products(storage_location_id);
  END IF;
END $$;
