/*
  # Ajout des imprimantes et gestion des stocks

  ## Description
  Ajout des tables pour la gestion des imprimantes et des stocks par point de vente.
  Modification de la table products existante pour ajouter les champs manquants.

  ## Nouvelles tables
  
  ### 1. printers
  Configuration des imprimantes
  - `id` (uuid, PK)
  - `name` (text) - Nom de l'imprimante (ex: "Bar Jardin")
  - `type` (text) - Type (bar, kitchen, receipt, hotel)
  - `ip_address` (text) - Adresse IP
  - `pos_id` (uuid) - Point de vente associé (sales_points)
  - `is_active` (boolean)
  - `created_at` (timestamptz)

  ### 2. product_recipes
  Recettes pour produits composés (ingrédients)
  - `id` (uuid, PK)
  - `product_id` (uuid) - Produit fini
  - `ingredient_id` (uuid) - Produit ingrédient
  - `quantity` (decimal) - Quantité nécessaire
  - `created_at` (timestamptz)

  ### 3. product_stocks
  Stocks par point de vente
  - `id` (uuid, PK)
  - `product_id` (uuid)
  - `pos_id` (uuid) - Point de vente (sales_points)
  - `quantity` (decimal) - Quantité en stock
  - `last_inventory_date` (timestamptz)
  - `updated_at` (timestamptz)

  ## Modifications tables existantes
  
  - Ajout de colonnes manquantes à la table products si nécessaire

  ## Sécurité
  - RLS activé sur toutes les tables
  - Policies pour lecture/écriture authentifiée
*/

-- Table des imprimantes
CREATE TABLE IF NOT EXISTS printers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('bar', 'kitchen', 'receipt', 'hotel')),
  ip_address text,
  pos_id uuid REFERENCES sales_points(id) ON DELETE SET NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Table des recettes (produits composés)
CREATE TABLE IF NOT EXISTS product_recipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  ingredient_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity decimal(10,3) NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(product_id, ingredient_id)
);

-- Table des stocks par point de vente
CREATE TABLE IF NOT EXISTS product_stocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  pos_id uuid NOT NULL REFERENCES sales_points(id) ON DELETE CASCADE,
  quantity decimal(10,2) DEFAULT 0,
  last_inventory_date timestamptz,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(product_id, pos_id)
);

-- Ajout de colonnes manquantes à products si elles n'existent pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'printer_id'
  ) THEN
    ALTER TABLE products ADD COLUMN printer_id uuid REFERENCES printers(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'min_stock_alert'
  ) THEN
    ALTER TABLE products ADD COLUMN min_stock_alert decimal(10,2) DEFAULT 0;
  END IF;
END $$;

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_printers_pos ON printers(pos_id);
CREATE INDEX IF NOT EXISTS idx_product_recipes_product ON product_recipes(product_id);
CREATE INDEX IF NOT EXISTS idx_product_recipes_ingredient ON product_recipes(ingredient_id);
CREATE INDEX IF NOT EXISTS idx_product_stocks_product ON product_stocks(product_id);
CREATE INDEX IF NOT EXISTS idx_product_stocks_pos ON product_stocks(pos_id);
CREATE INDEX IF NOT EXISTS idx_products_printer ON products(printer_id);

-- RLS (Row Level Security)
ALTER TABLE printers ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_stocks ENABLE ROW LEVEL SECURITY;

-- Policies pour printers
CREATE POLICY "Authenticated users can view printers"
  ON printers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert printers"
  ON printers FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update printers"
  ON printers FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete printers"
  ON printers FOR DELETE
  TO authenticated
  USING (true);

-- Policies pour product_recipes
CREATE POLICY "Authenticated users can view recipes"
  ON product_recipes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert recipes"
  ON product_recipes FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update recipes"
  ON product_recipes FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete recipes"
  ON product_recipes FOR DELETE
  TO authenticated
  USING (true);

-- Policies pour product_stocks
CREATE POLICY "Authenticated users can view stocks"
  ON product_stocks FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert stocks"
  ON product_stocks FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update stocks"
  ON product_stocks FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete stocks"
  ON product_stocks FOR DELETE
  TO authenticated
  USING (true);
