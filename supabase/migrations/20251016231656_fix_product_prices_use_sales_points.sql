/*
  # Correction de la table product_prices pour utiliser les points de vente

  ## Description
  Cette migration corrige la structure de la table product_prices pour utiliser
  les points de vente (sales_points) au lieu des dépôts de stockage (storage_locations).
  Elle ajoute également une colonne pour lier chaque prix à un dépôt de stockage.

  ## Changements
  1. Suppression de l'ancienne table product_prices
  2. Création de la nouvelle table product_prices avec:
     - `product_id` - Référence au produit
     - `sales_point_id` - Référence au point de vente (où le produit est vendu)
     - `storage_location_id` - Référence au dépôt (où le stock est géré)
     - `selling_price` - Prix de vente pour ce point de vente
     - `is_active` - Indique si ce prix est actif

  ## Exemple d'utilisation
  Pour un Coca vendu au Bar Jardin à 500, stocké dans le Dépôt bar jardin:
  - product_id: ID du Coca
  - sales_point_id: ID du "Bar Jardin"
  - storage_location_id: ID du "Dépôt bar jardin"
  - selling_price: 500

  ## Sécurité
  - Active RLS sur la table
  - Politiques de lecture/écriture pour utilisateurs authentifiés
*/

-- Drop existing table
DROP TABLE IF EXISTS product_prices CASCADE;

-- Create new product_prices table with correct structure
CREATE TABLE IF NOT EXISTS product_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sales_point_id uuid NOT NULL REFERENCES sales_points(id) ON DELETE CASCADE,
  storage_location_id uuid NOT NULL REFERENCES storage_locations(id) ON DELETE CASCADE,
  selling_price decimal(10,2) NOT NULL DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT unique_product_sales_point UNIQUE(product_id, sales_point_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_product_prices_product_id ON product_prices(product_id);
CREATE INDEX IF NOT EXISTS idx_product_prices_sales_point_id ON product_prices(sales_point_id);
CREATE INDEX IF NOT EXISTS idx_product_prices_storage_location_id ON product_prices(storage_location_id);
CREATE INDEX IF NOT EXISTS idx_product_prices_active ON product_prices(is_active) WHERE is_active = true;

-- Enable RLS
ALTER TABLE product_prices ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Users can view product prices"
  ON product_prices FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert product prices"
  ON product_prices FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update product prices"
  ON product_prices FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete product prices"
  ON product_prices FOR DELETE
  TO authenticated
  USING (true);
