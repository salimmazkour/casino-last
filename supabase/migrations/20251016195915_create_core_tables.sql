/*
  # Création des tables principales de l'ERP

  ## Description
  Ce fichier crée les tables de base pour gérer le complexe hôtel-casino-restauration.

  ## 1. Nouvelles Tables
  
  ### `employees` (Employés)
    - `id` (uuid, clé primaire)
    - `email` (text, unique, NOT NULL)
    - `full_name` (text, NOT NULL)
    - `role` (text, NOT NULL) - Direction, Caissier, Serveur, etc.
    - `hourly_rate` (decimal)
    - `phone` (text)
    - `personal_offer_limit` (integer) - Limite quotidienne d'offerts
    - `allowed_product_families` (jsonb) - Familles de produits autorisées
    - `points_of_sale` (jsonb) - Points de vente assignés
    - `is_active` (boolean, DEFAULT true)
    - `created_at` (timestamptz, DEFAULT now())
    - `updated_at` (timestamptz, DEFAULT now())
  
  ### `sales_points` (Points de vente)
    - `id` (uuid, clé primaire)
    - `name` (text, NOT NULL) - "Restaurant Le Jardin", etc.
    - `type` (text, NOT NULL) - hotel, restaurant, bar, nightclub
    - `opening_time` (time)
    - `closing_time` (time)
    - `has_pos` (boolean, DEFAULT true) - A une caisse tactile
    - `has_tablets` (boolean, DEFAULT false) - A des tablettes serveurs
    - `is_active` (boolean, DEFAULT true)
    - `created_at` (timestamptz, DEFAULT now())
  
  ### `product_categories` (Catégories de produits)
    - `id` (uuid, clé primaire)
    - `name` (text, NOT NULL)
    - `parent_id` (uuid) - Pour sous-catégories
    - `description` (text)
    - `created_at` (timestamptz, DEFAULT now())
  
  ### `products` (Produits)
    - `id` (uuid, clé primaire)
    - `name` (text, NOT NULL)
    - `description` (text)
    - `reference` (text, unique)
    - `category_id` (uuid, FK vers product_categories)
    - `base_price` (decimal, NOT NULL)
    - `cost_price` (decimal) - Coût d'achat
    - `vat_rate` (decimal, DEFAULT 0)
    - `unit` (text) - unité, litre, kg, etc.
    - `barcode` (text)
    - `is_composed` (boolean, DEFAULT false) - Produit composé
    - `components` (jsonb) - Liste des ingrédients si composé
    - `printer_destinations` (jsonb) - Imprimantes cibles
    - `is_active` (boolean, DEFAULT true)
    - `created_at` (timestamptz, DEFAULT now())
    - `updated_at` (timestamptz, DEFAULT now())
  
  ### `room_types` (Types de chambres)
    - `id` (uuid, clé primaire)
    - `name` (text, NOT NULL) - Simple, Supérieure, Suite, etc.
    - `description` (text)
    - `base_price` (decimal, NOT NULL)
    - `day_use_price` (decimal)
    - `capacity` (integer, DEFAULT 2)
    - `created_at` (timestamptz, DEFAULT now())
  
  ### `rooms` (Chambres)
    - `id` (uuid, clé primaire)
    - `room_number` (text, unique, NOT NULL)
    - `room_type_id` (uuid, FK vers room_types)
    - `floor` (integer)
    - `status` (text, DEFAULT 'available') - available, occupied, reserved, dirty, maintenance
    - `last_cleaned` (timestamptz)
    - `notes` (text)
    - `created_at` (timestamptz, DEFAULT now())
    - `updated_at` (timestamptz, DEFAULT now())
  
  ### `suppliers` (Fournisseurs)
    - `id` (uuid, clé primaire)
    - `name` (text, NOT NULL)
    - `contact_person` (text)
    - `email` (text)
    - `phone` (text)
    - `address` (text)
    - `payment_terms` (text)
    - `delivery_delay_days` (integer)
    - `product_categories` (jsonb)
    - `is_active` (boolean, DEFAULT true)
    - `created_at` (timestamptz, DEFAULT now())
  
  ## 2. Sécurité
    - RLS activé sur toutes les tables
    - Politiques pour utilisateurs authentifiés uniquement
*/

-- Table des employés
CREATE TABLE IF NOT EXISTS employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL,
  hourly_rate decimal(10,2),
  phone text,
  personal_offer_limit integer DEFAULT 0,
  allowed_product_families jsonb DEFAULT '[]'::jsonb,
  points_of_sale jsonb DEFAULT '[]'::jsonb,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view employees"
  ON employees FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert employees"
  ON employees FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update employees"
  ON employees FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Table des points de vente
CREATE TABLE IF NOT EXISTS sales_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL,
  opening_time time,
  closing_time time,
  has_pos boolean DEFAULT true,
  has_tablets boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE sales_points ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view sales points"
  ON sales_points FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert sales points"
  ON sales_points FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update sales points"
  ON sales_points FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Table des catégories de produits
CREATE TABLE IF NOT EXISTS product_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  parent_id uuid REFERENCES product_categories(id),
  description text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view product categories"
  ON product_categories FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert product categories"
  ON product_categories FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update product categories"
  ON product_categories FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Table des produits
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  reference text UNIQUE,
  category_id uuid REFERENCES product_categories(id),
  base_price decimal(10,2) NOT NULL,
  cost_price decimal(10,2),
  vat_rate decimal(5,2) DEFAULT 0,
  unit text DEFAULT 'unité',
  barcode text,
  is_composed boolean DEFAULT false,
  components jsonb DEFAULT '[]'::jsonb,
  printer_destinations jsonb DEFAULT '[]'::jsonb,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view products"
  ON products FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert products"
  ON products FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update products"
  ON products FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Table des types de chambres
CREATE TABLE IF NOT EXISTS room_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  base_price decimal(10,2) NOT NULL,
  day_use_price decimal(10,2),
  capacity integer DEFAULT 2,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE room_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view room types"
  ON room_types FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert room types"
  ON room_types FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update room types"
  ON room_types FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Table des chambres
CREATE TABLE IF NOT EXISTS rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_number text UNIQUE NOT NULL,
  room_type_id uuid REFERENCES room_types(id),
  floor integer,
  status text DEFAULT 'available',
  last_cleaned timestamptz,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view rooms"
  ON rooms FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert rooms"
  ON rooms FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update rooms"
  ON rooms FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Table des fournisseurs
CREATE TABLE IF NOT EXISTS suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  contact_person text,
  email text,
  phone text,
  address text,
  payment_terms text,
  delivery_delay_days integer,
  product_categories jsonb DEFAULT '[]'::jsonb,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view suppliers"
  ON suppliers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert suppliers"
  ON suppliers FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update suppliers"
  ON suppliers FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Indexes pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_employees_email ON employees(email);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_reference ON products(reference);
CREATE INDEX IF NOT EXISTS idx_rooms_status ON rooms(status);
CREATE INDEX IF NOT EXISTS idx_rooms_type ON rooms(room_type_id);
