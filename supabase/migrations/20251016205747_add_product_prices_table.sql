/*
  # Table de tarification des produits par point de vente

  ## Description
  Cette migration crée une table pour gérer les prix de vente des produits
  selon les différents points de vente (dépôts de stockage).

  ## Nouvelle table
  - `product_prices`
    - `id` (uuid, primary key) - Identifiant unique
    - `product_id` (uuid, foreign key) - Référence au produit
    - `storage_location_id` (uuid, foreign key) - Référence au dépôt/point de vente
    - `selling_price` (decimal) - Prix de vente pour ce point de vente
    - `is_active` (boolean) - Indique si ce prix est actif
    - `created_at` (timestamptz) - Date de création
    - `updated_at` (timestamptz) - Date de dernière modification

  ## Sécurité
  - Active RLS sur la table
  - Politique de lecture pour les utilisateurs authentifiés
  - Politique d'insertion pour les utilisateurs authentifiés
  - Politique de mise à jour pour les utilisateurs authentifiés
  - Politique de suppression pour les utilisateurs authentifiés

  ## Contraintes
  - Un produit ne peut avoir qu'un seul prix actif par point de vente
  - Index sur product_id et storage_location_id pour les performances
*/

-- Create product_prices table
CREATE TABLE IF NOT EXISTS product_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  storage_location_id uuid NOT NULL REFERENCES storage_locations(id) ON DELETE CASCADE,
  selling_price decimal(10,2) NOT NULL DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT unique_product_location UNIQUE(product_id, storage_location_id)
);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_product_prices_product_id ON product_prices(product_id);
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