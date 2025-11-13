/*
  # Add Product Types System

  ## Description
  This migration adds a product types system to distinguish between different types of products
  (Sales Products, Raw Materials, etc.) and links products to sales points accordingly.

  ## 1. New Tables
  
  ### `product_types` (Types de produits)
    - `id` (uuid, primary key)
    - `name` (text, NOT NULL, unique) - "Produits Vente", "Matières premières", etc.
    - `code` (text, NOT NULL, unique) - "SALES", "RAW_MATERIAL", etc.
    - `description` (text)
    - `can_be_sold` (boolean, DEFAULT false) - Si le type peut être vendu directement
    - `is_active` (boolean, DEFAULT true)
    - `created_at` (timestamptz, DEFAULT now())
    - `updated_at` (timestamptz, DEFAULT now())

  ### `product_sales_points` (Produits par point de vente)
    - `id` (uuid, primary key)
    - `product_id` (uuid, FK vers products)
    - `sales_point_id` (uuid, FK vers sales_points)
    - `is_active` (boolean, DEFAULT true)
    - `created_at` (timestamptz, DEFAULT now())

  ### `product_recipes_by_sales_point` (Recettes par point de vente)
    - `id` (uuid, primary key)
    - `product_id` (uuid, FK vers products) - Le produit composé
    - `sales_point_id` (uuid, FK vers sales_points)
    - `ingredient_id` (uuid, FK vers products) - L'ingrédient
    - `storage_location_id` (uuid, FK vers storage_locations) - Dépôt de stockage
    - `quantity` (numeric, NOT NULL)
    - `created_at` (timestamptz, DEFAULT now())
    - `updated_at` (timestamptz, DEFAULT now())

  ## 2. Changes
    - Add `product_type_id` column to products table
    - Add default product types data

  ## 3. Security
    - RLS disabled for development (will be configured later)
*/

-- Create product_types table
CREATE TABLE IF NOT EXISTS product_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  code text NOT NULL UNIQUE,
  description text DEFAULT '',
  can_be_sold boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create product_sales_points table
CREATE TABLE IF NOT EXISTS product_sales_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sales_point_id uuid NOT NULL REFERENCES sales_points(id) ON DELETE CASCADE,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(product_id, sales_point_id)
);

-- Create product_recipes_by_sales_point table
CREATE TABLE IF NOT EXISTS product_recipes_by_sales_point (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sales_point_id uuid NOT NULL REFERENCES sales_points(id) ON DELETE CASCADE,
  ingredient_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  storage_location_id uuid NOT NULL REFERENCES storage_locations(id),
  quantity numeric(10,3) NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add product_type_id to products table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'product_type_id'
  ) THEN
    ALTER TABLE products ADD COLUMN product_type_id uuid REFERENCES product_types(id);
  END IF;
END $$;

-- Insert default product types
INSERT INTO product_types (name, code, description, can_be_sold) VALUES
  ('Produits Vente', 'SALES', 'Produits destinés à la vente directe aux clients', true),
  ('Matières Premières', 'RAW_MATERIAL', 'Matières premières utilisées dans les recettes', false),
  ('Consommables', 'CONSUMABLE', 'Produits consommables non destinés à la vente', false),
  ('Services', 'SERVICE', 'Services vendus (hébergement, prestations)', true)
ON CONFLICT (code) DO NOTHING;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_products_product_type ON products(product_type_id);
CREATE INDEX IF NOT EXISTS idx_product_sales_points_product ON product_sales_points(product_id);
CREATE INDEX IF NOT EXISTS idx_product_sales_points_sales_point ON product_sales_points(sales_point_id);
CREATE INDEX IF NOT EXISTS idx_product_recipes_sp_product ON product_recipes_by_sales_point(product_id);
CREATE INDEX IF NOT EXISTS idx_product_recipes_sp_sales_point ON product_recipes_by_sales_point(sales_point_id);
CREATE INDEX IF NOT EXISTS idx_product_recipes_sp_ingredient ON product_recipes_by_sales_point(ingredient_id);
