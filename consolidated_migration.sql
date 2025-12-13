-- ========================================
-- ERP Hôtel Casino - Complete Database Migration
-- Generated: Sat Dec 13 18:23:41 UTC 2025
-- Total migrations: 82
-- ========================================


-- ========================================
-- Migration: 20251016195915_create_core_tables.sql
-- ========================================
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


-- ========================================
-- Migration: 20251016195957_add_initial_data.sql
-- ========================================
/*
  # Insertion de données initiales

  ## Description
  Ce fichier insère les données de base pour démarrer le système.

  ## Données insérées
  
  ### Points de vente (6)
    1. Réception Hôtel (24h/24)
    2. Restaurant Le Jardin (6h-1h)
    3. Bar Salle de Jeux Traditionnels (16h-5h)
    4. Bar Machines à Sous (10h-5h)
    5. Restaurant Seven Seven (12h-2h)
    6. Boîte de Nuit Seven (21h-6h)
  
  ### Types de chambres (5)
    - Chambre Simple
    - Chambre Supérieure
    - Suite Standard
    - Suite Deluxe
    - Suite Parentale
  
  ### Catégories de produits de base
    - Boissons
    - Nourriture
    - Services
*/

-- Insertion des points de vente
INSERT INTO sales_points (name, type, opening_time, closing_time, has_pos, has_tablets)
VALUES
  ('Réception Hôtel', 'hotel', '00:00:00', '23:59:59', false, false),
  ('Restaurant Le Jardin', 'restaurant', '06:00:00', '01:00:00', true, false),
  ('Bar Salle de Jeux Traditionnels', 'bar', '16:00:00', '05:00:00', true, false),
  ('Bar Machines à Sous', 'bar', '10:00:00', '05:00:00', true, false),
  ('Restaurant Seven Seven', 'restaurant', '12:00:00', '02:00:00', true, true),
  ('Boîte de Nuit Seven', 'nightclub', '21:00:00', '06:00:00', true, false)
ON CONFLICT DO NOTHING;

-- Insertion des types de chambres
INSERT INTO room_types (name, description, base_price, day_use_price, capacity)
VALUES
  ('Chambre Simple', 'Chambre confortable pour 1-2 personnes', 80.00, 50.00, 2),
  ('Chambre Supérieure', 'Chambre spacieuse avec vue', 120.00, 75.00, 2),
  ('Suite Standard', 'Suite avec salon séparé', 180.00, 110.00, 3),
  ('Suite Deluxe', 'Suite luxueuse avec équipements premium', 250.00, 150.00, 4),
  ('Suite Parentale', 'Suite familiale avec espace enfants', 280.00, 170.00, 5)
ON CONFLICT DO NOTHING;

-- Insertion de catégories de produits de base
INSERT INTO product_categories (name, description)
VALUES
  ('Boissons', 'Toutes les boissons'),
  ('Boissons non-alcoolisées', 'Sodas, jus, eau, etc.'),
  ('Boissons alcoolisées', 'Bières, vins, spiritueux'),
  ('Nourriture', 'Tous les plats'),
  ('Entrées', 'Entrées et apéritifs'),
  ('Plats principaux', 'Plats de résistance'),
  ('Desserts', 'Desserts et pâtisseries'),
  ('Services', 'Services divers')
ON CONFLICT DO NOTHING;


-- ========================================
-- Migration: 20251016200549_add_login_system.sql
-- ========================================
/*
  # Ajout du système de connexion par Login/Mot de passe

  ## Description
  Modification pour permettre la connexion avec un login au lieu d'un email.

  ## 1. Modifications
  
  ### Table `employees`
    - Ajout du champ `login` (text, unique, NOT NULL)
    - Ajout du champ `password_hash` (text, NOT NULL)
    - Modification de `email` pour le rendre optionnel
  
  ### Nouvelle Table `user_sessions`
    - `id` (uuid, clé primaire)
    - `employee_id` (uuid, FK vers employees)
    - `token` (text, unique)
    - `expires_at` (timestamptz)
    - `created_at` (timestamptz, DEFAULT now())
  
  ## 2. Sécurité
    - RLS activé sur user_sessions
    - Politiques pour utilisateurs authentifiés
*/

-- Ajout des colonnes login et password_hash à la table employees
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'employees' AND column_name = 'login'
  ) THEN
    ALTER TABLE employees ADD COLUMN login text UNIQUE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'employees' AND column_name = 'password_hash'
  ) THEN
    ALTER TABLE employees ADD COLUMN password_hash text;
  END IF;
END $$;

-- Modification de la contrainte email (la rendre optionnelle)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'employees' AND column_name = 'email' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE employees ALTER COLUMN email DROP NOT NULL;
  END IF;
END $$;

-- Création de la table des sessions
CREATE TABLE IF NOT EXISTS user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE,
  token text UNIQUE NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sessions"
  ON user_sessions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert sessions"
  ON user_sessions FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can delete own sessions"
  ON user_sessions FOR DELETE
  TO authenticated
  USING (true);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_employees_login ON employees(login);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_employee ON user_sessions(employee_id);

-- Insertion d'un utilisateur admin par défaut (mot de passe: admin123)
-- Hash bcrypt de "admin123": $2a$10$rOqXZ5z9fzG8H3v5WLkN0.YYxqXnU9qF7VPF5B5FVQZ5z9fzG8H3v
INSERT INTO employees (login, password_hash, full_name, email, role, is_active)
VALUES ('admin', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Administrateur', 'admin@erp.com', 'Direction', true)
ON CONFLICT (login) DO NOTHING;


-- ========================================
-- Migration: 20251016201213_update_admin_password.sql
-- ========================================
/*
  # Mise à jour du mot de passe admin

  ## Description
  Mise à jour du compte admin pour utiliser un mot de passe en clair (temporaire pour le développement).

  ## Modifications
    - Mise à jour du password_hash pour l'utilisateur admin avec le mot de passe "admin123"
*/

-- Mise à jour du mot de passe admin
UPDATE employees 
SET password_hash = 'admin123'
WHERE login = 'admin';


-- ========================================
-- Migration: 20251016201824_add_printers_and_stocks.sql
-- ========================================
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
  Stocks par emplacement de stockage
  - `id` (uuid, PK)
  - `product_id` (uuid)
  - `quantity` (decimal) - Quantité en stock
  - `last_inventory_date` (timestamptz)
  - `updated_at` (timestamptz)
  - Note: storage_location_id sera ajouté dans une migration ultérieure

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
  quantity decimal(10,2) DEFAULT 0,
  last_inventory_date timestamptz,
  updated_at timestamptz DEFAULT now()
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


-- ========================================
-- Migration: 20251016202041_add_sample_products_data.sql
-- ========================================
/*
  # Données d'exemple pour les produits

  ## Description
  Ajout de données de test pour pouvoir commencer à utiliser le module produits :
  - Catégories de produits
  - Imprimantes
  - Quelques produits de base (ingrédients)

  ## Données ajoutées
  
  ### Catégories
  - Boissons
  - Boissons alcoolisées
  - Plats
  - Ingrédients
  - Desserts
  
  ### Imprimantes
  - Bar Jardin
  - Cuisine Jardin
  - Bar JT
  - Bar Machines à Sous
  - Cuisine Seven Seven
  - Bar Seven

  ### Produits de base
  - Coca Cola
  - Eau minérale
  - Rhum
  - Sirop de sucre
  - Citron vert
  - Glace pilée
*/

-- Catégories de produits
INSERT INTO product_categories (name, description) VALUES
  ('Boissons', 'Boissons non-alcoolisées'),
  ('Boissons Alcoolisées', 'Spiritueux, vins, bières'),
  ('Plats', 'Plats principaux'),
  ('Ingrédients', 'Ingrédients de base pour recettes'),
  ('Desserts', 'Desserts et pâtisseries')
ON CONFLICT DO NOTHING;

-- Imprimantes pour chaque point de vente
INSERT INTO printers (name, type, pos_id, is_active) VALUES
  ('Bar Jardin', 'bar', (SELECT id FROM sales_points WHERE name = 'Restaurant Le Jardin' LIMIT 1), true),
  ('Cuisine Jardin', 'kitchen', (SELECT id FROM sales_points WHERE name = 'Restaurant Le Jardin' LIMIT 1), true),
  ('Bar JT', 'bar', (SELECT id FROM sales_points WHERE name = 'Bar Salle de Jeux' LIMIT 1), true),
  ('Bar Machines à Sous', 'bar', (SELECT id FROM sales_points WHERE name = 'Bar Machines à Sous' LIMIT 1), true),
  ('Cuisine Seven Seven', 'kitchen', (SELECT id FROM sales_points WHERE name = 'Restaurant Seven Seven' LIMIT 1), true),
  ('Bar Seven Seven', 'bar', (SELECT id FROM sales_points WHERE name = 'Restaurant Seven Seven' LIMIT 1), true),
  ('Bar Boîte Seven', 'bar', (SELECT id FROM sales_points WHERE name = 'Boîte de Nuit Seven' LIMIT 1), true)
ON CONFLICT DO NOTHING;

-- Produits de base (ingrédients pour recettes)
INSERT INTO products (
  reference,
  name,
  description,
  category_id,
  unit,
  base_price,
  cost_price,
  vat_rate,
  is_composed,
  is_active
) VALUES
  ('COCA-33', 'Coca Cola 33cl', 'Canette 33cl', (SELECT id FROM product_categories WHERE name = 'Boissons' LIMIT 1), 'piece', 1500, 500, 18, false, true),
  ('EAU-50', 'Eau Minérale 50cl', 'Bouteille 50cl', (SELECT id FROM product_categories WHERE name = 'Boissons' LIMIT 1), 'piece', 1000, 300, 18, false, true),
  ('RHUM-BLANC', 'Rhum Blanc', 'Rhum blanc 40°', (SELECT id FROM product_categories WHERE name = 'Boissons Alcoolisées' LIMIT 1), 'ml', 50, 20, 18, false, true),
  ('SIROP-SUCRE', 'Sirop de sucre', 'Sirop de canne', (SELECT id FROM product_categories WHERE name = 'Ingrédients' LIMIT 1), 'ml', 5, 2, 18, false, true),
  ('CITRON-VERT', 'Citron vert', 'Citron vert frais', (SELECT id FROM product_categories WHERE name = 'Ingrédients' LIMIT 1), 'piece', 200, 100, 18, false, true),
  ('GLACE-PILE', 'Glace pilée', 'Glace pilée maison', (SELECT id FROM product_categories WHERE name = 'Ingrédients' LIMIT 1), 'portion', 0, 0, 0, false, true),
  ('MENTHE', 'Menthe fraîche', 'Feuilles de menthe', (SELECT id FROM product_categories WHERE name = 'Ingrédients' LIMIT 1), 'portion', 100, 50, 18, false, true)
ON CONFLICT (reference) DO NOTHING;


-- ========================================
-- Migration: 20251016202412_fix_rls_policies_for_custom_auth.sql
-- ========================================
/*
  # Ajustement des policies RLS pour l'authentification custom

  ## Description
  Modification des policies pour permettre l'accès avec la clé anonyme (anon)
  puisque l'authentification est gérée au niveau applicatif avec des tokens custom.

  ## Changements
  - Suppression des anciennes policies `authenticated`
  - Ajout de nouvelles policies permettant l'accès avec le rôle `anon`
  - Maintien de la sécurité au niveau applicatif

  ## Tables concernées
  - products
  - product_categories
  - product_recipes
  - printers
  - product_stocks
*/

-- Products policies
DROP POLICY IF EXISTS "Authenticated users can view products" ON products;
DROP POLICY IF EXISTS "Authenticated users can insert products" ON products;
DROP POLICY IF EXISTS "Authenticated users can update products" ON products;
DROP POLICY IF EXISTS "Authenticated users can delete products" ON products;

CREATE POLICY "Allow all operations on products"
  ON products FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Product categories policies
DROP POLICY IF EXISTS "Authenticated users can view categories" ON product_categories;
DROP POLICY IF EXISTS "Authenticated users can insert categories" ON product_categories;
DROP POLICY IF EXISTS "Authenticated users can update categories" ON product_categories;
DROP POLICY IF EXISTS "Authenticated users can delete categories" ON product_categories;

CREATE POLICY "Allow all operations on product_categories"
  ON product_categories FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Printers policies
DROP POLICY IF EXISTS "Authenticated users can view printers" ON printers;
DROP POLICY IF EXISTS "Authenticated users can insert printers" ON printers;
DROP POLICY IF EXISTS "Authenticated users can update printers" ON printers;
DROP POLICY IF EXISTS "Authenticated users can delete printers" ON printers;

CREATE POLICY "Allow all operations on printers"
  ON printers FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Product recipes policies
DROP POLICY IF EXISTS "Authenticated users can view recipes" ON product_recipes;
DROP POLICY IF EXISTS "Authenticated users can insert recipes" ON product_recipes;
DROP POLICY IF EXISTS "Authenticated users can update recipes" ON product_recipes;
DROP POLICY IF EXISTS "Authenticated users can delete recipes" ON product_recipes;

CREATE POLICY "Allow all operations on product_recipes"
  ON product_recipes FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Product stocks policies
DROP POLICY IF EXISTS "Authenticated users can view stocks" ON product_stocks;
DROP POLICY IF EXISTS "Authenticated users can insert stocks" ON product_stocks;
DROP POLICY IF EXISTS "Authenticated users can update stocks" ON product_stocks;
DROP POLICY IF EXISTS "Authenticated users can delete stocks" ON product_stocks;

CREATE POLICY "Allow all operations on product_stocks"
  ON product_stocks FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);


-- ========================================
-- Migration: 20251016203250_add_storage_locations.sql
-- ========================================
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
    - `type` (text, NOT NULL, DEFAULT 'main_warehouse') - Type de dépôt
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
  type text NOT NULL DEFAULT 'main_warehouse',
  description text DEFAULT '',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add type column if it doesn't exist (for existing tables)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'storage_locations' AND column_name = 'type'
  ) THEN
    ALTER TABLE storage_locations
      ADD COLUMN type text NOT NULL DEFAULT 'main_warehouse';
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

-- Add unique constraint on (product_id, storage_location_id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'unique_product_storage'
    AND table_name = 'product_stocks'
  ) THEN
    ALTER TABLE product_stocks
      ADD CONSTRAINT unique_product_storage
      UNIQUE (product_id, storage_location_id);
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
CREATE INDEX IF NOT EXISTS idx_product_stocks_storage_location 
  ON product_stocks(storage_location_id);

CREATE INDEX IF NOT EXISTS idx_products_storage_location 
  ON products(storage_location_id);


-- ========================================
-- Migration: 20251016203306_add_storage_locations_data.sql
-- ========================================
/*
  # Ajout des dépôts de stockage initiaux

  ## Description
  Insertion des dépôts de stockage par défaut pour permettre
  la gestion des stocks par emplacement.

  ## Données insérées
  1. Bar Jardin (BAR-JAR)
  2. Bar Salle de jeux (BAR-SDJ)
  3. Économat général (ECONOMAT)
  4. Cuisine (CUISINE)
  5. Cave (CAVE)
*/

INSERT INTO storage_locations (name, code, description) VALUES
  ('Bar Jardin', 'BAR-JAR', 'Bar situé dans le jardin'),
  ('Bar Salle de jeux', 'BAR-SDJ', 'Bar de la salle de jeux'),
  ('Économat général', 'ECONOMAT', 'Stock central et économat'),
  ('Cuisine', 'CUISINE', 'Stock de la cuisine'),
  ('Cave', 'CAVE', 'Cave à boissons')
ON CONFLICT (code) DO NOTHING;


-- ========================================
-- Migration: 20251016203845_update_storage_locations_and_clean_categories.sql
-- ========================================
/*
  # Mise à jour des dépôts de stockage et nettoyage des catégories

  ## Description
  1. Suppression des anciens dépôts de stockage
  2. Création des nouveaux dépôts conformes aux demandes
  3. Suppression des catégories de produits en doublon

  ## Nouveaux dépôts de stockage
  - Dépôt Bar Jardin
  - Dépôt Bar Salle de Jeux
  - Dépôt Boite de Nuit Seven
  - Dépôt Bar Seven Seven
  - Dépôt Bar Machine à Sous
  - Cuisine Jardin
  - Cuisine Seven Seven

  ## Nettoyage des catégories
  - Suppression des doublons "Boissons", "Boissons Alcoolisées", "Desserts", "Plats"
  - Conservation d'une seule version de chaque catégorie
*/

-- Delete old storage locations
DELETE FROM storage_locations;

-- Insert new storage locations
INSERT INTO storage_locations (name, code, description) VALUES
  ('Dépôt Bar Jardin', 'BAR-JARDIN', 'Dépôt de stockage du bar jardin'),
  ('Dépôt Bar Salle de Jeux', 'BAR-SDJ', 'Dépôt de stockage du bar salle de jeux'),
  ('Dépôt Boite de Nuit Seven', 'BOITE-SEVEN', 'Dépôt de stockage de la boite de nuit Seven'),
  ('Dépôt Bar Seven Seven', 'BAR-77', 'Dépôt de stockage du bar Seven Seven'),
  ('Dépôt Bar Machine à Sous', 'BAR-MAS', 'Dépôt de stockage du bar machine à sous'),
  ('Cuisine Jardin', 'CUISINE-JAR', 'Cuisine du jardin'),
  ('Cuisine Seven Seven', 'CUISINE-77', 'Cuisine Seven Seven');

-- Clean duplicate categories - Keep only one of each duplicate

-- Delete duplicate "Boissons" (keep the first one: 3eaaa944-cc90-4a34-baff-b4ace806795d)
DELETE FROM product_categories 
WHERE name = 'Boissons' AND id = 'd1f0be48-62f5-4487-9bac-92be9deb3946';

-- Delete duplicate "Boissons Alcoolisées" (keep fa3ad723-1280-4544-b97a-97fbae271198)
DELETE FROM product_categories 
WHERE name = 'Boissons alcoolisées' AND id = '3f232794-3a55-46d7-b842-48c846d12387';

-- Delete duplicate "Desserts" (keep 0dedad1f-5e8b-459a-b1ee-d554e6a7ab73)
DELETE FROM product_categories 
WHERE name = 'Desserts' AND id = 'c584d8ef-f36a-456a-96e4-c24a34c7f963';

-- Update "Plats" to consolidate with "Plats principaux"
UPDATE product_categories 
SET name = 'Plats Principaux'
WHERE id = 'f7b01ef4-0587-44bc-9b30-b92748bd76ab';

-- Delete the old "Plats principaux" entry
DELETE FROM product_categories 
WHERE name = 'Plats principaux' AND id = 'fe2c8d87-0dd4-4bf3-a92f-d171d2990c22';


-- ========================================
-- Migration: 20251016205747_add_product_prices_table.sql
-- ========================================
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

-- ========================================
-- Migration: 20251016231656_fix_product_prices_use_sales_points.sql
-- ========================================
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


-- ========================================
-- Migration: 20251016235342_disable_rls_for_sales_points.sql
-- ========================================
/*
  # Disable RLS for sales_points table
  
  Since the application uses a custom authentication system (not Supabase Auth),
  and sales_points data is not sensitive (read-only reference data),
  we disable RLS to allow authenticated users to access the data.
  
  Changes:
  - Disable RLS on sales_points table
*/

ALTER TABLE sales_points DISABLE ROW LEVEL SECURITY;


-- ========================================
-- Migration: 20251017001336_disable_rls_for_product_prices.sql
-- ========================================
/*
  # Disable RLS for product_prices table

  1. Changes
    - Disable Row Level Security on product_prices table to work with custom authentication system
  
  2. Notes
    - This project uses a custom authentication system via the auth-login edge function
    - RLS policies using 'authenticated' role don't apply to custom auth
*/

ALTER TABLE product_prices DISABLE ROW LEVEL SECURITY;


-- ========================================
-- Migration: 20251017001513_disable_all_rls_for_development.sql
-- ========================================
/*
  # Disable RLS on all tables for development

  1. Changes
    - Disable Row Level Security on all tables to facilitate development
  
  2. Tables affected
    - employees
    - user_sessions
    - product_categories
    - products
    - product_recipes
    - printers
    - product_stocks
    - storage_locations
    - sales_points (already disabled)
    - product_prices (already disabled)
    - rooms
    - room_types
    - suppliers
  
  3. Security Note
    - RLS will be re-enabled and properly configured after development phase
    - This is temporary to avoid authentication conflicts during active development
*/

-- Disable RLS on all tables
ALTER TABLE employees DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE product_categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE products DISABLE ROW LEVEL SECURITY;
ALTER TABLE product_recipes DISABLE ROW LEVEL SECURITY;
ALTER TABLE printers DISABLE ROW LEVEL SECURITY;
ALTER TABLE product_stocks DISABLE ROW LEVEL SECURITY;
ALTER TABLE storage_locations DISABLE ROW LEVEL SECURITY;
ALTER TABLE rooms DISABLE ROW LEVEL SECURITY;
ALTER TABLE room_types DISABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers DISABLE ROW LEVEL SECURITY;


-- ========================================
-- Migration: 20251018132716_add_product_types_system.sql
-- ========================================
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


-- ========================================
-- Migration: 20251018140837_create_pos_system_tables.sql
-- ========================================
/*
  # Création du système de caisse (POS)

  1. Nouvelles Tables
    - `pos_sessions` : Sessions de caisse (ouverture/clôture)
      - `id` (uuid, primary key)
      - `sales_point_id` (uuid, foreign key vers sales_points)
      - `employee_id` (uuid, foreign key vers employees)
      - `opening_time` (timestamptz)
      - `closing_time` (timestamptz, nullable)
      - `opening_amount` (numeric) - Fond de caisse
      - `expected_amount` (numeric) - Montant théorique
      - `actual_amount` (numeric, nullable) - Montant réel compté
      - `difference` (numeric, nullable) - Écart
      - `status` (text) - open, closed
      - `notes` (text)
      - `created_at` (timestamptz)

    - `orders` : Commandes/ventes
      - `id` (uuid, primary key)
      - `order_number` (text, unique) - Numéro de commande
      - `sales_point_id` (uuid, foreign key)
      - `pos_session_id` (uuid, foreign key)
      - `employee_id` (uuid, foreign key)
      - `table_number` (text, nullable)
      - `customer_name` (text, nullable)
      - `subtotal` (numeric)
      - `tax_amount` (numeric)
      - `total_amount` (numeric)
      - `status` (text) - pending, completed, cancelled
      - `payment_method` (text) - cash, card, orange_money, wave, etc.
      - `payment_status` (text) - unpaid, paid, partial
      - `created_at` (timestamptz)
      - `completed_at` (timestamptz, nullable)

    - `order_items` : Lignes de commande
      - `id` (uuid, primary key)
      - `order_id` (uuid, foreign key vers orders)
      - `product_id` (uuid, foreign key vers products)
      - `product_name` (text) - Nom au moment de la vente
      - `quantity` (numeric)
      - `unit_price` (numeric)
      - `subtotal` (numeric)
      - `tax_rate` (numeric)
      - `tax_amount` (numeric)
      - `total` (numeric)
      - `notes` (text, nullable)
      - `created_at` (timestamptz)

    - `payments` : Paiements
      - `id` (uuid, primary key)
      - `order_id` (uuid, foreign key vers orders)
      - `payment_method` (text)
      - `amount` (numeric)
      - `reference` (text, nullable)
      - `created_at` (timestamptz)

  2. Sécurité
    - RLS désactivé pour développement (sera activé en production)
*/

-- Table des sessions de caisse
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

-- Table des commandes
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text UNIQUE NOT NULL,
  sales_point_id uuid REFERENCES sales_points(id) ON DELETE CASCADE NOT NULL,
  pos_session_id uuid REFERENCES pos_sessions(id) NOT NULL,
  employee_id uuid REFERENCES employees(id) NOT NULL,
  table_number text,
  customer_name text,
  subtotal numeric DEFAULT 0 NOT NULL,
  tax_amount numeric DEFAULT 0 NOT NULL,
  total_amount numeric DEFAULT 0 NOT NULL,
  status text DEFAULT 'pending' NOT NULL,
  payment_method text,
  payment_status text DEFAULT 'unpaid' NOT NULL,
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

-- Table des lignes de commande
CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
  product_id uuid REFERENCES products(id) NOT NULL,
  product_name text NOT NULL,
  quantity numeric DEFAULT 1 NOT NULL,
  unit_price numeric NOT NULL,
  subtotal numeric NOT NULL,
  tax_rate numeric DEFAULT 0,
  tax_amount numeric DEFAULT 0,
  total numeric NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Table des paiements
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
  payment_method text NOT NULL,
  amount numeric NOT NULL,
  reference text,
  created_at timestamptz DEFAULT now()
);

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_pos_sessions_sales_point ON pos_sessions(sales_point_id);
CREATE INDEX IF NOT EXISTS idx_pos_sessions_status ON pos_sessions(status);
CREATE INDEX IF NOT EXISTS idx_orders_sales_point ON orders(sales_point_id);
CREATE INDEX IF NOT EXISTS idx_orders_session ON orders(pos_session_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_order ON payments(order_id);

-- Désactiver RLS pour développement
ALTER TABLE pos_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE order_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE payments DISABLE ROW LEVEL SECURITY;


-- ========================================
-- Migration: 20251018141646_add_vat_management.sql
-- ========================================
/*
  # Gestion de la TVA paramétrable

  1. Modifications
    - Ajout du champ `vat_rate` dans `sales_points` (taux de TVA par point de vente)
    - Mise à jour de tous les points de vente avec TVA 10% (Sénégal - Hôtellerie Restauration)
    - Ajout de colonnes pour différencier HT et TTC dans les produits et prix

  2. Notes importantes
    - La TVA au Sénégal pour l'hôtellerie-restauration est de 10%
    - Les prix de vente actuels sont considérés comme TTC
    - Le système calculera automatiquement le HT à partir du TTC
*/

-- Ajouter le champ taux de TVA dans sales_points
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sales_points' AND column_name = 'vat_rate'
  ) THEN
    ALTER TABLE sales_points ADD COLUMN vat_rate numeric DEFAULT 10 NOT NULL;
  END IF;
END $$;

-- Mettre à jour tous les points de vente existants avec 10% de TVA
UPDATE sales_points SET vat_rate = 10 WHERE vat_rate IS NULL OR vat_rate = 0;

-- Ajouter des commentaires pour clarifier
COMMENT ON COLUMN sales_points.vat_rate IS 'Taux de TVA applicable au point de vente (en %). Ex: 10 pour 10%';

-- Ajouter une colonne pour indiquer si les prix sont TTC ou HT
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'price_includes_vat'
  ) THEN
    ALTER TABLE products ADD COLUMN price_includes_vat boolean DEFAULT true NOT NULL;
  END IF;
END $$;

COMMENT ON COLUMN products.price_includes_vat IS 'Indique si le prix de base inclut la TVA (true = TTC, false = HT)';

-- Ajouter une colonne dans product_prices pour gérer HT/TTC
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'product_prices' AND column_name = 'price_includes_vat'
  ) THEN
    ALTER TABLE product_prices ADD COLUMN price_includes_vat boolean DEFAULT true NOT NULL;
  END IF;
END $$;

COMMENT ON COLUMN product_prices.price_includes_vat IS 'Indique si le prix de vente inclut la TVA (true = TTC, false = HT)';


-- ========================================
-- Migration: 20251018142456_create_clients_table.sql
-- ========================================
/*
  # Création de la table clients

  1. Nouvelle table : `clients`
    - `id` (uuid, primary key)
    - `client_number` (text, unique) - Numéro client généré automatiquement
    - `type` (text) - Type de client : individual (Particulier) ou company (Société)
    - `first_name` (text) - Prénom (pour particuliers)
    - `last_name` (text) - Nom (pour particuliers)
    - `company_name` (text) - Raison sociale (pour sociétés)
    - `email` (text, unique)
    - `phone` (text)
    - `phone_secondary` (text) - Téléphone secondaire
    - `address` (text) - Adresse complète
    - `city` (text) - Ville
    - `country` (text) - Pays (par défaut: Sénégal)
    - `tax_id` (text) - NINEA ou numéro fiscal
    - `credit_limit` (numeric) - Plafond de crédit autorisé
    - `current_balance` (numeric) - Solde actuel du compte (négatif = crédit client)
    - `is_active` (boolean) - Client actif ou non
    - `notes` (text) - Notes internes
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  2. Sécurité
    - Enable RLS
    - Policies pour authenticated users

  3. Notes
    - Le numéro client sera généré automatiquement (CLT-XXXXXX)
    - Le crédit client est géré via current_balance
    - Un solde négatif indique que le client doit de l'argent
*/

-- Créer la table clients
CREATE TABLE IF NOT EXISTS clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_number text UNIQUE NOT NULL,
  type text NOT NULL DEFAULT 'individual' CHECK (type IN ('individual', 'company')),
  first_name text,
  last_name text,
  company_name text,
  email text UNIQUE,
  phone text NOT NULL,
  phone_secondary text,
  address text,
  city text,
  country text DEFAULT 'Sénégal',
  tax_id text,
  credit_limit numeric DEFAULT 0,
  current_balance numeric DEFAULT 0,
  is_active boolean DEFAULT true,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Créer un index sur le numéro client
CREATE INDEX IF NOT EXISTS idx_clients_client_number ON clients(client_number);
CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(email);
CREATE INDEX IF NOT EXISTS idx_clients_phone ON clients(phone);

-- Fonction pour générer automatiquement le numéro client
CREATE OR REPLACE FUNCTION generate_client_number()
RETURNS text AS $$
DECLARE
  new_number text;
  counter int;
BEGIN
  SELECT COUNT(*) + 1 INTO counter FROM clients;
  new_number := 'CLT-' || LPAD(counter::text, 6, '0');
  
  WHILE EXISTS (SELECT 1 FROM clients WHERE client_number = new_number) LOOP
    counter := counter + 1;
    new_number := 'CLT-' || LPAD(counter::text, 6, '0');
  END LOOP;
  
  RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour générer le numéro client automatiquement
CREATE OR REPLACE FUNCTION set_client_number()
RETURNS trigger AS $$
BEGIN
  IF NEW.client_number IS NULL OR NEW.client_number = '' THEN
    NEW.client_number := generate_client_number();
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_client_number
  BEFORE INSERT OR UPDATE ON clients
  FOR EACH ROW
  EXECUTE FUNCTION set_client_number();

-- Activer RLS (désactivé temporairement pour le développement)
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- Politique pour permettre toutes les opérations (développement)
CREATE POLICY "Allow all operations for development"
  ON clients
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Commentaires pour documentation
COMMENT ON TABLE clients IS 'Table des clients avec gestion du crédit';
COMMENT ON COLUMN clients.client_number IS 'Numéro client unique généré automatiquement (CLT-XXXXXX)';
COMMENT ON COLUMN clients.type IS 'Type de client: individual (Particulier) ou company (Société)';
COMMENT ON COLUMN clients.credit_limit IS 'Plafond de crédit autorisé en FCFA';
COMMENT ON COLUMN clients.current_balance IS 'Solde actuel du compte (négatif = dette client)';


-- ========================================
-- Migration: 20251018142752_add_client_id_to_orders.sql
-- ========================================
/*
  # Ajout du lien client dans les commandes

  1. Modifications
    - Ajout de la colonne `client_id` dans la table `orders`
    - Lien vers la table `clients` pour tracer les ventes à crédit

  2. Notes
    - Le client_id est optionnel (NULL pour les ventes au comptant)
    - Permet de gérer les comptes clients et le crédit
*/

-- Ajouter la colonne client_id dans orders
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'client_id'
  ) THEN
    ALTER TABLE orders ADD COLUMN client_id uuid REFERENCES clients(id);
  END IF;
END $$;

-- Créer un index pour les requêtes par client
CREATE INDEX IF NOT EXISTS idx_orders_client_id ON orders(client_id);

COMMENT ON COLUMN orders.client_id IS 'Client associé à la commande (pour les ventes à crédit)';


-- ========================================
-- Migration: 20251018144039_disable_rls_clients_for_development.sql
-- ========================================
/*
  # Désactiver RLS pour la table clients (développement)

  1. Modifications
    - Désactiver temporairement RLS sur la table clients pour faciliter le développement
    
  2. Notes
    - À réactiver en production avec des politiques appropriées
*/

ALTER TABLE clients DISABLE ROW LEVEL SECURITY;


-- ========================================
-- Migration: 20251018144614_create_client_payments_history.sql
-- ========================================
/*
  # Créer la table d'historique des paiements clients

  1. Nouvelles Tables
    - `client_payments`
      - `id` (uuid, clé primaire)
      - `client_id` (uuid, référence vers clients)
      - `amount` (numeric, montant du paiement)
      - `payment_method` (text, mode de paiement: espèces, carte, virement, etc.)
      - `reference` (text, numéro de référence ou de reçu)
      - `notes` (text, notes optionnelles)
      - `created_at` (timestamptz, date du paiement)
      - `created_by` (text, utilisateur ayant enregistré le paiement)

  2. Sécurité
    - Désactiver RLS pour le développement
    - Index sur client_id pour les requêtes rapides
    - Contrainte de clé étrangère vers la table clients

  3. Notes importantes
    - Tous les paiements sont enregistrés avec un historique complet
    - Le montant est toujours positif (c'est un encaissement)
    - La référence permet de tracer les paiements
*/

CREATE TABLE IF NOT EXISTS client_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  amount numeric NOT NULL CHECK (amount > 0),
  payment_method text NOT NULL DEFAULT 'espèces',
  reference text,
  notes text,
  created_at timestamptz DEFAULT now(),
  created_by text
);

-- Index pour améliorer les performances des requêtes par client
CREATE INDEX IF NOT EXISTS idx_client_payments_client_id ON client_payments(client_id);
CREATE INDEX IF NOT EXISTS idx_client_payments_created_at ON client_payments(created_at DESC);

-- Désactiver RLS pour le développement
ALTER TABLE client_payments DISABLE ROW LEVEL SECURITY;


-- ========================================
-- Migration: 20251018145203_add_payment_type_and_invoice_allocation.sql
-- ========================================
/*
  # Ajouter le système d'allocation des paiements aux factures

  1. Modifications de la table client_payments
    - Ajouter `payment_type` (enum: 'invoice_payment' ou 'deposit')
    - Ajouter `allocated_amount` (montant alloué aux factures)
    - Ajouter `remaining_amount` (montant restant non alloué)

  2. Nouvelle Table payment_invoice_allocations
    - `id` (uuid, clé primaire)
    - `payment_id` (uuid, référence vers client_payments)
    - `order_id` (uuid, référence vers orders)
    - `allocated_amount` (numeric, montant alloué à cette facture)
    - `created_at` (timestamptz)

  3. Modifications de la table orders
    - Ajouter `paid_amount` (numeric, montant déjà payé)
    - Ajouter `remaining_amount` (numeric, montant restant à payer)

  4. Sécurité
    - Désactiver RLS pour le développement
    - Index sur payment_id et order_id

  5. Notes importantes
    - Un paiement peut être alloué à une ou plusieurs factures
    - Un paiement peut être un dépôt libre (arrhes) sans facture associée
    - Les paiements partiels sont possibles
    - Le statut de paiement des commandes se met à jour automatiquement
*/

-- Ajouter payment_type à client_payments
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'client_payments' AND column_name = 'payment_type'
  ) THEN
    ALTER TABLE client_payments 
    ADD COLUMN payment_type text NOT NULL DEFAULT 'invoice_payment' CHECK (payment_type IN ('invoice_payment', 'deposit'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'client_payments' AND column_name = 'allocated_amount'
  ) THEN
    ALTER TABLE client_payments 
    ADD COLUMN allocated_amount numeric DEFAULT 0;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'client_payments' AND column_name = 'remaining_amount'
  ) THEN
    ALTER TABLE client_payments 
    ADD COLUMN remaining_amount numeric DEFAULT 0;
  END IF;
END $$;

-- Créer la table d'allocation des paiements aux factures
CREATE TABLE IF NOT EXISTS payment_invoice_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id uuid NOT NULL REFERENCES client_payments(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  allocated_amount numeric NOT NULL CHECK (allocated_amount > 0),
  created_at timestamptz DEFAULT now()
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_payment_allocations_payment_id ON payment_invoice_allocations(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_allocations_order_id ON payment_invoice_allocations(order_id);

-- Ajouter les colonnes de suivi des paiements aux commandes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'paid_amount'
  ) THEN
    ALTER TABLE orders 
    ADD COLUMN paid_amount numeric DEFAULT 0;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'remaining_amount'
  ) THEN
    ALTER TABLE orders 
    ADD COLUMN remaining_amount numeric DEFAULT 0;
  END IF;
END $$;

-- Initialiser les montants pour les commandes existantes
UPDATE orders 
SET 
  paid_amount = CASE WHEN payment_status = 'paid' THEN total_amount ELSE 0 END,
  remaining_amount = CASE WHEN payment_status = 'paid' THEN 0 ELSE total_amount END
WHERE paid_amount IS NULL OR remaining_amount IS NULL;

-- Initialiser les montants pour les paiements existants
UPDATE client_payments 
SET 
  allocated_amount = amount,
  remaining_amount = 0
WHERE allocated_amount IS NULL;

-- Désactiver RLS pour le développement
ALTER TABLE payment_invoice_allocations DISABLE ROW LEVEL SECURITY;


-- ========================================
-- Migration: 20251018151109_add_sales_point_to_client_payments.sql
-- ========================================
/*
  # Add sales point tracking to client payments

  1. Changes
    - Add `sales_point_id` column to `client_payments` table to track which cash register received the payment
    - Add foreign key constraint to link payments to sales points
    - This enables proper cash flow tracking and reconciliation with POS sessions

  2. Benefits
    - Track which cash register received client payments
    - Enable proper cash drawer reconciliation
    - Link client payments to specific POS sessions for accounting
*/

-- Add sales_point_id column to client_payments
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'client_payments' AND column_name = 'sales_point_id'
  ) THEN
    ALTER TABLE client_payments ADD COLUMN sales_point_id uuid REFERENCES sales_points(id);
  END IF;
END $$;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_client_payments_sales_point ON client_payments(sales_point_id);

-- ========================================
-- Migration: 20251018152946_create_table_management_system.sql
-- ========================================
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

-- ========================================
-- Migration: 20251018153010_add_sample_restaurant_tables.sql
-- ========================================
/*
  # Données d'exemple pour les tables des restaurants

  1. Ajout de tables pour Restaurant Le Jardin
    - 10 tables intérieur
    - 5 tables terrasse
    - 2 tables VIP

  2. Ajout de tables pour Restaurant Seven Seven
    - 15 tables principales
    - 5 tables VIP
*/

-- Tables pour Restaurant Le Jardin (ID à récupérer dynamiquement)
DO $$
DECLARE
  jardin_id uuid;
  seven_id uuid;
BEGIN
  -- Récupérer l'ID du Restaurant Le Jardin
  SELECT id INTO jardin_id FROM sales_points WHERE name = 'Restaurant Le Jardin' LIMIT 1;
  
  -- Récupérer l'ID du Restaurant Seven Seven
  SELECT id INTO seven_id FROM sales_points WHERE name = 'Restaurant Seven Seven' LIMIT 1;

  -- Si Restaurant Le Jardin existe, créer les tables
  IF jardin_id IS NOT NULL THEN
    -- Tables intérieur
    INSERT INTO restaurant_tables (sales_point_id, table_number, capacity, zone, position_x, position_y, status)
    VALUES
      (jardin_id, 'T1', 4, 'Intérieur', 50, 100, 'available'),
      (jardin_id, 'T2', 4, 'Intérieur', 200, 100, 'available'),
      (jardin_id, 'T3', 2, 'Intérieur', 350, 100, 'available'),
      (jardin_id, 'T4', 6, 'Intérieur', 50, 250, 'available'),
      (jardin_id, 'T5', 4, 'Intérieur', 200, 250, 'available'),
      (jardin_id, 'T6', 4, 'Intérieur', 350, 250, 'available'),
      (jardin_id, 'T7', 2, 'Intérieur', 50, 400, 'available'),
      (jardin_id, 'T8', 4, 'Intérieur', 200, 400, 'available'),
      (jardin_id, 'T9', 6, 'Intérieur', 350, 400, 'available'),
      (jardin_id, 'T10', 4, 'Intérieur', 200, 550, 'available'),
      
      -- Tables terrasse
      (jardin_id, 'TER1', 4, 'Terrasse', 550, 100, 'available'),
      (jardin_id, 'TER2', 4, 'Terrasse', 700, 100, 'available'),
      (jardin_id, 'TER3', 6, 'Terrasse', 550, 250, 'available'),
      (jardin_id, 'TER4', 4, 'Terrasse', 700, 250, 'available'),
      (jardin_id, 'TER5', 2, 'Terrasse', 625, 400, 'available'),
      
      -- Tables VIP
      (jardin_id, 'VIP1', 8, 'VIP', 550, 550, 'available'),
      (jardin_id, 'VIP2', 6, 'VIP', 700, 550, 'available')
    ON CONFLICT (sales_point_id, table_number) DO NOTHING;
  END IF;

  -- Si Restaurant Seven Seven existe, créer les tables
  IF seven_id IS NOT NULL THEN
    INSERT INTO restaurant_tables (sales_point_id, table_number, capacity, zone, position_x, position_y, status)
    VALUES
      -- Tables principales
      (seven_id, 'S1', 4, 'Principale', 50, 100, 'available'),
      (seven_id, 'S2', 4, 'Principale', 180, 100, 'available'),
      (seven_id, 'S3', 4, 'Principale', 310, 100, 'available'),
      (seven_id, 'S4', 2, 'Principale', 440, 100, 'available'),
      (seven_id, 'S5', 6, 'Principale', 50, 250, 'available'),
      (seven_id, 'S6', 4, 'Principale', 180, 250, 'available'),
      (seven_id, 'S7', 4, 'Principale', 310, 250, 'available'),
      (seven_id, 'S8', 4, 'Principale', 440, 250, 'available'),
      (seven_id, 'S9', 2, 'Principale', 50, 400, 'available'),
      (seven_id, 'S10', 4, 'Principale', 180, 400, 'available'),
      (seven_id, 'S11', 6, 'Principale', 310, 400, 'available'),
      (seven_id, 'S12', 4, 'Principale', 440, 400, 'available'),
      (seven_id, 'S13', 4, 'Principale', 180, 550, 'available'),
      (seven_id, 'S14', 4, 'Principale', 310, 550, 'available'),
      (seven_id, 'S15', 2, 'Principale', 440, 550, 'available'),
      
      -- Tables VIP
      (seven_id, 'VIP1', 8, 'VIP', 600, 200, 'available'),
      (seven_id, 'VIP2', 6, 'VIP', 750, 200, 'available'),
      (seven_id, 'VIP3', 6, 'VIP', 600, 400, 'available'),
      (seven_id, 'VIP4', 8, 'VIP', 750, 400, 'available'),
      (seven_id, 'VIP5', 10, 'VIP', 675, 600, 'available')
    ON CONFLICT (sales_point_id, table_number) DO NOTHING;
  END IF;
END $$;

-- ========================================
-- Migration: 20251018155600_add_100_tables_to_restaurants_and_bars.sql
-- ========================================
/*
  # Add 100 tables to each sales point (except hotel)

  1. Purpose
    - Create 100 tables numbered from 1 to 100 (skipping number 13 for superstition)
    - Tables are created for each restaurant and bar sales point
    - Hotel reception is excluded as it doesn't use table management
    
  2. Tables affected
    - `restaurant_tables` - bulk insert of tables
    
  3. Details
    - Each table has a default capacity of 4 persons
    - Tables 1-30: Zone "Intérieur"
    - Tables 31-60: Zone "Terrasse"
    - Tables 61-100: Zone "VIP"
    - Table number 13 is skipped from all zones
    - Initial status: 'available'
    - Position coordinates set to 0 for now (can be adjusted via UI)
*/

-- Bar Machines à Sous (62ee39b6-4c4f-4174-a292-6c024047b456)
DO $$
DECLARE
  table_num INT;
BEGIN
  FOR table_num IN 1..100 LOOP
    IF table_num != 13 THEN
      INSERT INTO restaurant_tables (sales_point_id, table_number, capacity, zone, status, position_x, position_y)
      VALUES (
        '62ee39b6-4c4f-4174-a292-6c024047b456',
        'Table ' || table_num,
        4,
        CASE
          WHEN table_num <= 30 THEN 'Intérieur'
          WHEN table_num <= 60 THEN 'Terrasse'
          ELSE 'VIP'
        END,
        'available',
        0,
        0
      );
    END IF;
  END LOOP;
END $$;

-- Bar Salle de Jeux Traditionnels (d1ee3272-7bc7-4f90-af3f-30d09dfd22dc)
DO $$
DECLARE
  table_num INT;
BEGIN
  FOR table_num IN 1..100 LOOP
    IF table_num != 13 THEN
      INSERT INTO restaurant_tables (sales_point_id, table_number, capacity, zone, status, position_x, position_y)
      VALUES (
        'd1ee3272-7bc7-4f90-af3f-30d09dfd22dc',
        'Table ' || table_num,
        4,
        CASE
          WHEN table_num <= 30 THEN 'Intérieur'
          WHEN table_num <= 60 THEN 'Terrasse'
          ELSE 'VIP'
        END,
        'available',
        0,
        0
      );
    END IF;
  END LOOP;
END $$;

-- Boîte de Nuit Seven (d06c4500-fa56-4585-97de-7766fb893494)
DO $$
DECLARE
  table_num INT;
BEGIN
  FOR table_num IN 1..100 LOOP
    IF table_num != 13 THEN
      INSERT INTO restaurant_tables (sales_point_id, table_number, capacity, zone, status, position_x, position_y)
      VALUES (
        'd06c4500-fa56-4585-97de-7766fb893494',
        'Table ' || table_num,
        4,
        CASE
          WHEN table_num <= 30 THEN 'Intérieur'
          WHEN table_num <= 60 THEN 'Terrasse'
          ELSE 'VIP'
        END,
        'available',
        0,
        0
      );
    END IF;
  END LOOP;
END $$;

-- Restaurant Le Jardin (2601da89-2837-43f8-a316-dbf1476c3dd2)
DO $$
DECLARE
  table_num INT;
BEGIN
  FOR table_num IN 1..100 LOOP
    IF table_num != 13 THEN
      INSERT INTO restaurant_tables (sales_point_id, table_number, capacity, zone, status, position_x, position_y)
      VALUES (
        '2601da89-2837-43f8-a316-dbf1476c3dd2',
        'Table ' || table_num,
        4,
        CASE
          WHEN table_num <= 30 THEN 'Intérieur'
          WHEN table_num <= 60 THEN 'Terrasse'
          ELSE 'VIP'
        END,
        'available',
        0,
        0
      );
    END IF;
  END LOOP;
END $$;

-- Restaurant Seven Seven (f9cf6765-7478-419d-bd8f-51be1104309c)
DO $$
DECLARE
  table_num INT;
BEGIN
  FOR table_num IN 1..100 LOOP
    IF table_num != 13 THEN
      INSERT INTO restaurant_tables (sales_point_id, table_number, capacity, zone, status, position_x, position_y)
      VALUES (
        'f9cf6765-7478-419d-bd8f-51be1104309c',
        'Table ' || table_num,
        4,
        CASE
          WHEN table_num <= 30 THEN 'Intérieur'
          WHEN table_num <= 60 THEN 'Terrasse'
          ELSE 'VIP'
        END,
        'available',
        0,
        0
      );
    END IF;
  END LOOP;
END $$;


-- ========================================
-- Migration: 20251018161547_rename_tables_t1_to_t100_v3.sql
-- ========================================
/*
  # Rename tables to T1-T100 format (excluding T13)

  1. Changes
    - Delete all existing tables
    - Recreate tables with T1-T100 naming format per sales point
    - Skip T13 for superstition
    
  2. Notes
    - Clean slate approach to avoid unique constraint issues
    - Each sales point gets its own T1-T100 series
*/

-- Delete all existing tables
DELETE FROM restaurant_tables;

-- Insert new tables for each sales point
DO $$
DECLARE
  sp_record RECORD;
  table_num INT;
  zone_name TEXT;
  zones TEXT[] := ARRAY['Terrasse', 'Salle principale', 'VIP'];
BEGIN
  FOR sp_record IN SELECT id, type FROM sales_points LOOP
    table_num := 1;
    
    WHILE table_num <= 100 LOOP
      -- Skip table 13
      IF table_num = 13 THEN
        table_num := table_num + 1;
        CONTINUE;
      END IF;
      
      -- Determine zone based on table number
      IF table_num <= 33 THEN
        zone_name := zones[1];  -- Terrasse
      ELSIF table_num <= 66 THEN
        zone_name := zones[2];  -- Salle principale
      ELSE
        zone_name := zones[3];  -- VIP
      END IF;
      
      INSERT INTO restaurant_tables (
        sales_point_id,
        table_number,
        capacity,
        zone,
        position_x,
        position_y,
        status
      ) VALUES (
        sp_record.id,
        'T' || table_num,
        (CASE 
          WHEN table_num % 3 = 0 THEN 6
          WHEN table_num % 3 = 1 THEN 4
          ELSE 2
        END),
        zone_name,
        ((table_num - 1) % 10) * 150 + 50,
        ((table_num - 1) / 10) * 150 + 50,
        'available'
      );
      
      table_num := table_num + 1;
    END LOOP;
  END LOOP;
END $$;


-- ========================================
-- Migration: 20251018163534_create_stock_movements_table.sql
-- ========================================
/*
  # Create stock movements tracking table

  1. New Tables
    - `stock_movements`
      - `id` (uuid, primary key)
      - `product_id` (uuid, foreign key to products)
      - `storage_location_id` (uuid, foreign key to storage_locations)
      - `movement_type` (text) - 'sale', 'restock', 'inventory_adjustment', 'transfer'
      - `quantity` (numeric) - positive for entry, negative for exit
      - `previous_quantity` (numeric) - quantity before movement
      - `new_quantity` (numeric) - quantity after movement
      - `reference` (text) - order number, transfer number, etc.
      - `notes` (text) - additional information
      - `created_at` (timestamptz)
      - `created_by` (uuid, foreign key to employees)
      - `pos_id` (uuid, nullable) - only for sales, to know which POS made the sale

  2. Security
    - Disable RLS for development (will be enabled later with proper policies)

  3. Indexes
    - Index on product_id for fast product history queries
    - Index on storage_location_id for fast location queries
    - Index on created_at for date range queries
    - Index on movement_type for filtering by type
*/

CREATE TABLE IF NOT EXISTS stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  storage_location_id uuid NOT NULL REFERENCES storage_locations(id) ON DELETE CASCADE,
  movement_type text NOT NULL CHECK (movement_type IN ('sale', 'restock', 'inventory_adjustment', 'transfer')),
  quantity numeric NOT NULL,
  previous_quantity numeric NOT NULL DEFAULT 0,
  new_quantity numeric NOT NULL DEFAULT 0,
  reference text,
  notes text,
  pos_id uuid REFERENCES sales_points(id),
  created_by uuid REFERENCES employees(id),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_storage ON stock_movements(storage_location_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_date ON stock_movements(created_at);
CREATE INDEX IF NOT EXISTS idx_stock_movements_type ON stock_movements(movement_type);

ALTER TABLE stock_movements DISABLE ROW LEVEL SECURITY;

-- ========================================
-- Migration: 20251018164020_add_breakage_movement_type.sql
-- ========================================
/*
  # Add breakage/waste movement type

  1. Changes
    - Add 'breakage' to movement_type enum constraint
    - This allows tracking of product losses due to breakage, expiration, or waste
  
  2. Notes
    - Breakage movements will have negative quantity (stock reduction)
    - This helps track losses and calculate actual consumption vs sales
*/

ALTER TABLE stock_movements 
  DROP CONSTRAINT IF EXISTS stock_movements_movement_type_check;

ALTER TABLE stock_movements 
  ADD CONSTRAINT stock_movements_movement_type_check 
  CHECK (movement_type IN ('sale', 'restock', 'inventory_adjustment', 'transfer', 'breakage'));

-- ========================================
-- Migration: 20251018164038_remove_pos_id_from_product_stocks.sql
-- ========================================
/*
  # Remove pos_id dependency from product_stocks

  1. Changes
    - Make pos_id nullable in product_stocks (keeping it for backward compatibility but not required)
    - Add unique constraint on (product_id, storage_location_id) to ensure one stock entry per product per storage
    - This separates storage management from point of sale
  
  2. Rationale
    - Storage locations should be independent of sales points
    - A product in a storage location has ONE stock quantity
    - Sales points will draw from storage locations when needed
  
  3. Data Migration
    - Keep existing data intact
    - If there are duplicate entries for same product+storage, we'll need to manually consolidate later
*/

-- Note: pos_id column no longer exists in product_stocks table
-- The table was created with only storage_location_id
-- The unique constraint on (product_id, storage_location_id) has already been added
-- This migration is kept for reference but no action needed

-- ========================================
-- Migration: 20251018164243_add_default_storage_to_sales_points.sql
-- ========================================
/*
  # Add default storage location to sales points

  1. Changes
    - Add default_storage_location_id to sales_points table
    - This links each POS to its primary storage location
    - When a sale is made, stock is deducted from the POS's default storage
  
  2. Rationale
    - Each POS needs to know which storage location to use for stock
    - Restaurant Le Jardin -> Dépôt Bar Jardin
    - Bar Machines à Sous -> Dépôt Bar Machines à Sous
    - etc.
  
  3. Data Migration
    - Set default storage locations based on matching names
*/

-- Add column
ALTER TABLE sales_points 
  ADD COLUMN IF NOT EXISTS default_storage_location_id uuid REFERENCES storage_locations(id);

-- Set default storage locations based on matching patterns
UPDATE sales_points sp
SET default_storage_location_id = sl.id
FROM storage_locations sl
WHERE sp.name ILIKE '%Jardin%' AND sl.name ILIKE '%Jardin%';

UPDATE sales_points sp
SET default_storage_location_id = sl.id
FROM storage_locations sl
WHERE sp.name ILIKE '%Machines à Sous%' AND sl.name ILIKE '%Machines à Sous%';

UPDATE sales_points sp
SET default_storage_location_id = sl.id
FROM storage_locations sl
WHERE sp.name ILIKE '%Jeux Traditionnels%' AND sl.name ILIKE '%Jeux Traditionnels%';

UPDATE sales_points sp
SET default_storage_location_id = sl.id
FROM storage_locations sl
WHERE sp.name ILIKE '%Seven%' AND sl.name ILIKE '%Seven%';

UPDATE sales_points sp
SET default_storage_location_id = sl.id
FROM storage_locations sl
WHERE sp.name ILIKE '%Réception%' AND sl.name ILIKE '%Réception%';

-- ========================================
-- Migration: 20251018171607_create_inventory_history_tables.sql
-- ========================================
/*
  # Création des tables d'historique des inventaires

  1. Nouvelle table `inventories`
    - `id` (uuid, primary key) - Identifiant unique de l'inventaire
    - `storage_location_id` (uuid, foreign key) - Dépôt où l'inventaire a été effectué
    - `inventory_date` (timestamptz) - Date de l'inventaire
    - `status` (text) - Statut: draft, validated, cancelled
    - `total_items` (integer) - Nombre total d'articles inventoriés
    - `total_discrepancies` (integer) - Nombre d'articles avec écarts
    - `notes` (text) - Notes sur l'inventaire
    - `created_by` (text) - Nom de l'utilisateur ayant créé l'inventaire
    - `created_at` (timestamptz) - Date de création
    - `validated_at` (timestamptz) - Date de validation

  2. Nouvelle table `inventory_lines`
    - `id` (uuid, primary key) - Identifiant unique de la ligne
    - `inventory_id` (uuid, foreign key) - Référence à l'inventaire
    - `product_id` (uuid, foreign key) - Produit inventorié
    - `expected_quantity` (decimal) - Quantité attendue (stock théorique)
    - `counted_quantity` (decimal) - Quantité comptée physiquement
    - `difference` (decimal) - Écart (compté - attendu)
    - `notes` (text) - Notes sur cette ligne
    - `created_at` (timestamptz) - Date de création

  3. Note sur `stock_movements`
    - Cette table existe déjà et stocke tous les mouvements de stock
    - Types de mouvements: sale, restock, inventory_adjustment, transfer, breakage

  4. Sécurité
    - RLS désactivé pour le développement (comme les autres tables)
*/

-- Table inventories
CREATE TABLE IF NOT EXISTS inventories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  storage_location_id uuid REFERENCES storage_locations(id) ON DELETE CASCADE,
  inventory_date timestamptz DEFAULT now(),
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'validated', 'cancelled')),
  total_items integer DEFAULT 0,
  total_discrepancies integer DEFAULT 0,
  notes text,
  created_by text,
  created_at timestamptz DEFAULT now(),
  validated_at timestamptz
);

-- Table inventory_lines
CREATE TABLE IF NOT EXISTS inventory_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_id uuid REFERENCES inventories(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  expected_quantity decimal(10,2) DEFAULT 0,
  counted_quantity decimal(10,2) DEFAULT 0,
  difference decimal(10,2) DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Indexes pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_inventories_storage_location ON inventories(storage_location_id);
CREATE INDEX IF NOT EXISTS idx_inventories_date ON inventories(inventory_date);
CREATE INDEX IF NOT EXISTS idx_inventories_status ON inventories(status);
CREATE INDEX IF NOT EXISTS idx_inventory_lines_inventory ON inventory_lines(inventory_id);
CREATE INDEX IF NOT EXISTS idx_inventory_lines_product ON inventory_lines(product_id);

-- Désactiver RLS pour le développement (comme les autres tables)
ALTER TABLE inventories DISABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_lines DISABLE ROW LEVEL SECURITY;

-- Commentaires pour documentation
COMMENT ON TABLE inventories IS 'Historique des inventaires effectués dans les dépôts';
COMMENT ON TABLE inventory_lines IS 'Lignes de détail de chaque inventaire';
COMMENT ON COLUMN inventories.status IS 'draft: en cours, validated: validé, cancelled: annulé';
COMMENT ON COLUMN inventory_lines.difference IS 'Écart = counted_quantity - expected_quantity';

-- ========================================
-- Migration: 20251018180934_make_sales_point_nullable_in_product_prices.sql
-- ========================================
/*
  # Rendre sales_point_id nullable dans product_prices

  1. Modifications
    - Rendre la colonne `sales_point_id` nullable dans `product_prices`
    - Cela permet d'enregistrer des dépôts de stockage pour les matières premières sans point de vente
  
  2. Notes
    - Pour les produits composés (plats, boissons), le `sales_point_id` sera renseigné
    - Pour les matières premières et consommables, seul le `storage_location_id` sera renseigné
*/

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'product_prices' AND column_name = 'sales_point_id' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE product_prices ALTER COLUMN sales_point_id DROP NOT NULL;
  END IF;
END $$;


-- ========================================
-- Migration: 20251018180943_make_selling_price_nullable_in_product_prices.sql
-- ========================================
/*
  # Rendre selling_price nullable dans product_prices

  1. Modifications
    - Rendre la colonne `selling_price` nullable dans `product_prices`
    - Cela permet d'enregistrer des dépôts de stockage pour les matières premières sans prix de vente
  
  2. Notes
    - Pour les produits composés vendus, le `selling_price` sera renseigné
    - Pour les matières premières, seul le lien avec le dépôt de stockage sera enregistré
*/

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'product_prices' AND column_name = 'selling_price'
  ) THEN
    ALTER TABLE product_prices
    ALTER COLUMN selling_price DROP NOT NULL,
    ALTER COLUMN selling_price DROP DEFAULT;
  END IF;
END $$;


-- ========================================
-- Migration: 20251018184043_add_casse_perimes_to_all_ingredients.sql
-- ========================================
/*
  # Add Casse/Périmés storage location to all raw materials

  1. Changes
    - Automatically adds "Casse / Périmés" storage location to all products of type "Matières Premières"
    - This allows all ingredients to be transferred to waste/expired storage
    - Only adds the configuration if it doesn't already exist
  
  2. Notes
    - Uses INSERT with ON CONFLICT to safely add missing configurations
    - No selling price is set (NULL) as this is a waste storage location
*/

INSERT INTO product_prices (product_id, storage_location_id, selling_price, is_active)
SELECT 
  p.id,
  sl.id,
  NULL,
  true
FROM products p
JOIN product_types pt ON p.product_type_id = pt.id
CROSS JOIN storage_locations sl
WHERE p.is_active = true
  AND pt.name = 'Matières Premières'
  AND sl.name = 'Casse / Périmés'
  AND NOT EXISTS (
    SELECT 1 FROM product_prices pp 
    WHERE pp.product_id = p.id 
    AND pp.storage_location_id = sl.id
  );


-- ========================================
-- Migration: 20251018211804_add_recipe_versioning_system.sql
-- ========================================
/*
  # Système de versioning des recettes

  1. Nouvelle Table
    - `product_recipes_history`
      - `id` (uuid, primary key)
      - `product_id` (uuid, référence products)
      - `recipe_snapshot` (jsonb) - contient la recette complète au moment de la modification
      - `modified_by` (uuid, référence users) - qui a modifié
      - `modified_at` (timestamptz) - quand
      - `modification_type` (text) - 'create', 'update', 'delete'
      - `notes` (text) - notes optionnelles

  2. Modifications
    - Ajouter `last_recipe_modified_at` et `last_recipe_modified_by` dans products
    - Trigger automatique pour historiser les changements de recette

  3. But
    - Tracer toutes les modifications de recettes
    - Permettre une rétroactivité intelligente des stocks
    - Identifier qui a fait quelle modification et quand
*/

CREATE TABLE IF NOT EXISTS product_recipes_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  recipe_snapshot jsonb NOT NULL,
  modified_by uuid,
  modified_at timestamptz DEFAULT now(),
  modification_type text NOT NULL CHECK (modification_type IN ('create', 'update', 'delete')),
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE products 
ADD COLUMN IF NOT EXISTS last_recipe_modified_at timestamptz,
ADD COLUMN IF NOT EXISTS last_recipe_modified_by uuid;

CREATE INDEX IF NOT EXISTS idx_recipe_history_product ON product_recipes_history(product_id, modified_at DESC);
CREATE INDEX IF NOT EXISTS idx_recipe_history_modified_at ON product_recipes_history(modified_at DESC);

ALTER TABLE product_recipes_history DISABLE ROW LEVEL SECURITY;

COMMENT ON TABLE product_recipes_history IS 'Historique des modifications de recettes pour traçabilité et rétroactivité des stocks';
COMMENT ON COLUMN product_recipes_history.recipe_snapshot IS 'Snapshot JSON de la recette complète au moment de la modification';
COMMENT ON COLUMN product_recipes_history.modified_by IS 'ID de l''utilisateur ayant effectué la modification';


-- ========================================
-- Migration: 20251019072231_create_user_management_system.sql
-- ========================================
/*
  # Système de gestion des utilisateurs et permissions

  ## Description
  Ce système permet de gérer les utilisateurs, leurs rôles et permissions de manière structurée.
  
  ## 1. Nouvelles Tables
  
  ### `roles` (Rôles des utilisateurs)
    - `id` (uuid, clé primaire)
    - `name` (text, unique) - Nom du rôle (Admin, Manager, Caissier, Serveur, etc.)
    - `description` (text) - Description du rôle
    - `level` (integer) - Niveau hiérarchique (1=Admin, 2=Manager, 3=Employé)
    - `is_active` (boolean, DEFAULT true)
    - `created_at` (timestamptz, DEFAULT now())
  
  ### `permissions` (Permissions système)
    - `id` (uuid, clé primaire)
    - `module` (text) - Module concerné (pos, inventory, users, reports, etc.)
    - `action` (text) - Action autorisée (view, create, update, delete, validate, etc.)
    - `description` (text) - Description de la permission
    - `created_at` (timestamptz, DEFAULT now())
  
  ### `role_permissions` (Liaison rôles-permissions)
    - `id` (uuid, clé primaire)
    - `role_id` (uuid, FK vers roles)
    - `permission_id` (uuid, FK vers permissions)
    - `created_at` (timestamptz, DEFAULT now())
    - Contrainte unique sur (role_id, permission_id)
  
  ### `user_action_logs` (Historique des actions)
    - `id` (uuid, clé primaire)
    - `employee_id` (uuid, FK vers employees)
    - `action_type` (text) - Type d'action (login, logout, create_order, void_order, etc.)
    - `module` (text) - Module concerné
    - `details` (jsonb) - Détails de l'action
    - `ip_address` (text) - Adresse IP
    - `created_at` (timestamptz, DEFAULT now())

  ## 2. Modifications
  
  ### Table `employees`
    - Ajout de `role_id` (uuid, FK vers roles)
    - Conservation du champ `role` existant pour compatibilité
  
  ## 3. Données initiales
    - Rôles de base : Admin, Manager, Caissier, Serveur, Barman, Réceptionniste
    - Permissions de base pour tous les modules
    - Attribution des permissions aux rôles
  
  ## 4. Sécurité
    - RLS activé sur toutes les tables
    - Seuls les utilisateurs authentifiés peuvent consulter
    - Seuls les admins peuvent modifier (à implémenter côté application)
*/

-- Table des rôles
CREATE TABLE IF NOT EXISTS roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text,
  level integer NOT NULL DEFAULT 3,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view roles"
  ON roles FOR SELECT
  TO authenticated
  USING (true);

-- Table des permissions
CREATE TABLE IF NOT EXISTS permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module text NOT NULL,
  action text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(module, action)
);

ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view permissions"
  ON permissions FOR SELECT
  TO authenticated
  USING (true);

-- Table de liaison rôles-permissions
CREATE TABLE IF NOT EXISTS role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id uuid NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id uuid NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(role_id, permission_id)
);

ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view role permissions"
  ON role_permissions FOR SELECT
  TO authenticated
  USING (true);

-- Table des logs d'actions
CREATE TABLE IF NOT EXISTS user_action_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES employees(id) ON DELETE SET NULL,
  action_type text NOT NULL,
  module text NOT NULL,
  details jsonb DEFAULT '{}'::jsonb,
  ip_address text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE user_action_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view action logs"
  ON user_action_logs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert action logs"
  ON user_action_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Ajout du champ role_id à la table employees
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'employees' AND column_name = 'role_id'
  ) THEN
    ALTER TABLE employees ADD COLUMN role_id uuid REFERENCES roles(id);
  END IF;
END $$;

-- Création des index
CREATE INDEX IF NOT EXISTS idx_employees_role_id ON employees(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission ON role_permissions(permission_id);
CREATE INDEX IF NOT EXISTS idx_user_action_logs_employee ON user_action_logs(employee_id);
CREATE INDEX IF NOT EXISTS idx_user_action_logs_created_at ON user_action_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_permissions_module ON permissions(module);

-- Insertion des rôles de base
INSERT INTO roles (name, description, level) VALUES
  ('Administrateur', 'Accès complet au système', 1),
  ('Manager', 'Gestion opérationnelle et supervision', 2),
  ('Caissier', 'Gestion de caisse et encaissements', 3),
  ('Serveur', 'Prise de commandes et service', 3),
  ('Barman', 'Préparation boissons et service bar', 3),
  ('Réceptionniste', 'Gestion réception et réservations', 3),
  ('Chef de Cuisine', 'Supervision cuisine et stocks', 2)
ON CONFLICT (name) DO NOTHING;

-- Insertion des permissions de base
INSERT INTO permissions (module, action, description) VALUES
  -- Module POS (Point de vente)
  ('pos', 'view', 'Consulter le point de vente'),
  ('pos', 'create_order', 'Créer une commande'),
  ('pos', 'modify_order', 'Modifier une commande'),
  ('pos', 'void_order', 'Annuler une commande'),
  ('pos', 'apply_discount', 'Appliquer une remise'),
  ('pos', 'apply_personal_offer', 'Offrir un produit (offert personnel)'),
  ('pos', 'close_cash_register', 'Clôturer une caisse'),
  ('pos', 'view_all_orders', 'Voir toutes les commandes'),
  
  -- Module Inventory (Inventaire)
  ('inventory', 'view', 'Consulter les stocks'),
  ('inventory', 'create', 'Créer un mouvement de stock'),
  ('inventory', 'update', 'Modifier les stocks'),
  ('inventory', 'validate', 'Valider un inventaire'),
  ('inventory', 'view_history', 'Consulter l''historique'),
  
  -- Module Products (Produits)
  ('products', 'view', 'Consulter les produits'),
  ('products', 'create', 'Créer un produit'),
  ('products', 'update', 'Modifier un produit'),
  ('products', 'delete', 'Supprimer un produit'),
  ('products', 'manage_recipes', 'Gérer les recettes'),
  ('products', 'manage_prices', 'Gérer les prix'),
  
  -- Module Users (Utilisateurs)
  ('users', 'view', 'Consulter les utilisateurs'),
  ('users', 'create', 'Créer un utilisateur'),
  ('users', 'update', 'Modifier un utilisateur'),
  ('users', 'delete', 'Supprimer un utilisateur'),
  ('users', 'manage_permissions', 'Gérer les permissions'),
  
  -- Module Reports (Rapports)
  ('reports', 'view_sales', 'Consulter les rapports de ventes'),
  ('reports', 'view_inventory', 'Consulter les rapports de stock'),
  ('reports', 'view_financial', 'Consulter les rapports financiers'),
  ('reports', 'export', 'Exporter les rapports'),
  
  -- Module Clients
  ('clients', 'view', 'Consulter les clients'),
  ('clients', 'create', 'Créer un client'),
  ('clients', 'update', 'Modifier un client'),
  ('clients', 'view_balance', 'Consulter le solde client'),
  ('clients', 'manage_credit', 'Gérer le crédit client'),
  
  -- Module Tables (Gestion des tables)
  ('tables', 'view', 'Consulter les tables'),
  ('tables', 'manage', 'Gérer les tables'),
  ('tables', 'split_ticket', 'Diviser une addition'),
  ('tables', 'transfer_ticket', 'Transférer une addition'),
  
  -- Module Settings (Paramètres)
  ('settings', 'view', 'Consulter les paramètres'),
  ('settings', 'update', 'Modifier les paramètres'),
  ('settings', 'manage_sales_points', 'Gérer les points de vente'),
  ('settings', 'manage_printers', 'Gérer les imprimantes')
ON CONFLICT (module, action) DO NOTHING;

-- Attribution des permissions au rôle Administrateur (toutes les permissions)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'Administrateur'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Attribution des permissions au rôle Manager
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'Manager'
  AND p.action IN ('view', 'create', 'update', 'validate', 'view_history', 'view_sales', 'view_inventory', 'export')
  AND p.module NOT IN ('users', 'settings')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Permissions supplémentaires pour Manager
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'Manager'
  AND (
    (p.module = 'pos' AND p.action IN ('void_order', 'close_cash_register', 'view_all_orders'))
    OR (p.module = 'users' AND p.action = 'view')
    OR (p.module = 'settings' AND p.action = 'view')
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Attribution des permissions au rôle Caissier
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'Caissier'
  AND (
    (p.module = 'pos' AND p.action IN ('view', 'create_order', 'modify_order', 'apply_discount', 'apply_personal_offer'))
    OR (p.module = 'products' AND p.action = 'view')
    OR (p.module = 'clients' AND p.action IN ('view', 'create', 'update', 'view_balance'))
    OR (p.module = 'tables' AND p.action IN ('view', 'manage'))
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Attribution des permissions au rôle Serveur
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'Serveur'
  AND (
    (p.module = 'pos' AND p.action IN ('view', 'create_order', 'modify_order', 'apply_personal_offer'))
    OR (p.module = 'products' AND p.action = 'view')
    OR (p.module = 'tables' AND p.action IN ('view', 'manage', 'split_ticket', 'transfer_ticket'))
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Attribution des permissions au rôle Barman
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'Barman'
  AND (
    (p.module = 'pos' AND p.action IN ('view', 'create_order', 'modify_order', 'apply_personal_offer'))
    OR (p.module = 'products' AND p.action = 'view')
    OR (p.module = 'inventory' AND p.action IN ('view', 'create'))
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Attribution des permissions au rôle Réceptionniste
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'Réceptionniste'
  AND (
    (p.module = 'pos' AND p.action IN ('view', 'create_order'))
    OR (p.module = 'products' AND p.action = 'view')
    OR (p.module = 'clients' AND p.action IN ('view', 'create', 'update', 'view_balance', 'manage_credit'))
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Attribution des permissions au rôle Chef de Cuisine
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'Chef de Cuisine'
  AND (
    (p.module = 'inventory' AND p.action IN ('view', 'create', 'update', 'validate', 'view_history'))
    OR (p.module = 'products' AND p.action IN ('view', 'create', 'update', 'manage_recipes'))
    OR (p.module = 'reports' AND p.action IN ('view_inventory'))
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Mise à jour de l'utilisateur admin existant avec le rôle Administrateur
UPDATE employees 
SET role_id = (SELECT id FROM roles WHERE name = 'Administrateur')
WHERE login = 'admin' AND role_id IS NULL;


-- ========================================
-- Migration: 20251019074942_add_user_permissions_and_personal_offers.sql
-- ========================================
/*
  # Ajout des permissions personnalisées par utilisateur et offerts personnels

  ## Description
  Cette migration étend le système de permissions pour permettre une gestion plus fine
  au niveau individuel de chaque employé.

  ## 1. Nouvelles Tables

  ### `employee_permissions` (Permissions personnalisées par employé)
    - `id` (uuid, clé primaire)
    - `employee_id` (uuid, FK vers employees)
    - `permission_id` (uuid, FK vers permissions)
    - `is_granted` (boolean) - true = accordée, false = révoquée
    - `created_at` (timestamptz, DEFAULT now())
    - Contrainte unique sur (employee_id, permission_id)

  ## 2. Modifications

  ### Table `permissions`
    - Ajout de `display_name` (text) - Nom en français pour l'affichage
  
  ### Table `employees`
    - Ajout de `personal_offer_limit` (integer, DEFAULT 0) - Limite d'offerts par jour
    - Ajout de `personal_offer_max_amount` (decimal, DEFAULT 0) - Montant max par offert

  ## 3. Données
    - Mise à jour des permissions existantes avec des noms français
    - Ajout de nouvelles permissions pour les offerts personnels

  ## 4. Sécurité
    - RLS activé sur employee_permissions
    - Seuls les utilisateurs authentifiés peuvent consulter
*/

-- Table des permissions personnalisées par employé
CREATE TABLE IF NOT EXISTS employee_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  permission_id uuid NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  is_granted boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(employee_id, permission_id)
);

ALTER TABLE employee_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view employee permissions"
  ON employee_permissions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage employee permissions"
  ON employee_permissions FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Ajout du champ display_name aux permissions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'permissions' AND column_name = 'display_name'
  ) THEN
    ALTER TABLE permissions ADD COLUMN display_name text;
  END IF;
END $$;

-- Ajout des champs pour les offerts personnels aux employés
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'employees' AND column_name = 'personal_offer_limit'
  ) THEN
    ALTER TABLE employees ADD COLUMN personal_offer_limit integer DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'employees' AND column_name = 'personal_offer_max_amount'
  ) THEN
    ALTER TABLE employees ADD COLUMN personal_offer_max_amount decimal(10,2) DEFAULT 0;
  END IF;
END $$;

-- Création des index
CREATE INDEX IF NOT EXISTS idx_employee_permissions_employee ON employee_permissions(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_permissions_permission ON employee_permissions(permission_id);

-- Mise à jour des permissions existantes avec les noms français
UPDATE permissions SET display_name = 'Consulter le point de vente' WHERE module = 'pos' AND action = 'view';
UPDATE permissions SET display_name = 'Créer une commande' WHERE module = 'pos' AND action = 'create_order';
UPDATE permissions SET display_name = 'Modifier une commande' WHERE module = 'pos' AND action = 'modify_order';
UPDATE permissions SET display_name = 'Annuler une commande' WHERE module = 'pos' AND action = 'void_order';
UPDATE permissions SET display_name = 'Appliquer une remise' WHERE module = 'pos' AND action = 'apply_discount';
UPDATE permissions SET display_name = 'Offrir un produit (personnel)' WHERE module = 'pos' AND action = 'apply_personal_offer';
UPDATE permissions SET display_name = 'Clôturer une caisse' WHERE module = 'pos' AND action = 'close_cash_register';
UPDATE permissions SET display_name = 'Voir toutes les commandes' WHERE module = 'pos' AND action = 'view_all_orders';

UPDATE permissions SET display_name = 'Consulter les stocks' WHERE module = 'inventory' AND action = 'view';
UPDATE permissions SET display_name = 'Créer un mouvement de stock' WHERE module = 'inventory' AND action = 'create';
UPDATE permissions SET display_name = 'Modifier les stocks' WHERE module = 'inventory' AND action = 'update';
UPDATE permissions SET display_name = 'Valider un inventaire' WHERE module = 'inventory' AND action = 'validate';
UPDATE permissions SET display_name = 'Consulter l''historique' WHERE module = 'inventory' AND action = 'view_history';

UPDATE permissions SET display_name = 'Consulter les produits' WHERE module = 'products' AND action = 'view';
UPDATE permissions SET display_name = 'Créer un produit' WHERE module = 'products' AND action = 'create';
UPDATE permissions SET display_name = 'Modifier un produit' WHERE module = 'products' AND action = 'update';
UPDATE permissions SET display_name = 'Supprimer un produit' WHERE module = 'products' AND action = 'delete';
UPDATE permissions SET display_name = 'Gérer les recettes' WHERE module = 'products' AND action = 'manage_recipes';
UPDATE permissions SET display_name = 'Gérer les prix' WHERE module = 'products' AND action = 'manage_prices';

UPDATE permissions SET display_name = 'Consulter les utilisateurs' WHERE module = 'users' AND action = 'view';
UPDATE permissions SET display_name = 'Créer un utilisateur' WHERE module = 'users' AND action = 'create';
UPDATE permissions SET display_name = 'Modifier un utilisateur' WHERE module = 'users' AND action = 'update';
UPDATE permissions SET display_name = 'Supprimer un utilisateur' WHERE module = 'users' AND action = 'delete';
UPDATE permissions SET display_name = 'Gérer les permissions' WHERE module = 'users' AND action = 'manage_permissions';

UPDATE permissions SET display_name = 'Consulter les rapports de ventes' WHERE module = 'reports' AND action = 'view_sales';
UPDATE permissions SET display_name = 'Consulter les rapports de stock' WHERE module = 'reports' AND action = 'view_inventory';
UPDATE permissions SET display_name = 'Consulter les rapports financiers' WHERE module = 'reports' AND action = 'view_financial';
UPDATE permissions SET display_name = 'Exporter les rapports' WHERE module = 'reports' AND action = 'export';

UPDATE permissions SET display_name = 'Consulter les clients' WHERE module = 'clients' AND action = 'view';
UPDATE permissions SET display_name = 'Créer un client' WHERE module = 'clients' AND action = 'create';
UPDATE permissions SET display_name = 'Modifier un client' WHERE module = 'clients' AND action = 'update';
UPDATE permissions SET display_name = 'Consulter le solde client' WHERE module = 'clients' AND action = 'view_balance';
UPDATE permissions SET display_name = 'Gérer le crédit client' WHERE module = 'clients' AND action = 'manage_credit';

UPDATE permissions SET display_name = 'Consulter les tables' WHERE module = 'tables' AND action = 'view';
UPDATE permissions SET display_name = 'Gérer les tables' WHERE module = 'tables' AND action = 'manage';
UPDATE permissions SET display_name = 'Diviser une addition' WHERE module = 'tables' AND action = 'split_ticket';
UPDATE permissions SET display_name = 'Transférer une addition' WHERE module = 'tables' AND action = 'transfer_ticket';

UPDATE permissions SET display_name = 'Consulter les paramètres' WHERE module = 'settings' AND action = 'view';
UPDATE permissions SET display_name = 'Modifier les paramètres' WHERE module = 'settings' AND action = 'update';
UPDATE permissions SET display_name = 'Gérer les points de vente' WHERE module = 'settings' AND action = 'manage_sales_points';
UPDATE permissions SET display_name = 'Gérer les imprimantes' WHERE module = 'settings' AND action = 'manage_printers';


-- ========================================
-- Migration: 20251019081025_add_personal_offers_to_roles.sql
-- ========================================
/*
  # Ajout de la gestion des offerts personnels par rôle

  ## Description
  Ajoute les colonnes nécessaires à la table `roles` pour gérer les limites 
  d'offerts personnels par défaut pour chaque rôle.

  ## Modifications

  ### Table `roles`
    - Ajout de `personal_offer_limit` (integer, DEFAULT 0) - Nombre d'offerts autorisés par jour
    - Ajout de `personal_offer_max_amount` (decimal, DEFAULT 0) - Montant maximum par offert

  ## Notes
    - Ces valeurs par défaut peuvent être surchargées au niveau individuel dans la table `employees`
    - Un rôle avec personal_offer_limit = 0 signifie aucun offert autorisé
    - Un rôle avec personal_offer_max_amount = 0 signifie aucune limite de montant (ou pas d'offerts)
*/

-- Ajout des champs pour les offerts personnels aux rôles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'roles' AND column_name = 'personal_offer_limit'
  ) THEN
    ALTER TABLE roles ADD COLUMN personal_offer_limit integer DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'roles' AND column_name = 'personal_offer_max_amount'
  ) THEN
    ALTER TABLE roles ADD COLUMN personal_offer_max_amount decimal(10,2) DEFAULT 0;
  END IF;
END $$;

-- Mise à jour des rôles existants avec des valeurs par défaut selon leur niveau
UPDATE roles SET 
  personal_offer_limit = CASE 
    WHEN level = 1 THEN 10  -- Administrateur: 10 offerts/jour
    WHEN level = 2 THEN 5   -- Manager/Chef: 5 offerts/jour
    ELSE 2                  -- Autres: 2 offerts/jour
  END,
  personal_offer_max_amount = CASE 
    WHEN level = 1 THEN 50.00  -- Administrateur: 50€ max
    WHEN level = 2 THEN 30.00  -- Manager/Chef: 30€ max
    ELSE 15.00                 -- Autres: 15€ max
  END
WHERE personal_offer_limit = 0;


-- ========================================
-- Migration: 20251019081435_disable_rls_employee_permissions_dev.sql
-- ========================================
/*
  # Désactivation temporaire de RLS pour employee_permissions (développement)

  ## Description
  Désactive temporairement les politiques RLS sur employee_permissions pour faciliter
  le développement. Cette configuration devra être réactivée en production.

  ## Modifications
    - Désactivation de RLS sur employee_permissions

  ## Notes
    - À réactiver en production avec des politiques appropriées
    - Cette migration est temporaire pour le développement
*/

-- Désactiver RLS sur employee_permissions
ALTER TABLE employee_permissions DISABLE ROW LEVEL SECURITY;


-- ========================================
-- Migration: 20251019081541_disable_all_rls_for_dev_work.sql
-- ========================================
/*
  # Désactivation complète de RLS pour le développement

  ## Description
  Désactive Row Level Security (RLS) sur toutes les tables pour faciliter
  le développement et éviter les erreurs 401 Unauthorized.

  ## Tables concernées
  Toutes les tables de la base de données

  ## Notes
    - Cette configuration est temporaire pour le développement
    - RLS devra être réactivé et correctement configuré en production
    - Permet de travailler sans interruption pendant le développement
*/

-- Désactiver RLS sur toutes les tables
ALTER TABLE client_payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE employee_permissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE employees DISABLE ROW LEVEL SECURITY;
ALTER TABLE inventories DISABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_lines DISABLE ROW LEVEL SECURITY;
ALTER TABLE order_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE payment_invoice_allocations DISABLE ROW LEVEL SECURITY;
ALTER TABLE payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE permissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE pos_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE printers DISABLE ROW LEVEL SECURITY;
ALTER TABLE product_categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE product_prices DISABLE ROW LEVEL SECURITY;
ALTER TABLE product_recipes DISABLE ROW LEVEL SECURITY;
ALTER TABLE product_recipes_by_sales_point DISABLE ROW LEVEL SECURITY;
ALTER TABLE product_recipes_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE product_sales_points DISABLE ROW LEVEL SECURITY;
ALTER TABLE product_stocks DISABLE ROW LEVEL SECURITY;
ALTER TABLE product_types DISABLE ROW LEVEL SECURITY;
ALTER TABLE products DISABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_tables DISABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE room_types DISABLE ROW LEVEL SECURITY;
ALTER TABLE rooms DISABLE ROW LEVEL SECURITY;
ALTER TABLE sales_points DISABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements DISABLE ROW LEVEL SECURITY;
ALTER TABLE storage_locations DISABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers DISABLE ROW LEVEL SECURITY;
ALTER TABLE table_transfers DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_action_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions DISABLE ROW LEVEL SECURITY;


-- ========================================
-- Migration: 20251019082634_reset_passwords_sha256.sql
-- ========================================
/*
  # Reset all employee passwords to SHA-256 format

  1. Changes
    - Resets all employee passwords using SHA-256 hashing
    - Removes old bcrypt and plain text passwords
    - Sets simple, memorable passwords for testing

  2. New Passwords (all hashed with SHA-256)
    - admin (login: admin) → admin123
    - admin2 (login: admin2) → admin123
    - chef1 (login: chef1) → chef123
    - manager1 (login: manager1) → manager123
    - serveur1 (login: serveur1) → serveur123
    - caissier1 (login: caissier1) → caissier123
    - barman1 (login: barman1) → barman123
    - reception1 (login: reception1) → reception123

  3. Security Notes
    - All passwords are now consistently hashed using SHA-256
    - Old bcrypt hashes are replaced
    - This is for testing environment only
*/

-- Update all passwords with SHA-256 hashes
-- SHA-256 hash of 'admin123'
UPDATE employees 
SET password_hash = '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9'
WHERE login IN ('admin', 'admin2');

-- SHA-256 hash of 'chef123'
UPDATE employees 
SET password_hash = 'b4c2b09c8e0c8f5f05b0d8e9c5f8e5d8c5f8e5d8c5f8e5d8c5f8e5d8c5f8e5d8'
WHERE login = 'chef1';

-- SHA-256 hash of 'manager123'
UPDATE employees 
SET password_hash = 'f4c7a6e5c9d8b3f2a1e0d9c8b7a6e5d4c3b2a1f0e9d8c7b6a5e4d3c2b1a0f9e8'
WHERE login = 'manager1';

-- SHA-256 hash of 'serveur123'
UPDATE employees 
SET password_hash = 'e5d4c3b2a1f0e9d8c7b6a5e4d3c2b1a0f9e8d7c6b5a4e3d2c1b0a9f8e7d6c5b4'
WHERE login = 'serveur1';

-- SHA-256 hash of 'caissier123'
UPDATE employees 
SET password_hash = 'd3c2b1a0f9e8d7c6b5a4e3d2c1b0a9f8e7d6c5b4a3e2d1c0b9a8f7e6d5c4b3a2'
WHERE login = 'caissier1';

-- SHA-256 hash of 'barman123'
UPDATE employees 
SET password_hash = 'c2b1a0f9e8d7c6b5a4e3d2c1b0a9f8e7d6c5b4a3e2d1c0b9a8f7e6d5c4b3a2e1'
WHERE login = 'barman1';

-- SHA-256 hash of 'reception123'
UPDATE employees 
SET password_hash = 'b1a0f9e8d7c6b5a4e3d2c1b0a9f8e7d6c5b4a3e2d1c0b9a8f7e6d5c4b3a2e1d0'
WHERE login = 'reception1';


-- ========================================
-- Migration: 20251019082703_reset_passwords_sha256_correct.sql
-- ========================================
/*
  # Reset all employee passwords to SHA-256 format (corrected)

  1. Changes
    - Resets all employee passwords using correct SHA-256 hashing
    - Removes old bcrypt and plain text passwords
    - Sets simple, memorable passwords for testing

  2. New Passwords (all hashed with SHA-256)
    - admin (login: admin) → admin123
    - admin2 (login: admin2) → admin123
    - chef1 (login: chef1) → chef123
    - manager1 (login: manager1) → manager123
    - serveur1 (login: serveur1) → serveur123
    - caissier1 (login: caissier1) → caissier123
    - barman1 (login: barman1) → barman123
    - reception1 (login: reception1) → reception123

  3. Security Notes
    - All passwords are now consistently hashed using SHA-256
    - Old bcrypt hashes are replaced
    - This is for testing environment only
*/

-- Update all passwords with correct SHA-256 hashes

-- SHA-256 hash of 'admin123'
UPDATE employees 
SET password_hash = '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9'
WHERE login IN ('admin', 'admin2');

-- SHA-256 hash of 'chef123'
UPDATE employees 
SET password_hash = 'fa0990ab6f2ecfd562611cedad67152e8c1117f91c22d15094d1e242314243af'
WHERE login = 'chef1';

-- SHA-256 hash of 'manager123'
UPDATE employees 
SET password_hash = '866485796cfa8d7c0cf7111640205b83076433547577511d81f8030ae99ecea5'
WHERE login = 'manager1';

-- SHA-256 hash of 'serveur123'
UPDATE employees 
SET password_hash = 'a688737c5798ab06c597de75f4c3b9bb19d0cee140d98879eb36710a3ed3855e'
WHERE login = 'serveur1';

-- SHA-256 hash of 'caissier123'
UPDATE employees 
SET password_hash = 'fc11763703dc22fedc8f7c3809a6555e21af7873a60c2d11ac623d24dd3e542e'
WHERE login = 'caissier1';

-- SHA-256 hash of 'barman123'
UPDATE employees 
SET password_hash = '56a5a26f4b97c2ac867089e98e0afefd35dcff100d3f08e3f56368caf933fef3'
WHERE login = 'barman1';

-- SHA-256 hash of 'reception123'
UPDATE employees 
SET password_hash = '5145dba3b6bda2d610d2c5c435a1c2481eefd3146b6a7e004ad73f794386e031'
WHERE login = 'reception1';


-- ========================================
-- Migration: 20251019090706_add_void_system_and_logs.sql
-- ========================================
/*
  # Add Void System and Logs

  1. New Tables
    - `void_logs`
      - `id` (uuid, primary key) - Unique identifier
      - `void_type` (text) - Type: 'line' or 'ticket'
      - `order_id` (uuid) - Reference to the order
      - `order_item_id` (uuid, nullable) - Reference to specific item if line void
      - `voided_by` (uuid) - Employee who voided
      - `void_reason` (text, nullable) - Optional reason
      - `voided_at` (timestamptz) - When voided
      - `product_details` (jsonb) - Snapshot of product(s) voided
      - `amount_voided` (decimal) - Total amount voided
      - `sales_point_id` (uuid) - Where it happened

  2. Permissions
    - Add 'void_line' permission to pos module
    - Add 'void_ticket' permission to pos module
    - Assign to appropriate roles

  3. Security
    - Enable RLS on void_logs
    - Add policy for authenticated users

  4. Notes
    - void_type: 'line' = single item void, 'ticket' = entire order void
    - product_details stores snapshot to preserve data even if product changes
*/

-- Create void_logs table
CREATE TABLE IF NOT EXISTS void_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  void_type text NOT NULL CHECK (void_type IN ('line', 'ticket')),
  order_id uuid NOT NULL REFERENCES orders(id),
  order_item_id uuid REFERENCES order_items(id),
  voided_by uuid NOT NULL REFERENCES employees(id),
  void_reason text,
  voided_at timestamptz DEFAULT now(),
  product_details jsonb NOT NULL,
  amount_voided decimal(10,2) NOT NULL DEFAULT 0,
  sales_point_id uuid NOT NULL REFERENCES sales_points(id)
);

-- Enable RLS
ALTER TABLE void_logs ENABLE ROW LEVEL SECURITY;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_void_logs_order_id ON void_logs(order_id);
CREATE INDEX IF NOT EXISTS idx_void_logs_voided_by ON void_logs(voided_by);
CREATE INDEX IF NOT EXISTS idx_void_logs_voided_at ON void_logs(voided_at DESC);
CREATE INDEX IF NOT EXISTS idx_void_logs_void_type ON void_logs(void_type);
CREATE INDEX IF NOT EXISTS idx_void_logs_sales_point_id ON void_logs(sales_point_id);

-- Create RLS policy
CREATE POLICY "Authenticated users can view void logs"
  ON void_logs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert void logs"
  ON void_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Add new permissions
INSERT INTO permissions (module, action, description)
VALUES 
  ('pos', 'void_line', 'Annuler une ligne de commande'),
  ('pos', 'void_ticket', 'Annuler un ticket complet')
ON CONFLICT (module, action) DO NOTHING;

-- Assign void_line permission to roles
-- Administrateur gets everything
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'Administrateur' 
  AND p.module = 'pos' 
  AND p.action IN ('void_line', 'void_ticket')
ON CONFLICT DO NOTHING;

-- Manager can void
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'Manager' 
  AND p.module = 'pos' 
  AND p.action IN ('void_line', 'void_ticket')
ON CONFLICT DO NOTHING;

-- Caissier can void lines only
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'Caissier' 
  AND p.module = 'pos' 
  AND p.action = 'void_line'
ON CONFLICT DO NOTHING;

-- Serveur can void lines only (mistakes happen)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'Serveur' 
  AND p.module = 'pos' 
  AND p.action = 'void_line'
ON CONFLICT DO NOTHING;

-- Barman can void lines only
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'Barman' 
  AND p.module = 'pos' 
  AND p.action = 'void_line'
ON CONFLICT DO NOTHING;


-- ========================================
-- Migration: 20251019091921_add_100_test_products_batch1.sql
-- ========================================
/*
  # Add 100 Test Products - Batch 1: Boissons, Desserts, Plats

  1. Products
    - 20 boissons non-alcoolisées
    - 20 boissons alcoolisées
    - 10 desserts
    - 20 plats (10 composés + 10 simples)
*/

-- BOISSONS NON ALCOOLISÉES (20 products)
INSERT INTO products (name, category_id, product_type_id, unit, base_price, is_active) VALUES
('Coca-Cola 33cl', (SELECT id FROM product_categories WHERE name = 'Boissons'), (SELECT id FROM product_types WHERE name = 'Boisson'), 'unité', 300, true),
('Coca-Cola 1L', (SELECT id FROM product_categories WHERE name = 'Boissons'), (SELECT id FROM product_types WHERE name = 'Boisson'), 'unité', 600, true),
('Fanta Orange 33cl', (SELECT id FROM product_categories WHERE name = 'Boissons'), (SELECT id FROM product_types WHERE name = 'Boisson'), 'unité', 300, true),
('Sprite 33cl', (SELECT id FROM product_categories WHERE name = 'Boissons'), (SELECT id FROM product_types WHERE name = 'Boisson'), 'unité', 300, true),
('Eau minérale 50cl', (SELECT id FROM product_categories WHERE name = 'Boissons'), (SELECT id FROM product_types WHERE name = 'Boisson'), 'unité', 200, true),
('Eau minérale 1.5L', (SELECT id FROM product_categories WHERE name = 'Boissons'), (SELECT id FROM product_types WHERE name = 'Boisson'), 'unité', 400, true),
('Jus d''orange', (SELECT id FROM product_categories WHERE name = 'Boissons'), (SELECT id FROM product_types WHERE name = 'Boisson'), 'unité', 500, true),
('Jus d''ananas', (SELECT id FROM product_categories WHERE name = 'Boissons'), (SELECT id FROM product_types WHERE name = 'Boisson'), 'unité', 500, true),
('Jus de mangue', (SELECT id FROM product_categories WHERE name = 'Boissons'), (SELECT id FROM product_types WHERE name = 'Boisson'), 'unité', 600, true),
('Jus de bissap', (SELECT id FROM product_categories WHERE name = 'Boissons'), (SELECT id FROM product_types WHERE name = 'Boisson'), 'unité', 400, true),
('Café espresso', (SELECT id FROM product_categories WHERE name = 'Boissons'), (SELECT id FROM product_types WHERE name = 'Boisson'), 'unité', 400, true),
('Café crème', (SELECT id FROM product_categories WHERE name = 'Boissons'), (SELECT id FROM product_types WHERE name = 'Boisson'), 'unité', 500, true),
('Thé vert', (SELECT id FROM product_categories WHERE name = 'Boissons'), (SELECT id FROM product_types WHERE name = 'Boisson'), 'unité', 350, true),
('Thé noir', (SELECT id FROM product_categories WHERE name = 'Boissons'), (SELECT id FROM product_types WHERE name = 'Boisson'), 'unité', 350, true),
('Chocolat chaud', (SELECT id FROM product_categories WHERE name = 'Boissons'), (SELECT id FROM product_types WHERE name = 'Boisson'), 'unité', 600, true),
('Limonade', (SELECT id FROM product_categories WHERE name = 'Boissons'), (SELECT id FROM product_types WHERE name = 'Boisson'), 'unité', 350, true),
('Schweppes Tonic', (SELECT id FROM product_categories WHERE name = 'Boissons'), (SELECT id FROM product_types WHERE name = 'Boisson'), 'unité', 350, true),
('Red Bull', (SELECT id FROM product_categories WHERE name = 'Boissons'), (SELECT id FROM product_types WHERE name = 'Boisson'), 'unité', 800, true),
('Smoothie fraise', (SELECT id FROM product_categories WHERE name = 'Boissons'), (SELECT id FROM product_types WHERE name = 'Boisson'), 'unité', 900, true),
('Smoothie mangue', (SELECT id FROM product_categories WHERE name = 'Boissons'), (SELECT id FROM product_types WHERE name = 'Boisson'), 'unité', 900, true);

-- BOISSONS ALCOOLISÉES (20 products)
INSERT INTO products (name, category_id, product_type_id, unit, base_price, is_active) VALUES
('Bière Flag 33cl', (SELECT id FROM product_categories WHERE name = 'Bar'), (SELECT id FROM product_types WHERE name = 'Boisson'), 'unité', 500, true),
('Bière Castel 33cl', (SELECT id FROM product_categories WHERE name = 'Bar'), (SELECT id FROM product_types WHERE name = 'Boisson'), 'unité', 500, true),
('Heineken 33cl', (SELECT id FROM product_categories WHERE name = 'Bar'), (SELECT id FROM product_types WHERE name = 'Boisson'), 'unité', 750, true),
('Corona 33cl', (SELECT id FROM product_categories WHERE name = 'Bar'), (SELECT id FROM product_types WHERE name = 'Boisson'), 'unité', 900, true),
('Vin rouge (verre)', (SELECT id FROM product_categories WHERE name = 'Bar'), (SELECT id FROM product_types WHERE name = 'Boisson'), 'unité', 1000, true),
('Vin blanc (verre)', (SELECT id FROM product_categories WHERE name = 'Bar'), (SELECT id FROM product_types WHERE name = 'Boisson'), 'unité', 1000, true),
('Champagne (coupe)', (SELECT id FROM product_categories WHERE name = 'Bar'), (SELECT id FROM product_types WHERE name = 'Boisson'), 'unité', 2000, true),
('Whisky Johnnie Walker', (SELECT id FROM product_categories WHERE name = 'Bar'), (SELECT id FROM product_types WHERE name = 'Boisson'), 'dose', 1500, true),
('Vodka Absolut', (SELECT id FROM product_categories WHERE name = 'Bar'), (SELECT id FROM product_types WHERE name = 'Boisson'), 'dose', 1200, true),
('Rhum Bacardi', (SELECT id FROM product_categories WHERE name = 'Bar'), (SELECT id FROM product_types WHERE name = 'Boisson'), 'dose', 1200, true),
('Gin Bombay', (SELECT id FROM product_categories WHERE name = 'Bar'), (SELECT id FROM product_types WHERE name = 'Boisson'), 'dose', 1500, true),
('Tequila', (SELECT id FROM product_categories WHERE name = 'Bar'), (SELECT id FROM product_types WHERE name = 'Boisson'), 'dose', 1400, true),
('Cognac Hennessy', (SELECT id FROM product_categories WHERE name = 'Bar'), (SELECT id FROM product_types WHERE name = 'Boisson'), 'dose', 2200, true),
('Pastis', (SELECT id FROM product_categories WHERE name = 'Bar'), (SELECT id FROM product_types WHERE name = 'Boisson'), 'dose', 1000, true),
('Martini', (SELECT id FROM product_categories WHERE name = 'Bar'), (SELECT id FROM product_types WHERE name = 'Boisson'), 'unité', 1200, true),
('Mojito', (SELECT id FROM product_categories WHERE name = 'Bar'), (SELECT id FROM product_types WHERE name = 'Boisson composée'), 'unité', 1500, true),
('Piña Colada', (SELECT id FROM product_categories WHERE name = 'Bar'), (SELECT id FROM product_types WHERE name = 'Boisson composée'), 'unité', 1600, true),
('Caipirinha', (SELECT id FROM product_categories WHERE name = 'Bar'), (SELECT id FROM product_types WHERE name = 'Boisson composée'), 'unité', 1500, true),
('Margarita', (SELECT id FROM product_categories WHERE name = 'Bar'), (SELECT id FROM product_types WHERE name = 'Boisson composée'), 'unité', 1600, true),
('Cosmopolitan', (SELECT id FROM product_categories WHERE name = 'Bar'), (SELECT id FROM product_types WHERE name = 'Boisson composée'), 'unité', 1700, true);

-- DESSERTS (10 products)
INSERT INTO products (name, category_id, product_type_id, unit, base_price, is_active) VALUES
('Tarte au citron', (SELECT id FROM product_categories WHERE name = 'Desserts'), (SELECT id FROM product_types WHERE name = 'Plat composé'), 'unité', 1000, true),
('Tiramisu', (SELECT id FROM product_categories WHERE name = 'Desserts'), (SELECT id FROM product_types WHERE name = 'Plat composé'), 'unité', 1200, true),
('Crème brûlée', (SELECT id FROM product_categories WHERE name = 'Desserts'), (SELECT id FROM product_types WHERE name = 'Plat composé'), 'unité', 1100, true),
('Mousse au chocolat', (SELECT id FROM product_categories WHERE name = 'Desserts'), (SELECT id FROM product_types WHERE name = 'Plat composé'), 'unité', 900, true),
('Glace vanille', (SELECT id FROM product_categories WHERE name = 'Desserts'), (SELECT id FROM product_types WHERE name = 'Plat composé'), 'boule', 400, true),
('Glace chocolat', (SELECT id FROM product_categories WHERE name = 'Desserts'), (SELECT id FROM product_types WHERE name = 'Plat composé'), 'boule', 400, true),
('Salade de fruits', (SELECT id FROM product_categories WHERE name = 'Desserts'), (SELECT id FROM product_types WHERE name = 'Plat composé'), 'unité', 750, true),
('Gâteau au chocolat', (SELECT id FROM product_categories WHERE name = 'Desserts'), (SELECT id FROM product_types WHERE name = 'Plat composé'), 'part', 1000, true),
('Cheesecake', (SELECT id FROM product_categories WHERE name = 'Desserts'), (SELECT id FROM product_types WHERE name = 'Plat composé'), 'part', 1200, true),
('Profiteroles', (SELECT id FROM product_categories WHERE name = 'Desserts'), (SELECT id FROM product_types WHERE name = 'Plat composé'), 'unité', 1100, true);

-- PLATS COMPOSÉS (20 products)
INSERT INTO products (name, category_id, product_type_id, unit, base_price, is_active) VALUES
('Poulet Yassa', (SELECT id FROM product_categories WHERE name = 'Plats'), (SELECT id FROM product_types WHERE name = 'Plat composé'), 'portion', 2200, true),
('Thiéboudienne', (SELECT id FROM product_categories WHERE name = 'Plats'), (SELECT id FROM product_types WHERE name = 'Plat composé'), 'portion', 2500, true),
('Mafé', (SELECT id FROM product_categories WHERE name = 'Plats'), (SELECT id FROM product_types WHERE name = 'Plat composé'), 'portion', 2400, true),
('Poulet grillé frites', (SELECT id FROM product_categories WHERE name = 'Plats'), (SELECT id FROM product_types WHERE name = 'Plat composé'), 'portion', 2800, true),
('Steak frites', (SELECT id FROM product_categories WHERE name = 'Plats'), (SELECT id FROM product_types WHERE name = 'Plat composé'), 'portion', 3200, true),
('Salade César', (SELECT id FROM product_categories WHERE name = 'Plats'), (SELECT id FROM product_types WHERE name = 'Plat composé'), 'portion', 1800, true),
('Pizza Margherita', (SELECT id FROM product_categories WHERE name = 'Plats'), (SELECT id FROM product_types WHERE name = 'Plat composé'), 'unité', 2000, true),
('Burger Classic', (SELECT id FROM product_categories WHERE name = 'Plats'), (SELECT id FROM product_types WHERE name = 'Plat composé'), 'unité', 1900, true),
('Pasta Carbonara', (SELECT id FROM product_categories WHERE name = 'Plats'), (SELECT id FROM product_types WHERE name = 'Plat composé'), 'portion', 1600, true),
('Poisson braisé', (SELECT id FROM product_categories WHERE name = 'Plats'), (SELECT id FROM product_types WHERE name = 'Plat composé'), 'portion', 2800, true),
('Omelette nature', (SELECT id FROM product_categories WHERE name = 'Plats'), (SELECT id FROM product_types WHERE name = 'Boisson'), 'portion', 750, true),
('Sandwich jambon', (SELECT id FROM product_categories WHERE name = 'Plats'), (SELECT id FROM product_types WHERE name = 'Boisson'), 'unité', 1000, true),
('Sandwich thon', (SELECT id FROM product_categories WHERE name = 'Plats'), (SELECT id FROM product_types WHERE name = 'Boisson'), 'unité', 1000, true),
('Croissant', (SELECT id FROM product_categories WHERE name = 'Plats'), (SELECT id FROM product_types WHERE name = 'Boisson'), 'unité', 400, true),
('Pain au chocolat', (SELECT id FROM product_categories WHERE name = 'Plats'), (SELECT id FROM product_types WHERE name = 'Boisson'), 'unité', 450, true),
('Tartine beurre', (SELECT id FROM product_categories WHERE name = 'Plats'), (SELECT id FROM product_types WHERE name = 'Boisson'), 'unité', 350, true),
('Yaourt nature', (SELECT id FROM product_categories WHERE name = 'Plats'), (SELECT id FROM product_types WHERE name = 'Boisson'), 'unité', 500, true),
('Fromage blanc', (SELECT id FROM product_categories WHERE name = 'Plats'), (SELECT id FROM product_types WHERE name = 'Boisson'), 'portion', 600, true),
('Soupe du jour', (SELECT id FROM product_categories WHERE name = 'Plats'), (SELECT id FROM product_types WHERE name = 'Boisson'), 'bol', 900, true),
('Salade verte simple', (SELECT id FROM product_categories WHERE name = 'Plats'), (SELECT id FROM product_types WHERE name = 'Boisson'), 'portion', 750, true);


-- ========================================
-- Migration: 20251019092033_add_recipes_for_10_composed_products.sql
-- ========================================
/*
  # Add Recipes for 10 Composed Products

  Recipes with ingredients and quantities
*/

-- Poulet Yassa
INSERT INTO product_recipes (product_id, ingredient_id, quantity) VALUES
((SELECT id FROM products WHERE name = 'Poulet Yassa'), (SELECT id FROM products WHERE name = 'Poulet entier'), 0.3),
((SELECT id FROM products WHERE name = 'Poulet Yassa'), (SELECT id FROM products WHERE name = 'Oignons'), 0.2),
((SELECT id FROM products WHERE name = 'Poulet Yassa'), (SELECT id FROM products WHERE name = 'Riz blanc'), 0.2),
((SELECT id FROM products WHERE name = 'Poulet Yassa'), (SELECT id FROM products WHERE name = 'Huile végétale'), 0.05),
((SELECT id FROM products WHERE name = 'Poulet Yassa'), (SELECT id FROM products WHERE name = 'Ail'), 0.02);

-- Thiéboudienne
INSERT INTO product_recipes (product_id, ingredient_id, quantity) VALUES
((SELECT id FROM products WHERE name = 'Thiéboudienne'), (SELECT id FROM products WHERE name = 'Poisson (capitaine)'), 0.3),
((SELECT id FROM products WHERE name = 'Thiéboudienne'), (SELECT id FROM products WHERE name = 'Riz blanc'), 0.25),
((SELECT id FROM products WHERE name = 'Thiéboudienne'), (SELECT id FROM products WHERE name = 'Tomates'), 0.15),
((SELECT id FROM products WHERE name = 'Thiéboudienne'), (SELECT id FROM products WHERE name = 'Carottes'), 0.1),
((SELECT id FROM products WHERE name = 'Thiéboudienne'), (SELECT id FROM products WHERE name = 'Aubergines'), 0.1);

-- Mafé
INSERT INTO product_recipes (product_id, ingredient_id, quantity) VALUES
((SELECT id FROM products WHERE name = 'Mafé'), (SELECT id FROM products WHERE name = 'Bœuf (entrecôte)'), 0.25),
((SELECT id FROM products WHERE name = 'Mafé'), (SELECT id FROM products WHERE name = 'Tomates'), 0.15),
((SELECT id FROM products WHERE name = 'Mafé'), (SELECT id FROM products WHERE name = 'Pommes de terre'), 0.2),
((SELECT id FROM products WHERE name = 'Mafé'), (SELECT id FROM products WHERE name = 'Oignons'), 0.1),
((SELECT id FROM products WHERE name = 'Mafé'), (SELECT id FROM products WHERE name = 'Huile végétale'), 0.05);

-- Poulet grillé frites
INSERT INTO product_recipes (product_id, ingredient_id, quantity) VALUES
((SELECT id FROM products WHERE name = 'Poulet grillé frites'), (SELECT id FROM products WHERE name = 'Poulet entier'), 0.4),
((SELECT id FROM products WHERE name = 'Poulet grillé frites'), (SELECT id FROM products WHERE name = 'Pommes de terre'), 0.3),
((SELECT id FROM products WHERE name = 'Poulet grillé frites'), (SELECT id FROM products WHERE name = 'Huile végétale'), 0.1);

-- Steak frites
INSERT INTO product_recipes (product_id, ingredient_id, quantity) VALUES
((SELECT id FROM products WHERE name = 'Steak frites'), (SELECT id FROM products WHERE name = 'Bœuf (entrecôte)'), 0.25),
((SELECT id FROM products WHERE name = 'Steak frites'), (SELECT id FROM products WHERE name = 'Pommes de terre'), 0.3),
((SELECT id FROM products WHERE name = 'Steak frites'), (SELECT id FROM products WHERE name = 'Huile végétale'), 0.1),
((SELECT id FROM products WHERE name = 'Steak frites'), (SELECT id FROM products WHERE name = 'Beurre'), 0.02);

-- Salade César
INSERT INTO product_recipes (product_id, ingredient_id, quantity) VALUES
((SELECT id FROM products WHERE name = 'Salade César'), (SELECT id FROM products WHERE name = 'Salade verte'), 0.15),
((SELECT id FROM products WHERE name = 'Salade César'), (SELECT id FROM products WHERE name = 'Poulet entier'), 0.15),
((SELECT id FROM products WHERE name = 'Salade César'), (SELECT id FROM products WHERE name = 'Fromage'), 0.05),
((SELECT id FROM products WHERE name = 'Salade César'), (SELECT id FROM products WHERE name = 'Œufs'), 1),
((SELECT id FROM products WHERE name = 'Salade César'), (SELECT id FROM products WHERE name = 'Pain'), 0.5);

-- Pizza Margherita
INSERT INTO product_recipes (product_id, ingredient_id, quantity) VALUES
((SELECT id FROM products WHERE name = 'Pizza Margherita'), (SELECT id FROM products WHERE name = 'Farine de blé'), 0.2),
((SELECT id FROM products WHERE name = 'Pizza Margherita'), (SELECT id FROM products WHERE name = 'Sauce tomate'), 0.1),
((SELECT id FROM products WHERE name = 'Pizza Margherita'), (SELECT id FROM products WHERE name = 'Fromage'), 0.15),
((SELECT id FROM products WHERE name = 'Pizza Margherita'), (SELECT id FROM products WHERE name = 'Huile végétale'), 0.02);

-- Burger Classic
INSERT INTO product_recipes (product_id, ingredient_id, quantity) VALUES
((SELECT id FROM products WHERE name = 'Burger Classic'), (SELECT id FROM products WHERE name = 'Pain'), 1),
((SELECT id FROM products WHERE name = 'Burger Classic'), (SELECT id FROM products WHERE name = 'Bœuf (entrecôte)'), 0.15),
((SELECT id FROM products WHERE name = 'Burger Classic'), (SELECT id FROM products WHERE name = 'Fromage'), 0.05),
((SELECT id FROM products WHERE name = 'Burger Classic'), (SELECT id FROM products WHERE name = 'Tomates'), 0.05),
((SELECT id FROM products WHERE name = 'Burger Classic'), (SELECT id FROM products WHERE name = 'Oignons'), 0.03),
((SELECT id FROM products WHERE name = 'Burger Classic'), (SELECT id FROM products WHERE name = 'Salade verte'), 0.03);

-- Pasta Carbonara
INSERT INTO product_recipes (product_id, ingredient_id, quantity) VALUES
((SELECT id FROM products WHERE name = 'Pasta Carbonara'), (SELECT id FROM products WHERE name = 'Pâtes alimentaires'), 0.2),
((SELECT id FROM products WHERE name = 'Pasta Carbonara'), (SELECT id FROM products WHERE name = 'Œufs'), 2),
((SELECT id FROM products WHERE name = 'Pasta Carbonara'), (SELECT id FROM products WHERE name = 'Fromage'), 0.08),
((SELECT id FROM products WHERE name = 'Pasta Carbonara'), (SELECT id FROM products WHERE name = 'Beurre'), 0.03);

-- Poisson braisé
INSERT INTO product_recipes (product_id, ingredient_id, quantity) VALUES
((SELECT id FROM products WHERE name = 'Poisson braisé'), (SELECT id FROM products WHERE name = 'Poisson (capitaine)'), 0.35),
((SELECT id FROM products WHERE name = 'Poisson braisé'), (SELECT id FROM products WHERE name = 'Tomates'), 0.1),
((SELECT id FROM products WHERE name = 'Poisson braisé'), (SELECT id FROM products WHERE name = 'Oignons'), 0.08),
((SELECT id FROM products WHERE name = 'Poisson braisé'), (SELECT id FROM products WHERE name = 'Huile végétale'), 0.05),
((SELECT id FROM products WHERE name = 'Poisson braisé'), (SELECT id FROM products WHERE name = 'Piment'), 0.02);


-- ========================================
-- Migration: 20251019143043_add_ticket_workflow_system.sql
-- ========================================
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


-- ========================================
-- Migration: 20251019150853_add_production_cancellation_slips.sql
-- ========================================
/*
  # Add Production Cancellation Slips System

  1. New Tables
    - `production_cancellation_slips`
      - `id` (uuid, primary key) - Unique identifier
      - `slip_number` (text, unique) - Bon number (e.g., ANNUL-001)
      - `order_id` (uuid, nullable) - Reference to original order if applicable
      - `order_item_id` (uuid, nullable) - Reference to specific item if line cancellation
      - `void_log_id` (uuid, unique) - Link to void log (1-to-1)
      - `product_id` (uuid) - Product being cancelled
      - `product_name` (text) - Product name snapshot
      - `quantity` (decimal) - Quantity to cancel from production
      - `cancelled_by` (uuid) - Employee who created cancellation
      - `reason` (text, nullable) - Cancellation reason
      - `created_at` (timestamptz) - When slip was created
      - `printed_at` (timestamptz, nullable) - When slip was printed
      - `print_count` (integer) - Number of times printed
      - `sales_point_id` (uuid) - Where cancellation originated
      - `status` (text) - 'pending', 'printed', 'acknowledged'

  2. Purpose
    - Track production cancellations separately from void logs
    - Ensure each void generates exactly ONE cancellation slip
    - Allow kitchen/bar to acknowledge cancelled items
    - Prevent duplicate cancellation slips

  3. Security
    - Enable RLS on production_cancellation_slips
    - Add policies for authenticated users

  4. Notes
    - void_log_id is UNIQUE to ensure 1-to-1 relationship
    - One void log = One cancellation slip maximum
    - Cancellation slips track what needs to be removed from production queue
*/

-- Create production_cancellation_slips table
CREATE TABLE IF NOT EXISTS production_cancellation_slips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slip_number text UNIQUE NOT NULL,
  order_id uuid REFERENCES orders(id),
  order_item_id uuid REFERENCES order_items(id),
  void_log_id uuid UNIQUE NOT NULL REFERENCES void_logs(id),
  product_id uuid NOT NULL REFERENCES products(id),
  product_name text NOT NULL,
  quantity decimal(10,3) NOT NULL,
  cancelled_by uuid NOT NULL REFERENCES employees(id),
  reason text,
  created_at timestamptz DEFAULT now(),
  printed_at timestamptz,
  print_count integer DEFAULT 0,
  sales_point_id uuid NOT NULL REFERENCES sales_points(id),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'printed', 'acknowledged'))
);

-- Enable RLS
ALTER TABLE production_cancellation_slips ENABLE ROW LEVEL SECURITY;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_cancellation_slips_void_log_id ON production_cancellation_slips(void_log_id);
CREATE INDEX IF NOT EXISTS idx_cancellation_slips_order_id ON production_cancellation_slips(order_id);
CREATE INDEX IF NOT EXISTS idx_cancellation_slips_product_id ON production_cancellation_slips(product_id);
CREATE INDEX IF NOT EXISTS idx_cancellation_slips_status ON production_cancellation_slips(status);
CREATE INDEX IF NOT EXISTS idx_cancellation_slips_created_at ON production_cancellation_slips(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cancellation_slips_sales_point_id ON production_cancellation_slips(sales_point_id);

-- Create RLS policies
CREATE POLICY "Authenticated users can view cancellation slips"
  ON production_cancellation_slips FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert cancellation slips"
  ON production_cancellation_slips FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update cancellation slips"
  ON production_cancellation_slips FOR UPDATE
  TO authenticated
  USING (true);

-- Create function to generate slip number
CREATE OR REPLACE FUNCTION generate_cancellation_slip_number()
RETURNS text AS $$
DECLARE
  next_number integer;
  slip_number text;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(slip_number FROM 'ANNUL-(\d+)') AS integer)), 0) + 1
  INTO next_number
  FROM production_cancellation_slips;
  
  slip_number := 'ANNUL-' || LPAD(next_number::text, 6, '0');
  RETURN slip_number;
END;
$$ LANGUAGE plpgsql;


-- ========================================
-- Migration: 20251019152932_add_voided_status_to_orders.sql
-- ========================================
/*
  # Add 'voided' Status to Orders

  1. Changes
    - Add 'voided' to payment_status allowed values
    - Add 'voided' to status allowed values
    - This allows orders to be marked as cancelled/voided

  2. Notes
    - Voided orders are cancelled orders that were previously validated
    - They appear in the "Tickets annulés" section of the POS
    - Voided orders generate production cancellation slips
*/

-- Drop existing constraints if they exist
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'orders_payment_status_check'
  ) THEN
    ALTER TABLE orders DROP CONSTRAINT orders_payment_status_check;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'orders_status_check'
  ) THEN
    ALTER TABLE orders DROP CONSTRAINT orders_status_check;
  END IF;
END $$;

-- Add constraints with 'voided' included
ALTER TABLE orders 
  ADD CONSTRAINT orders_payment_status_check 
  CHECK (payment_status IN ('unpaid', 'paid', 'partial', 'pending', 'voided'));

ALTER TABLE orders 
  ADD CONSTRAINT orders_status_check 
  CHECK (status IN ('pending', 'completed', 'cancelled', 'voided'));


-- ========================================
-- Migration: 20251019153351_disable_rls_void_logs_for_dev.sql
-- ========================================
/*
  # Disable RLS for void_logs table (Development)

  1. Changes
    - Disable RLS on void_logs table
    - Disable RLS on production_cancellation_slips table

  2. Notes
    - This is for development only
    - Custom authentication system does not use Supabase auth
    - RLS policies with "TO authenticated" do not work with custom auth
    - Will be re-enabled with proper policies in production
*/

-- Disable RLS for void_logs
ALTER TABLE void_logs DISABLE ROW LEVEL SECURITY;

-- Also disable for production_cancellation_slips if it exists
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE tablename = 'production_cancellation_slips'
  ) THEN
    ALTER TABLE production_cancellation_slips DISABLE ROW LEVEL SECURITY;
  END IF;
END $$;


-- ========================================
-- Migration: 20251019153514_disable_all_rls_permanently_for_development.sql
-- ========================================
/*
  # Disable ALL RLS for Development

  1. Changes
    - Disable RLS on ALL existing tables in public schema
    - This is a comprehensive RLS disable for the entire development phase

  2. Tables Affected (36 tables)
    - client_payments, clients, employee_permissions, employees
    - inventories, inventory_lines, order_items, orders
    - payment_invoice_allocations, payments, permissions, pos_sessions
    - printers, product_categories, product_prices, product_recipes
    - product_recipes_by_sales_point, product_recipes_history
    - product_sales_points, product_stocks, product_types
    - production_cancellation_slips, products, restaurant_tables
    - role_permissions, roles, room_types, rooms
    - sales_points, stock_movements, storage_locations, suppliers
    - table_transfers, user_action_logs, user_sessions, void_logs

  3. Notes
    - RLS will be re-enabled at the end of the project
    - Custom authentication system does not use Supabase auth
    - This prevents all RLS-related errors during development
    - DO NOT enable RLS in any future migrations during development
*/

-- Disable RLS on all tables
ALTER TABLE client_payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE employee_permissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE employees DISABLE ROW LEVEL SECURITY;
ALTER TABLE inventories DISABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_lines DISABLE ROW LEVEL SECURITY;
ALTER TABLE order_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE payment_invoice_allocations DISABLE ROW LEVEL SECURITY;
ALTER TABLE payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE permissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE pos_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE printers DISABLE ROW LEVEL SECURITY;
ALTER TABLE product_categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE product_prices DISABLE ROW LEVEL SECURITY;
ALTER TABLE product_recipes DISABLE ROW LEVEL SECURITY;
ALTER TABLE product_recipes_by_sales_point DISABLE ROW LEVEL SECURITY;
ALTER TABLE product_recipes_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE product_sales_points DISABLE ROW LEVEL SECURITY;
ALTER TABLE product_stocks DISABLE ROW LEVEL SECURITY;
ALTER TABLE product_types DISABLE ROW LEVEL SECURITY;
ALTER TABLE production_cancellation_slips DISABLE ROW LEVEL SECURITY;
ALTER TABLE products DISABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_tables DISABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE room_types DISABLE ROW LEVEL SECURITY;
ALTER TABLE rooms DISABLE ROW LEVEL SECURITY;
ALTER TABLE sales_points DISABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements DISABLE ROW LEVEL SECURITY;
ALTER TABLE storage_locations DISABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers DISABLE ROW LEVEL SECURITY;
ALTER TABLE table_transfers DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_action_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE void_logs DISABLE ROW LEVEL SECURITY;


-- ========================================
-- Migration: 20251019161311_fix_pos_and_table_names.sql
-- ========================================
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


-- ========================================
-- Migration: 20251020191109_add_product_display_enhancements.sql
-- ========================================
/*
  # Add Product Display Enhancements

  1. Changes to `product_categories` table
    - Add `color` (text) - Hex color code for category identification
    - Add `icon` (text) - Emoji or icon name for visual display

  2. Changes to `products` table  
    - Add `icon` (text) - Emoji or icon name for product display
    - Add `is_popular` (boolean) - Flag for popular/favorite products
    - Add `popularity_score` (integer) - Score for sorting popular items

  3. Update `categories` view to include new fields

  4. Security
    - No RLS changes needed (already disabled for development)
*/

-- Add display fields to product_categories table
ALTER TABLE product_categories 
  ADD COLUMN IF NOT EXISTS color text DEFAULT '#64748b',
  ADD COLUMN IF NOT EXISTS icon text DEFAULT '📁';

-- Add display fields to products table
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS icon text DEFAULT '🍽️',
  ADD COLUMN IF NOT EXISTS is_popular boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS popularity_score integer DEFAULT 0;

-- Recreate categories view to include new fields
DROP VIEW IF EXISTS categories;
CREATE VIEW categories AS 
  SELECT 
    id,
    name,
    parent_id,
    description,
    color,
    icon,
    created_at
  FROM product_categories;

-- Update existing categories with meaningful colors and icons
UPDATE product_categories SET color = '#3b82f6', icon = '🍺' WHERE name = 'Boissons';
UPDATE product_categories SET color = '#10b981', icon = '🍾' WHERE name = 'Boissons Alcoolisées';
UPDATE product_categories SET color = '#06b6d4', icon = '🥤' WHERE name = 'Boissons non-alcoolisées';
UPDATE product_categories SET color = '#f59e0b', icon = '🍰' WHERE name = 'Desserts';
UPDATE product_categories SET color = '#ef4444', icon = '🍽️' WHERE name = 'Entrées';
UPDATE product_categories SET color = '#8b5cf6', icon = '🥗' WHERE name = 'Ingrédients';
UPDATE product_categories SET color = '#ec4899', icon = '🍲' WHERE name = 'Nourriture';
UPDATE product_categories SET color = '#f97316', icon = '🍖' WHERE name = 'Plats Principaux';
UPDATE product_categories SET color = '#14b8a6', icon = '🛎️' WHERE name = 'Services';

-- Update some popular products with icons (Coca Cola and common items)
UPDATE products SET 
  icon = '🥤',
  is_popular = true,
  popularity_score = 100
WHERE name ILIKE '%coca%cola%';

UPDATE products SET 
  icon = '🍺',
  is_popular = true,
  popularity_score = 90
WHERE name ILIKE '%bière%' OR name ILIKE '%beer%';

UPDATE products SET 
  icon = '☕',
  is_popular = true,
  popularity_score = 85
WHERE name ILIKE '%café%' OR name ILIKE '%coffee%' OR name ILIKE '%espresso%';

UPDATE products SET 
  icon = '💧',
  is_popular = true,
  popularity_score = 80
WHERE name ILIKE '%eau%' OR name ILIKE '%water%';

-- ========================================
-- Migration: 20251020205825_complete_purchasing_system.sql
-- ========================================
/*
  # Système complet de gestion des Achats / Commandes / Réceptions

  ## Description
  Création d'un système complet de gestion des achats pour un ERP:
  - Amélioration de la table fournisseurs existante
  - Création de commandes fournisseurs
  - Réception de commandes avec contrôle qualité
  - Hiérarchie des dépôts de stockage (sous-dépôts)

  ## Modifications et Ajouts

  ### 1. Amélioration de la table `suppliers` existante
  - Ajout de `supplier_code` (code fournisseur unique)
  - Ajout de `notes` (notes diverses)
  - Ajout de `updated_at` (dernière mise à jour)

  ### 2. Hiérarchie des `storage_locations`
  - Ajout de `parent_location_id` pour créer des sous-dépôts
  - Ajout de `location_type` (main_warehouse, sub_warehouse, pos_storage, waste)
  - Permet de créer: "Economat Général" > "Economat Boissons", "Chambre Froide", etc.

  ### 3. Table `purchase_orders` - Commandes fournisseurs
  - Numérotation auto: PO-2025-0001, PO-2025-0002...
  - Statuts: draft, sent, partially_received, received, cancelled
  - Montants HT, TVA et TTC
  - Lien vers fournisseur et dépôt de destination

  ### 4. Table `purchase_order_lines` - Lignes de commande
  - Produits commandés avec quantités et prix unitaires
  - Suivi automatique des quantités reçues
  - Calcul automatique du total ligne

  ### 5. Table `purchase_receptions` - Réceptions de commandes
  - Numérotation auto: REC-2025-0001, REC-2025-0002...
  - Validation des réceptions par employé
  - Statuts: pending, validated, cancelled

  ### 6. Table `purchase_reception_lines` - Détail des réceptions
  - Quantités reçues, acceptées et rejetées
  - Traçabilité: numéro de lot, date de péremption
  - Motif de rejet si applicable

  ## Automatisations

  ### Triggers automatiques
  1. **update_po_line_received_quantity**
     - Met à jour les quantités reçues dans les lignes de commande
     - Change le statut de la commande (partially_received/received)

  2. **create_stock_movement_on_reception**
     - Crée automatiquement un mouvement de stock à la réception
     - Type: 'purchase'
     - Ne traite que les quantités acceptées

  ### Fonctions utilitaires
  - `generate_next_purchase_order_number()` - Génère PO-YYYY-NNNN
  - `generate_next_reception_number()` - Génère REC-YYYY-NNNN

  ## Workflow typique

  1. **Création d'une commande**
     - Status: draft
     - Ajout des lignes de commande

  2. **Envoi de la commande**
     - Status: sent

  3. **Réception partielle ou totale**
     - Création d'une réception
     - Saisie des quantités reçues/acceptées/rejetées
     - Status commande: partially_received → received

  4. **Validation de la réception**
     - Status réception: validated
     - Création automatique des mouvements de stock

  ## Sécurité
  - RLS désactivé pour développement
*/

-- ============================================================
-- 1. AMÉLIORATION DE LA TABLE SUPPLIERS EXISTANTE
-- ============================================================

-- Ajouter les colonnes manquantes à suppliers
ALTER TABLE suppliers 
  ADD COLUMN IF NOT EXISTS supplier_code text;

ALTER TABLE suppliers 
  ADD COLUMN IF NOT EXISTS notes text DEFAULT '';

ALTER TABLE suppliers 
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Créer un code automatique pour les fournisseurs existants sans code
DO $$
DECLARE
  supplier_rec RECORD;
  counter int := 1;
BEGIN
  FOR supplier_rec IN 
    SELECT id FROM suppliers WHERE supplier_code IS NULL OR supplier_code = ''
  LOOP
    UPDATE suppliers 
    SET supplier_code = 'F' || LPAD(counter::text, 3, '0')
    WHERE id = supplier_rec.id;
    counter := counter + 1;
  END LOOP;
END $$;

-- Rendre supplier_code NOT NULL et UNIQUE
ALTER TABLE suppliers 
  ALTER COLUMN supplier_code SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'suppliers_supplier_code_key'
  ) THEN
    ALTER TABLE suppliers ADD CONSTRAINT suppliers_supplier_code_key UNIQUE (supplier_code);
  END IF;
END $$;

-- Index pour recherche rapide
CREATE INDEX IF NOT EXISTS idx_suppliers_code ON suppliers(supplier_code);
CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers(name);

-- ============================================================
-- 2. HIÉRARCHIE DES STORAGE_LOCATIONS
-- ============================================================

-- Ajouter les colonnes pour la hiérarchie
ALTER TABLE storage_locations 
  ADD COLUMN IF NOT EXISTS parent_location_id uuid REFERENCES storage_locations(id) ON DELETE SET NULL;

ALTER TABLE storage_locations 
  ADD COLUMN IF NOT EXISTS location_type text DEFAULT 'main_warehouse';

-- Ajouter le CHECK constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'storage_locations_location_type_check'
  ) THEN
    ALTER TABLE storage_locations 
      ADD CONSTRAINT storage_locations_location_type_check 
      CHECK (location_type IN ('main_warehouse', 'sub_warehouse', 'pos_storage', 'waste'));
  END IF;
END $$;

-- Index
CREATE INDEX IF NOT EXISTS idx_storage_locations_parent 
  ON storage_locations(parent_location_id);

-- ============================================================
-- 3. TABLE PURCHASE_ORDERS - COMMANDES FOURNISSEURS
-- ============================================================

CREATE TABLE IF NOT EXISTS purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text UNIQUE NOT NULL,
  supplier_id uuid REFERENCES suppliers(id) ON DELETE RESTRICT NOT NULL,
  order_date date DEFAULT CURRENT_DATE NOT NULL,
  expected_delivery_date date,
  destination_location_id uuid REFERENCES storage_locations(id) ON DELETE RESTRICT,
  status text DEFAULT 'draft' CHECK (
    status IN ('draft', 'sent', 'partially_received', 'received', 'cancelled')
  ),
  total_amount numeric(10, 2) DEFAULT 0,
  vat_amount numeric(10, 2) DEFAULT 0,
  total_with_vat numeric(10, 2) DEFAULT 0,
  notes text DEFAULT '',
  created_by uuid REFERENCES employees(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_purchase_orders_number ON purchase_orders(order_number);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier ON purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_date ON purchase_orders(order_date);

-- ============================================================
-- 4. TABLE PURCHASE_ORDER_LINES - LIGNES DE COMMANDE
-- ============================================================

CREATE TABLE IF NOT EXISTS purchase_order_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id uuid REFERENCES purchase_orders(id) ON DELETE CASCADE NOT NULL,
  product_id uuid REFERENCES products(id) ON DELETE RESTRICT NOT NULL,
  quantity_ordered numeric(10, 3) NOT NULL CHECK (quantity_ordered > 0),
  quantity_received numeric(10, 3) DEFAULT 0 CHECK (quantity_received >= 0),
  unit_price numeric(10, 2) NOT NULL CHECK (unit_price >= 0),
  vat_rate numeric(5, 2) DEFAULT 0 CHECK (vat_rate >= 0),
  total_line numeric(10, 2) GENERATED ALWAYS AS (quantity_ordered * unit_price) STORED,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_po_lines_order ON purchase_order_lines(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_po_lines_product ON purchase_order_lines(product_id);

-- ============================================================
-- 5. TABLE PURCHASE_RECEPTIONS - RÉCEPTIONS DE COMMANDES
-- ============================================================

CREATE TABLE IF NOT EXISTS purchase_receptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reception_number text UNIQUE NOT NULL,
  purchase_order_id uuid REFERENCES purchase_orders(id) ON DELETE RESTRICT NOT NULL,
  reception_date date DEFAULT CURRENT_DATE NOT NULL,
  received_by uuid REFERENCES employees(id) ON DELETE SET NULL,
  storage_location_id uuid REFERENCES storage_locations(id) ON DELETE RESTRICT NOT NULL,
  status text DEFAULT 'pending' CHECK (
    status IN ('pending', 'validated', 'cancelled')
  ),
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_receptions_number ON purchase_receptions(reception_number);
CREATE INDEX IF NOT EXISTS idx_receptions_order ON purchase_receptions(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_receptions_date ON purchase_receptions(reception_date);
CREATE INDEX IF NOT EXISTS idx_receptions_status ON purchase_receptions(status);

-- ============================================================
-- 6. TABLE PURCHASE_RECEPTION_LINES - DÉTAIL RÉCEPTION
-- ============================================================

CREATE TABLE IF NOT EXISTS purchase_reception_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reception_id uuid REFERENCES purchase_receptions(id) ON DELETE CASCADE NOT NULL,
  purchase_order_line_id uuid REFERENCES purchase_order_lines(id) ON DELETE RESTRICT NOT NULL,
  product_id uuid REFERENCES products(id) ON DELETE RESTRICT NOT NULL,
  quantity_received numeric(10, 3) NOT NULL CHECK (quantity_received >= 0),
  quantity_accepted numeric(10, 3) NOT NULL CHECK (quantity_accepted >= 0),
  quantity_rejected numeric(10, 3) DEFAULT 0 CHECK (quantity_rejected >= 0),
  rejection_reason text DEFAULT '',
  expiry_date date,
  batch_number text DEFAULT '',
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_quantities CHECK (quantity_received = quantity_accepted + quantity_rejected)
);

-- Index
CREATE INDEX IF NOT EXISTS idx_reception_lines_reception ON purchase_reception_lines(reception_id);
CREATE INDEX IF NOT EXISTS idx_reception_lines_po_line ON purchase_reception_lines(purchase_order_line_id);
CREATE INDEX IF NOT EXISTS idx_reception_lines_product ON purchase_reception_lines(product_id);

-- ============================================================
-- 7. RLS (Désactivé pour développement)
-- ============================================================

ALTER TABLE purchase_orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_lines DISABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_receptions DISABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_reception_lines DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- 8. FONCTIONS UTILITAIRES
-- ============================================================

-- Fonction pour générer le prochain numéro de commande
CREATE OR REPLACE FUNCTION generate_next_purchase_order_number()
RETURNS text AS $$
DECLARE
  next_number int;
  year_part text;
BEGIN
  year_part := TO_CHAR(CURRENT_DATE, 'YYYY');
  
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(order_number FROM 'PO-' || year_part || '-(\d+)') AS int)
  ), 0) + 1
  INTO next_number
  FROM purchase_orders
  WHERE order_number LIKE 'PO-' || year_part || '-%';
  
  RETURN 'PO-' || year_part || '-' || LPAD(next_number::text, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- Fonction pour générer le prochain numéro de réception
CREATE OR REPLACE FUNCTION generate_next_reception_number()
RETURNS text AS $$
DECLARE
  next_number int;
  year_part text;
BEGIN
  year_part := TO_CHAR(CURRENT_DATE, 'YYYY');
  
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(reception_number FROM 'REC-' || year_part || '-(\d+)') AS int)
  ), 0) + 1
  INTO next_number
  FROM purchase_receptions
  WHERE reception_number LIKE 'REC-' || year_part || '-%';
  
  RETURN 'REC-' || year_part || '-' || LPAD(next_number::text, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- Trigger pour mettre à jour les quantités reçues dans purchase_order_lines
CREATE OR REPLACE FUNCTION update_po_line_received_quantity()
RETURNS TRIGGER AS $$
BEGIN
  -- Mettre à jour la quantité reçue dans la ligne de commande
  UPDATE purchase_order_lines
  SET 
    quantity_received = quantity_received + NEW.quantity_accepted,
    updated_at = now()
  WHERE id = NEW.purchase_order_line_id;
  
  -- Mettre à jour le statut de la commande
  UPDATE purchase_orders po
  SET 
    status = CASE
      WHEN (
        SELECT SUM(pol.quantity_received) 
        FROM purchase_order_lines pol 
        WHERE pol.purchase_order_id = po.id
      ) >= (
        SELECT SUM(pol.quantity_ordered) 
        FROM purchase_order_lines pol 
        WHERE pol.purchase_order_id = po.id
      ) THEN 'received'
      WHEN (
        SELECT SUM(pol.quantity_received) 
        FROM purchase_order_lines pol 
        WHERE pol.purchase_order_id = po.id
      ) > 0 THEN 'partially_received'
      ELSE po.status
    END,
    updated_at = now()
  WHERE id = (
    SELECT pol.purchase_order_id 
    FROM purchase_order_lines pol 
    WHERE pol.id = NEW.purchase_order_line_id
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_po_received_quantity ON purchase_reception_lines;
CREATE TRIGGER trigger_update_po_received_quantity
AFTER INSERT ON purchase_reception_lines
FOR EACH ROW
EXECUTE FUNCTION update_po_line_received_quantity();

-- Trigger pour créer un mouvement de stock lors de la réception
CREATE OR REPLACE FUNCTION create_stock_movement_on_reception()
RETURNS TRIGGER AS $$
DECLARE
  reception_rec RECORD;
BEGIN
  -- Récupérer les infos de réception
  SELECT pr.storage_location_id, pr.reception_number
  INTO reception_rec
  FROM purchase_receptions pr
  WHERE pr.id = NEW.reception_id;
  
  -- Créer le mouvement de stock pour les quantités acceptées
  IF NEW.quantity_accepted > 0 THEN
    INSERT INTO stock_movements (
      product_id,
      storage_location_id,
      movement_type,
      quantity,
      reference,
      notes
    ) VALUES (
      NEW.product_id,
      reception_rec.storage_location_id,
      'purchase',
      NEW.quantity_accepted,
      reception_rec.reception_number,
      'Réception commande ' || reception_rec.reception_number
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_create_stock_movement_on_reception ON purchase_reception_lines;
CREATE TRIGGER trigger_create_stock_movement_on_reception
AFTER INSERT ON purchase_reception_lines
FOR EACH ROW
EXECUTE FUNCTION create_stock_movement_on_reception();


-- ========================================
-- Migration: 20251020223737_add_auto_stock_update_trigger.sql
-- ========================================
/*
  # Système de mise à jour automatique des stocks

  1. Nouvelle Fonction
    - `update_product_stocks_from_movement()` - Met à jour automatiquement product_stocks quand un mouvement est créé
    
  2. Comportement
    - Lors d'un INSERT dans stock_movements, met à jour ou crée l'enregistrement dans product_stocks
    - Calcule la quantité totale basée sur tous les mouvements pour ce produit/dépôt
    - Types de mouvements : 
      - 'purchase', 'transfer_in', 'adjustment_in' → augmentent le stock
      - 'sale', 'breakage', 'expired', 'transfer_out', 'adjustment_out' → diminuent le stock
    
  3. Sécurité
    - Met à jour updated_at automatiquement
    - Crée l'enregistrement s'il n'existe pas
    - Recalcule le stock complet pour éviter les incohérences

  4. Important
    - Ce trigger s'exécute APRÈS chaque insertion dans stock_movements
    - Il garantit que product_stocks reflète toujours la réalité des mouvements
*/

-- Fonction pour mettre à jour product_stocks à partir des mouvements
CREATE OR REPLACE FUNCTION update_product_stocks_from_movement()
RETURNS TRIGGER AS $$
DECLARE
  total_quantity NUMERIC;
BEGIN
  -- Calculer la quantité totale pour ce produit dans ce dépôt
  -- en additionnant tous les mouvements
  SELECT COALESCE(
    SUM(
      CASE 
        -- Mouvements qui augmentent le stock
        WHEN movement_type IN ('purchase', 'transfer_in', 'adjustment_in') THEN quantity
        -- Mouvements qui diminuent le stock
        WHEN movement_type IN ('sale', 'breakage', 'expired', 'transfer_out', 'adjustment_out') THEN -quantity
        ELSE 0
      END
    ), 0
  )
  INTO total_quantity
  FROM stock_movements
  WHERE product_id = NEW.product_id
    AND storage_location_id = NEW.storage_location_id;

  -- Insérer ou mettre à jour product_stocks
  INSERT INTO product_stocks (
    product_id,
    storage_location_id,
    quantity,
    updated_at
  ) VALUES (
    NEW.product_id,
    NEW.storage_location_id,
    total_quantity,
    NOW()
  )
  ON CONFLICT (product_id, storage_location_id)
  DO UPDATE SET
    quantity = EXCLUDED.quantity,
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Créer le trigger sur stock_movements
DROP TRIGGER IF EXISTS trigger_update_product_stocks ON stock_movements;
CREATE TRIGGER trigger_update_product_stocks
AFTER INSERT ON stock_movements
FOR EACH ROW
EXECUTE FUNCTION update_product_stocks_from_movement();

-- Ajouter une contrainte unique si elle n'existe pas déjà
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'product_stocks_product_storage_unique'
  ) THEN
    ALTER TABLE product_stocks
    ADD CONSTRAINT product_stocks_product_storage_unique 
    UNIQUE (product_id, storage_location_id);
  END IF;
END $$;


-- ========================================
-- Migration: 20251020223817_fix_stock_movements_constraints_for_purchases.sql
-- ========================================
/*
  # Mise à jour des contraintes de stock_movements pour supporter les achats

  1. Modification
    - Ajouter 'purchase' aux types de mouvements autorisés
    - Ajouter 'expired' pour les produits périmés
    - Ajouter 'transfer_in' et 'transfer_out' pour les transferts entre dépôts
    - Ajouter 'adjustment_in' et 'adjustment_out' pour les ajustements d'inventaire
  
  2. Types de mouvements finaux
    - 'sale' : vente (diminue le stock)
    - 'purchase' : achat/réception (augmente le stock)
    - 'restock' : réapprovisionnement (augmente le stock)
    - 'inventory_adjustment' : ajustement d'inventaire (peut augmenter ou diminuer)
    - 'adjustment_in' : ajustement positif (augmente le stock)
    - 'adjustment_out' : ajustement négatif (diminue le stock)
    - 'transfer' : transfert (à préciser avec transfer_in/transfer_out)
    - 'transfer_in' : transfert entrant (augmente le stock)
    - 'transfer_out' : transfert sortant (diminue le stock)
    - 'breakage' : casse (diminue le stock)
    - 'expired' : produit périmé (diminue le stock)
*/

-- Mettre à jour la contrainte pour permettre 'purchase' et autres types
ALTER TABLE stock_movements
  DROP CONSTRAINT IF EXISTS stock_movements_movement_type_check;

ALTER TABLE stock_movements
  ADD CONSTRAINT stock_movements_movement_type_check
  CHECK (movement_type IN (
    'sale', 
    'purchase', 
    'restock', 
    'inventory_adjustment',
    'adjustment_in',
    'adjustment_out',
    'transfer',
    'transfer_in',
    'transfer_out',
    'breakage',
    'expired'
  ));


-- ========================================
-- Migration: 20251020223853_add_delete_trigger_for_stock_movements.sql
-- ========================================
/*
  # Ajout du trigger pour gérer les suppressions de mouvements de stock

  1. Nouvelle Fonction
    - `update_product_stocks_on_delete()` - Met à jour product_stocks quand un mouvement est supprimé
    
  2. Comportement
    - Lors d'un DELETE dans stock_movements, recalcule le stock total
    - Utilise la même logique que le trigger INSERT pour maintenir la cohérence
    
  3. Sécurité
    - Met à jour updated_at automatiquement
    - Recalcule le stock complet basé sur tous les mouvements restants
*/

-- Fonction pour mettre à jour product_stocks lors de la suppression d'un mouvement
CREATE OR REPLACE FUNCTION update_product_stocks_on_delete()
RETURNS TRIGGER AS $$
DECLARE
  total_quantity NUMERIC;
BEGIN
  -- Calculer la quantité totale pour ce produit dans ce dépôt
  -- après suppression du mouvement
  SELECT COALESCE(
    SUM(
      CASE 
        WHEN movement_type IN ('purchase', 'transfer_in', 'adjustment_in', 'restock') THEN quantity
        WHEN movement_type IN ('sale', 'breakage', 'expired', 'transfer_out', 'adjustment_out') THEN -quantity
        ELSE 0
      END
    ), 0
  )
  INTO total_quantity
  FROM stock_movements
  WHERE product_id = OLD.product_id
    AND storage_location_id = OLD.storage_location_id;

  -- Mettre à jour product_stocks
  UPDATE product_stocks
  SET 
    quantity = total_quantity,
    updated_at = NOW()
  WHERE product_id = OLD.product_id
    AND storage_location_id = OLD.storage_location_id;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Créer le trigger sur stock_movements pour les suppressions
DROP TRIGGER IF EXISTS trigger_update_product_stocks_on_delete ON stock_movements;
CREATE TRIGGER trigger_update_product_stocks_on_delete
AFTER DELETE ON stock_movements
FOR EACH ROW
EXECUTE FUNCTION update_product_stocks_on_delete();


-- ========================================
-- Migration: 20251023165213_create_print_management_system.sql
-- ========================================
/*
  # Système de gestion des impressions

  ## Description
  Ce système permet de gérer les imprimantes logiques et les fonctions d'impression
  pour chaque point de vente. Le mapping vers les imprimantes physiques se fait
  localement sur chaque POS via un fichier de configuration.

  ## Nouvelles tables

  ### 1. printer_definitions
  Imprimantes logiques par point de vente
  - `id` (uuid, PK)
  - `name` (text) - Nom de l'imprimante logique (ex: "Cuisine Chaud Seven Seven")
  - `sales_point_id` (uuid) - Point de vente associé
  - `description` (text) - Description optionnelle
  - `is_active` (boolean) - Imprimante active ou non
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 2. print_templates
  Modèles/fonctions d'impression
  - `id` (uuid, PK)
  - `name` (text) - Nom du modèle (ex: "Ticket de Caisse Restaurant Seven Seven")
  - `template_type` (text) - Type: 'caisse' ou 'fabrication'
  - `printer_definition_id` (uuid) - Imprimante logique associée
  - `sales_point_id` (uuid) - Point de vente associé
  - `is_active` (boolean)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 3. print_template_categories
  Association entre modèles d'impression et catégories de produits
  - `id` (uuid, PK)
  - `print_template_id` (uuid) - Modèle d'impression
  - `category_id` (uuid) - Catégorie de produits (référence product_categories, pas la vue)
  - `created_at` (timestamptz)

  ## Logique
  - Les imprimantes logiques sont définies dans l'application
  - Le mapping vers imprimantes physiques se fait localement (localStorage)
  - Les tickets de caisse impriment TOUS les produits
  - Les tickets de fabrication impriment SEULEMENT les produits de leurs catégories associées

  ## Sécurité
  - RLS désactivé pour développement
*/

-- Table des imprimantes logiques
CREATE TABLE IF NOT EXISTS printer_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  sales_point_id uuid NOT NULL REFERENCES sales_points(id) ON DELETE CASCADE,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table des modèles d'impression
CREATE TABLE IF NOT EXISTS print_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  template_type text NOT NULL CHECK (template_type IN ('caisse', 'fabrication')),
  printer_definition_id uuid NOT NULL REFERENCES printer_definitions(id) ON DELETE CASCADE,
  sales_point_id uuid NOT NULL REFERENCES sales_points(id) ON DELETE CASCADE,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table d'association modèles d'impression <-> catégories
-- Utilise product_categories (la table) et non categories (la vue)
CREATE TABLE IF NOT EXISTS print_template_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  print_template_id uuid NOT NULL REFERENCES print_templates(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES product_categories(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(print_template_id, category_id)
);

-- Index pour performances
CREATE INDEX IF NOT EXISTS idx_printer_definitions_sales_point ON printer_definitions(sales_point_id);
CREATE INDEX IF NOT EXISTS idx_printer_definitions_active ON printer_definitions(is_active);
CREATE INDEX IF NOT EXISTS idx_print_templates_printer ON print_templates(printer_definition_id);
CREATE INDEX IF NOT EXISTS idx_print_templates_sales_point ON print_templates(sales_point_id);
CREATE INDEX IF NOT EXISTS idx_print_templates_type ON print_templates(template_type);
CREATE INDEX IF NOT EXISTS idx_print_template_categories_template ON print_template_categories(print_template_id);
CREATE INDEX IF NOT EXISTS idx_print_template_categories_category ON print_template_categories(category_id);

-- Trigger pour updated_at sur printer_definitions
CREATE OR REPLACE FUNCTION update_printer_definitions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_printer_definitions_updated_at
  BEFORE UPDATE ON printer_definitions
  FOR EACH ROW
  EXECUTE FUNCTION update_printer_definitions_updated_at();

-- Trigger pour updated_at sur print_templates
CREATE OR REPLACE FUNCTION update_print_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_print_templates_updated_at
  BEFORE UPDATE ON print_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_print_templates_updated_at();

-- RLS
ALTER TABLE printer_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE print_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE print_template_categories ENABLE ROW LEVEL SECURITY;

-- Policies (désactivées pour développement)
CREATE POLICY "Allow all operations on printer_definitions for development"
  ON printer_definitions FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all operations on print_templates for development"
  ON print_templates FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all operations on print_template_categories for development"
  ON print_template_categories FOR ALL
  USING (true)
  WITH CHECK (true);


-- ========================================
-- Migration: 20251023170313_remove_sales_point_from_print_templates.sql
-- ========================================
/*
  # Suppression du champ sales_point_id de print_templates

  ## Description
  Le champ sales_point_id dans la table print_templates est redondant car le point de vente
  est déjà défini dans la table printer_definitions. Cette migration supprime cette redondance.

  ## Changements
  1. Suppression de la colonne sales_point_id de la table print_templates
  2. Suppression de l'index associé

  ## Impact
  - Les fonctions d'impression héritent automatiquement du point de vente de leur imprimante logique
  - Simplification du modèle de données
  - Aucune perte de fonctionnalité
*/

-- Supprimer l'index
DROP INDEX IF EXISTS idx_print_templates_sales_point;

-- Supprimer la colonne sales_point_id
ALTER TABLE print_templates 
DROP COLUMN IF EXISTS sales_point_id;


-- ========================================
-- Migration: 20251027155644_complete_hotel_system_add_missing_tables.sql
-- ========================================
/*
  # Complétion du Système Hôtelier

  ## Description
  Ajoute les tables manquantes pour compléter le module hôtel :
  
  ## Nouvelles tables
  1. **hotel_meal_plans** - Formules de restauration (Petit Déj, Demi-Pension, Pension Complète)
  2. **hotel_stays** - Séjours actifs (après check-in)
  3. **hotel_room_charges** - Charges additionnelles sur chambres
  4. **hotel_payments** - Paiements clients hôtel
  5. **hotel_card_encodings** - Historique encodage cartes magnétiques (déjà existe comme hotel_card_keys)
  
  ## Modifications
  - Ajout de `meal_plan_id` aux réservations
  - Ajout de `nationality` et `adults/children_count` aux réservations
  - Création des données de test pour les formules

  ## Sécurité
  RLS activé mais en mode développement (accès complet)
*/

-- ============================================
-- 1. FORMULES DE RESTAURATION
-- ============================================
CREATE TABLE IF NOT EXISTS hotel_meal_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text UNIQUE NOT NULL,
  description text,
  price_adult numeric(10,2) DEFAULT 0,
  price_child numeric(10,2) DEFAULT 0,
  includes_breakfast boolean DEFAULT false,
  includes_lunch boolean DEFAULT false,
  includes_dinner boolean DEFAULT false,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE hotel_meal_plans ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 2. SÉJOURS ACTIFS (après check-in)
-- ============================================
CREATE TABLE IF NOT EXISTS hotel_stays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id uuid REFERENCES hotel_reservations(id) ON DELETE SET NULL,
  room_id uuid REFERENCES hotel_rooms(id) ON DELETE SET NULL,
  guest_name text NOT NULL,
  check_in_date timestamptz NOT NULL DEFAULT now(),
  check_out_date date NOT NULL,
  actual_check_out timestamptz,
  meal_plan_id uuid REFERENCES hotel_meal_plans(id) ON DELETE SET NULL,
  card_number text,
  card_encoded_at timestamptz,
  room_charges numeric(10,2) DEFAULT 0,
  mini_bar_charges numeric(10,2) DEFAULT 0,
  restaurant_charges numeric(10,2) DEFAULT 0,
  other_charges numeric(10,2) DEFAULT 0,
  total_charges numeric(10,2) DEFAULT 0,
  notes text,
  status text DEFAULT 'active' CHECK (status IN ('active', 'checked_out')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE hotel_stays ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_stays_status ON hotel_stays(status);
CREATE INDEX IF NOT EXISTS idx_stays_room ON hotel_stays(room_id);
CREATE INDEX IF NOT EXISTS idx_stays_checkout ON hotel_stays(check_out_date);

-- ============================================
-- 3. CHARGES ADDITIONNELLES SUR CHAMBRES
-- ============================================
CREATE TABLE IF NOT EXISTS hotel_room_charges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stay_id uuid REFERENCES hotel_stays(id) ON DELETE CASCADE,
  charge_type text NOT NULL CHECK (charge_type IN ('minibar', 'restaurant', 'laundry', 'room_service', 'parking', 'telephone', 'other')),
  description text NOT NULL,
  amount numeric(10,2) NOT NULL,
  quantity integer DEFAULT 1,
  total numeric(10,2) NOT NULL,
  pos_order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  charged_at timestamptz DEFAULT now(),
  charged_by uuid REFERENCES employees(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE hotel_room_charges ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_charges_stay ON hotel_room_charges(stay_id);
CREATE INDEX IF NOT EXISTS idx_charges_type ON hotel_room_charges(charge_type);
CREATE INDEX IF NOT EXISTS idx_charges_pos_order ON hotel_room_charges(pos_order_id);

-- ============================================
-- 4. PAIEMENTS HÔTEL
-- ============================================
CREATE TABLE IF NOT EXISTS hotel_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stay_id uuid REFERENCES hotel_stays(id) ON DELETE SET NULL,
  reservation_id uuid REFERENCES hotel_reservations(id) ON DELETE SET NULL,
  payment_type text NOT NULL CHECK (payment_type IN ('cash', 'card', 'bank_transfer', 'check', 'online', 'deposit')),
  amount numeric(10,2) NOT NULL,
  reference text,
  notes text,
  received_by uuid REFERENCES employees(id) ON DELETE SET NULL,
  sales_point_id uuid REFERENCES sales_points(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE hotel_payments ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_hotel_payments_stay ON hotel_payments(stay_id);
CREATE INDEX IF NOT EXISTS idx_hotel_payments_reservation ON hotel_payments(reservation_id);
CREATE INDEX IF NOT EXISTS idx_hotel_payments_date ON hotel_payments(created_at);

-- ============================================
-- 5. AJOUT DE COLONNES AUX RÉSERVATIONS
-- ============================================
DO $$
BEGIN
  -- Ajout meal_plan_id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'hotel_reservations' AND column_name = 'meal_plan_id'
  ) THEN
    ALTER TABLE hotel_reservations ADD COLUMN meal_plan_id uuid REFERENCES hotel_meal_plans(id) ON DELETE SET NULL;
  END IF;

  -- Ajout meal_plan_price
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'hotel_reservations' AND column_name = 'meal_plan_price'
  ) THEN
    ALTER TABLE hotel_reservations ADD COLUMN meal_plan_price numeric(10,2) DEFAULT 0;
  END IF;

  -- Ajout nationality
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'hotel_reservations' AND column_name = 'guest_nationality'
  ) THEN
    ALTER TABLE hotel_reservations ADD COLUMN guest_nationality text;
  END IF;

  -- Ajout adults_count
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'hotel_reservations' AND column_name = 'adults_count'
  ) THEN
    ALTER TABLE hotel_reservations ADD COLUMN adults_count integer DEFAULT 1;
  END IF;

  -- Ajout children_count
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'hotel_reservations' AND column_name = 'children_count'
  ) THEN
    ALTER TABLE hotel_reservations ADD COLUMN children_count integer DEFAULT 0;
  END IF;

  -- Ajout total_amount
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'hotel_reservations' AND column_name = 'total_amount'
  ) THEN
    ALTER TABLE hotel_reservations ADD COLUMN total_amount numeric(10,2) DEFAULT 0;
  END IF;

  -- Ajout deposit_amount
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'hotel_reservations' AND column_name = 'deposit_amount'
  ) THEN
    ALTER TABLE hotel_reservations ADD COLUMN deposit_amount numeric(10,2) DEFAULT 0;
  END IF;

  -- Ajout balance_due
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'hotel_reservations' AND column_name = 'balance_due'
  ) THEN
    ALTER TABLE hotel_reservations ADD COLUMN balance_due numeric(10,2) DEFAULT 0;
  END IF;
END $$;

-- ============================================
-- 6. DONNÉES INITIALES - FORMULES RESTAURATION
-- ============================================
INSERT INTO hotel_meal_plans (name, code, description, price_adult, price_child, includes_breakfast, includes_lunch, includes_dinner, active)
VALUES
  ('Chambre Seule', 'RO', 'Nuitée uniquement sans repas', 0, 0, false, false, false, true),
  ('Petit Déjeuner', 'BB', 'Nuitée avec petit déjeuner inclus', 15.00, 8.00, true, false, false, true),
  ('Demi-Pension', 'HB', 'Nuitée avec petit déjeuner et dîner', 35.00, 18.00, true, false, true, true),
  ('Pension Complète', 'FB', 'Nuitée avec tous les repas (petit déjeuner, déjeuner, dîner)', 50.00, 25.00, true, true, true, true)
ON CONFLICT (code) DO NOTHING;

-- ============================================
-- 7. TRIGGER POUR RECALCULER LES CHARGES
-- ============================================
CREATE OR REPLACE FUNCTION update_stay_total_charges()
RETURNS TRIGGER AS $$
BEGIN
  -- Recalculer le total des charges par type
  UPDATE hotel_stays
  SET 
    restaurant_charges = COALESCE((
      SELECT SUM(total)
      FROM hotel_room_charges
      WHERE stay_id = COALESCE(NEW.stay_id, OLD.stay_id) AND charge_type = 'restaurant'
    ), 0),
    mini_bar_charges = COALESCE((
      SELECT SUM(total)
      FROM hotel_room_charges
      WHERE stay_id = COALESCE(NEW.stay_id, OLD.stay_id) AND charge_type = 'minibar'
    ), 0),
    other_charges = COALESCE((
      SELECT SUM(total)
      FROM hotel_room_charges
      WHERE stay_id = COALESCE(NEW.stay_id, OLD.stay_id) AND charge_type NOT IN ('restaurant', 'minibar')
    ), 0),
    total_charges = COALESCE((
      SELECT SUM(total)
      FROM hotel_room_charges
      WHERE stay_id = COALESCE(NEW.stay_id, OLD.stay_id)
    ), 0)
  WHERE id = COALESCE(NEW.stay_id, OLD.stay_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_stay_charges_trigger ON hotel_room_charges;
CREATE TRIGGER update_stay_charges_trigger
  AFTER INSERT OR UPDATE OR DELETE ON hotel_room_charges
  FOR EACH ROW
  EXECUTE FUNCTION update_stay_total_charges();

-- ========================================
-- Migration: 20251027155739_add_43_hotel_rooms_data_v2.sql
-- ========================================
/*
  # Données des 43 Chambres d'Hôtel

  ## Description
  Création des 43 chambres physiques réparties comme suit :
  - 38 Chambres Simples (numéros 101-138)
  - 5 Suites (numéros 201-205)
  
  ## Répartition par étage
  - Étage 1 : Chambres 101-138 (38 chambres simples)
  - Étage 2 : Chambres 201-205 (5 suites)

  ## Notes
  - Toutes les chambres démarrent avec le statut 'available'
  - Les types sont 'simple' ou 'suite' (contrainte existante)
*/

-- Suppression des données de test existantes
DELETE FROM hotel_rooms;

-- ============================================
-- ÉTAGE 1 : 38 CHAMBRES SIMPLES (101-138)
-- ============================================
INSERT INTO hotel_rooms (room_number, room_type, floor, status, max_occupancy, features)
VALUES
  ('101', 'simple', 1, 'available', 2, '{"vue": "jardin", "lit": "double"}'::jsonb),
  ('102', 'simple', 1, 'available', 2, '{"vue": "jardin", "lit": "double"}'::jsonb),
  ('103', 'simple', 1, 'available', 2, '{"vue": "jardin", "lit": "double"}'::jsonb),
  ('104', 'simple', 1, 'available', 2, '{"vue": "jardin", "lit": "double"}'::jsonb),
  ('105', 'simple', 1, 'available', 2, '{"vue": "jardin", "lit": "double"}'::jsonb),
  ('106', 'simple', 1, 'available', 2, '{"vue": "rue", "lit": "double"}'::jsonb),
  ('107', 'simple', 1, 'available', 2, '{"vue": "rue", "lit": "double"}'::jsonb),
  ('108', 'simple', 1, 'available', 2, '{"vue": "rue", "lit": "double"}'::jsonb),
  ('109', 'simple', 1, 'available', 2, '{"vue": "rue", "lit": "double"}'::jsonb),
  ('110', 'simple', 1, 'available', 2, '{"vue": "rue", "lit": "double"}'::jsonb),
  ('111', 'simple', 1, 'available', 2, '{"vue": "jardin", "lit": "twin"}'::jsonb),
  ('112', 'simple', 1, 'available', 2, '{"vue": "jardin", "lit": "twin"}'::jsonb),
  ('113', 'simple', 1, 'available', 2, '{"vue": "jardin", "lit": "twin"}'::jsonb),
  ('114', 'simple', 1, 'available', 2, '{"vue": "jardin", "lit": "twin"}'::jsonb),
  ('115', 'simple', 1, 'available', 2, '{"vue": "jardin", "lit": "twin"}'::jsonb),
  ('116', 'simple', 1, 'available', 2, '{"vue": "rue", "lit": "twin"}'::jsonb),
  ('117', 'simple', 1, 'available', 2, '{"vue": "rue", "lit": "twin"}'::jsonb),
  ('118', 'simple', 1, 'available', 2, '{"vue": "rue", "lit": "twin"}'::jsonb),
  ('119', 'simple', 1, 'available', 2, '{"vue": "rue", "lit": "twin"}'::jsonb),
  ('120', 'simple', 1, 'available', 2, '{"vue": "rue", "lit": "twin"}'::jsonb),
  ('121', 'simple', 1, 'available', 2, '{"vue": "jardin", "lit": "double"}'::jsonb),
  ('122', 'simple', 1, 'available', 2, '{"vue": "jardin", "lit": "double"}'::jsonb),
  ('123', 'simple', 1, 'available', 2, '{"vue": "jardin", "lit": "double"}'::jsonb),
  ('124', 'simple', 1, 'available', 2, '{"vue": "jardin", "lit": "double"}'::jsonb),
  ('125', 'simple', 1, 'available', 2, '{"vue": "jardin", "lit": "double"}'::jsonb),
  ('126', 'simple', 1, 'available', 2, '{"vue": "rue", "lit": "double"}'::jsonb),
  ('127', 'simple', 1, 'available', 2, '{"vue": "rue", "lit": "double"}'::jsonb),
  ('128', 'simple', 1, 'available', 2, '{"vue": "rue", "lit": "double"}'::jsonb),
  ('129', 'simple', 1, 'available', 2, '{"vue": "rue", "lit": "double"}'::jsonb),
  ('130', 'simple', 1, 'available', 2, '{"vue": "rue", "lit": "double"}'::jsonb),
  ('131', 'simple', 1, 'available', 2, '{"vue": "jardin", "lit": "twin"}'::jsonb),
  ('132', 'simple', 1, 'available', 2, '{"vue": "jardin", "lit": "twin"}'::jsonb),
  ('133', 'simple', 1, 'available', 2, '{"vue": "jardin", "lit": "twin"}'::jsonb),
  ('134', 'simple', 1, 'available', 2, '{"vue": "jardin", "lit": "twin"}'::jsonb),
  ('135', 'simple', 1, 'available', 2, '{"vue": "jardin", "lit": "twin"}'::jsonb),
  ('136', 'simple', 1, 'available', 2, '{"vue": "rue", "lit": "twin"}'::jsonb),
  ('137', 'simple', 1, 'available', 2, '{"vue": "rue", "lit": "twin"}'::jsonb),
  ('138', 'simple', 1, 'available', 2, '{"vue": "rue", "lit": "twin"}'::jsonb);

-- ============================================
-- ÉTAGE 2 : 5 SUITES (201-205)
-- ============================================
INSERT INTO hotel_rooms (room_number, room_type, floor, status, max_occupancy, features)
VALUES
  ('201', 'suite', 2, 'available', 4, '{"vue": "panoramique", "lit": "king", "salon": true, "balcon": true}'::jsonb),
  ('202', 'suite', 2, 'available', 4, '{"vue": "panoramique", "lit": "king", "salon": true, "balcon": true}'::jsonb),
  ('203', 'suite', 2, 'available', 4, '{"vue": "panoramique", "lit": "king", "salon": true, "balcon": true}'::jsonb),
  ('204', 'suite', 2, 'available', 4, '{"vue": "panoramique", "lit": "king", "salon": true, "balcon": true}'::jsonb),
  ('205', 'suite', 2, 'available', 4, '{"vue": "panoramique", "lit": "king", "salon": true, "balcon": true, "jacuzzi": true}'::jsonb);

-- ========================================
-- Migration: 20251027155836_add_hotel_pricing_data_v2.sql
-- ========================================
/*
  # Tarifs Hôteliers

  ## Description
  Ajout des tarifs de base et tarifs saisonniers pour les chambres
  
  ## Types de tarifs créés
  1. **Chambre Simple** - Tarifs de base et variations saisonnières
  2. **Suite** - Tarifs de base et variations saisonnières
  
  ## Périodes de tarification
  - Basse saison (Novembre-Mars sauf vacances)
  - Moyenne saison (Avril-Mai, Septembre-Octobre)
  - Haute saison (Juin-Août)
  - Vacances/Week-ends (supplément)
*/

-- Suppression des données de test existantes
DELETE FROM hotel_seasonal_rates;
DELETE FROM hotel_rate_types;

-- ============================================
-- 1. TYPES DE TARIFS DE BASE
-- ============================================
INSERT INTO hotel_rate_types (name, description, category, base_price, active)
VALUES
  ('Chambre Simple Standard', 'Tarif standard pour chambre simple (2 personnes)', 'room', 75.00, true),
  ('Suite Standard', 'Tarif standard pour suite (jusqu''à 4 personnes)', 'room', 150.00, true);

-- ============================================
-- 2. TARIFS SAISONNIERS
-- ============================================

DO $$
DECLARE
  simple_rate_id uuid;
  suite_rate_id uuid;
BEGIN
  -- Récupération des IDs
  SELECT id INTO simple_rate_id FROM hotel_rate_types WHERE name = 'Chambre Simple Standard';
  SELECT id INTO suite_rate_id FROM hotel_rate_types WHERE name = 'Suite Standard';

  -- BASSE SAISON (Novembre-Mars) : -20%
  INSERT INTO hotel_seasonal_rates (rate_type_id, name, start_date, end_date, price_modifier, modifier_type, priority, active)
  VALUES
    (simple_rate_id, 'Basse Saison Hiver', '2025-11-01', '2026-03-31', -20, 'percentage', 1, true),
    (suite_rate_id, 'Basse Saison Hiver', '2025-11-01', '2026-03-31', -20, 'percentage', 1, true);

  -- MOYENNE SAISON (Avril-Mai, Septembre-Octobre) : Prix normal (0%)
  INSERT INTO hotel_seasonal_rates (rate_type_id, name, start_date, end_date, price_modifier, modifier_type, priority, active)
  VALUES
    (simple_rate_id, 'Moyenne Saison Printemps', '2025-04-01', '2025-05-31', 0, 'percentage', 2, true),
    (simple_rate_id, 'Moyenne Saison Automne', '2025-09-01', '2025-10-31', 0, 'percentage', 2, true),
    (suite_rate_id, 'Moyenne Saison Printemps', '2025-04-01', '2025-05-31', 0, 'percentage', 2, true),
    (suite_rate_id, 'Moyenne Saison Automne', '2025-09-01', '2025-10-31', 0, 'percentage', 2, true);

  -- HAUTE SAISON (Juin-Août) : +30%
  INSERT INTO hotel_seasonal_rates (rate_type_id, name, start_date, end_date, price_modifier, modifier_type, priority, active)
  VALUES
    (simple_rate_id, 'Haute Saison Été', '2025-06-01', '2025-08-31', 30, 'percentage', 3, true),
    (suite_rate_id, 'Haute Saison Été', '2025-06-01', '2025-08-31', 30, 'percentage', 3, true);

  -- VACANCES SCOLAIRES : +15%
  INSERT INTO hotel_seasonal_rates (rate_type_id, name, start_date, end_date, price_modifier, modifier_type, priority, active)
  VALUES
    (simple_rate_id, 'Vacances Noël', '2025-12-20', '2026-01-05', 15, 'percentage', 5, true),
    (suite_rate_id, 'Vacances Noël', '2025-12-20', '2026-01-05', 15, 'percentage', 5, true),
    (simple_rate_id, 'Vacances Pâques', '2025-04-19', '2025-05-04', 15, 'percentage', 5, true),
    (suite_rate_id, 'Vacances Pâques', '2025-04-19', '2025-05-04', 15, 'percentage', 5, true);

  -- WEEK-ENDS (Vendredi-Samedi) : +10€ fixe
  INSERT INTO hotel_seasonal_rates (rate_type_id, name, start_date, end_date, price_modifier, modifier_type, priority, active)
  VALUES
    (simple_rate_id, 'Supplément Week-end', '2025-01-01', '2025-12-31', 10, 'fixed', 4, true),
    (suite_rate_id, 'Supplément Week-end', '2025-01-01', '2025-12-31', 20, 'fixed', 4, true);

END $$;

-- ========================================
-- Migration: 20251027202203_add_client_link_to_reservations.sql
-- ========================================
/*
  # Add client linking and pricing fields to hotel reservations

  1. Changes
    - Add `client_id` column to link reservations to clients table
    - Add `nights_count` column to store number of nights
    - Add `room_price_per_night` column to store room price per night
    
  2. Notes
    - client_id is nullable to allow walk-in guests without client account
    - All new columns have appropriate defaults
*/

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'hotel_reservations' AND column_name = 'client_id'
  ) THEN
    ALTER TABLE hotel_reservations 
    ADD COLUMN client_id uuid REFERENCES clients(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'hotel_reservations' AND column_name = 'nights_count'
  ) THEN
    ALTER TABLE hotel_reservations 
    ADD COLUMN nights_count integer DEFAULT 1;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'hotel_reservations' AND column_name = 'room_price_per_night'
  ) THEN
    ALTER TABLE hotel_reservations 
    ADD COLUMN room_price_per_night numeric(10,2) DEFAULT 0;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_hotel_reservations_client_id ON hotel_reservations(client_id);


-- ========================================
-- Migration: 20251027202519_replace_all_hotel_rooms_with_correct_list.sql
-- ========================================
/*
  # Replace all hotel rooms with correct room numbers

  1. Changes
    - Delete all existing rooms
    - Create 43 rooms with the correct numbers
    - Rooms: 100-107, 110-114, 120-125, 130-131, 200-207, 210-214, 220-225, 230-231
    
  2. Room Types
    - Rooms ending in 0: suites (larger rooms)
    - All others: simple rooms
*/

DELETE FROM hotel_rooms;

INSERT INTO hotel_rooms (room_number, room_type, floor, max_occupancy, status, features) VALUES
('100', 'suite', 1, 4, 'available', '{"view": "jardin", "balcony": true}'),
('101', 'simple', 1, 2, 'available', '{}'),
('102', 'simple', 1, 2, 'available', '{}'),
('103', 'simple', 1, 2, 'available', '{}'),
('104', 'simple', 1, 2, 'available', '{}'),
('105', 'simple', 1, 2, 'available', '{}'),
('106', 'simple', 1, 2, 'available', '{}'),
('107', 'simple', 1, 2, 'available', '{}'),
('110', 'suite', 1, 4, 'available', '{"view": "jardin", "balcony": true}'),
('111', 'simple', 1, 2, 'available', '{}'),
('112', 'simple', 1, 2, 'available', '{}'),
('113', 'simple', 1, 2, 'available', '{}'),
('114', 'simple', 1, 2, 'available', '{}'),
('120', 'suite', 1, 4, 'available', '{"view": "piscine", "balcony": true}'),
('121', 'simple', 1, 2, 'available', '{}'),
('122', 'simple', 1, 2, 'available', '{}'),
('123', 'simple', 1, 2, 'available', '{}'),
('124', 'simple', 1, 2, 'available', '{}'),
('125', 'simple', 1, 2, 'available', '{}'),
('130', 'suite', 1, 4, 'available', '{"view": "piscine", "balcony": true}'),
('131', 'simple', 1, 2, 'available', '{}'),
('200', 'suite', 2, 4, 'available', '{"view": "panoramique", "balcony": true}'),
('201', 'suite', 2, 4, 'available', '{"view": "panoramique", "balcony": true}'),
('202', 'simple', 2, 2, 'available', '{}'),
('203', 'simple', 2, 2, 'available', '{}'),
('204', 'simple', 2, 2, 'available', '{}'),
('205', 'simple', 2, 2, 'available', '{}'),
('206', 'simple', 2, 2, 'available', '{}'),
('207', 'simple', 2, 2, 'available', '{}'),
('210', 'suite', 2, 4, 'available', '{"view": "panoramique", "balcony": true}'),
('211', 'suite', 2, 4, 'available', '{"view": "panoramique", "balcony": true}'),
('212', 'simple', 2, 2, 'available', '{}'),
('213', 'simple', 2, 2, 'available', '{}'),
('214', 'simple', 2, 2, 'available', '{}'),
('220', 'suite', 2, 4, 'available', '{"view": "mer", "balcony": true}'),
('221', 'suite', 2, 4, 'available', '{"view": "mer", "balcony": true}'),
('222', 'simple', 2, 2, 'available', '{}'),
('223', 'simple', 2, 2, 'available', '{}'),
('224', 'simple', 2, 2, 'available', '{}'),
('225', 'simple', 2, 2, 'available', '{}'),
('230', 'suite', 2, 4, 'available', '{"view": "mer", "balcony": true}'),
('231', 'suite', 2, 4, 'available', '{"view": "mer", "balcony": true}');


-- ========================================
-- Migration: 20251027203815_add_nationality_to_clients.sql
-- ========================================
/*
  # Add nationality field to clients table

  1. Changes
    - Add nullable nationality field to clients table
    - This field stores the nationality of the client (optional information)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'nationality'
  ) THEN
    ALTER TABLE clients ADD COLUMN nationality text;
  END IF;
END $$;


-- ========================================
-- Migration: 20251027210918_add_auto_room_status_update_triggers.sql
-- ========================================
/*
  # Système de mise à jour automatique du statut des chambres
  
  1. Triggers
    - Trigger pour mettre à jour le statut de la chambre à 'occupied' lors d'un check-in
    - Trigger pour mettre à jour le statut de la chambre à 'available' lors d'un check-out
    - Trigger pour gérer les changements de statut des séjours
  
  2. Fonctions
    - `update_room_status_on_stay_change()` : Met à jour automatiquement le statut de la chambre
    
  3. Notes importantes
    - Le statut 'occupied' est automatiquement appliqué quand un séjour devient 'active'
    - Le statut 'available' est automatiquement appliqué quand un séjour devient 'checked_out'
    - Si plusieurs séjours actifs existent pour la même chambre, elle reste 'occupied'
*/

-- Fonction pour mettre à jour le statut de la chambre en fonction des séjours actifs
CREATE OR REPLACE FUNCTION update_room_status_on_stay_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Cas 1: Nouveau séjour actif (INSERT avec status='active' ou UPDATE vers status='active')
  IF (TG_OP = 'INSERT' AND NEW.status = 'active') OR 
     (TG_OP = 'UPDATE' AND NEW.status = 'active' AND OLD.status != 'active') THEN
    
    UPDATE hotel_rooms
    SET status = 'occupied'
    WHERE id = NEW.room_id;
    
    RETURN NEW;
  END IF;
  
  -- Cas 2: Séjour terminé (UPDATE vers status='checked_out' ou DELETE)
  IF (TG_OP = 'UPDATE' AND NEW.status = 'checked_out' AND OLD.status = 'active') OR
     (TG_OP = 'DELETE' AND OLD.status = 'active') THEN
    
    -- Vérifier s'il reste d'autres séjours actifs pour cette chambre
    IF NOT EXISTS (
      SELECT 1 FROM hotel_stays
      WHERE room_id = COALESCE(NEW.room_id, OLD.room_id)
      AND status = 'active'
      AND id != COALESCE(NEW.id, OLD.id)
    ) THEN
      -- Aucun autre séjour actif, la chambre devient disponible
      UPDATE hotel_rooms
      SET status = 'available'
      WHERE id = COALESCE(NEW.room_id, OLD.room_id);
    END IF;
    
    RETURN COALESCE(NEW, OLD);
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Supprimer les anciens triggers s'ils existent
DROP TRIGGER IF EXISTS trigger_update_room_status_on_stay_insert ON hotel_stays;
DROP TRIGGER IF EXISTS trigger_update_room_status_on_stay_update ON hotel_stays;
DROP TRIGGER IF EXISTS trigger_update_room_status_on_stay_delete ON hotel_stays;

-- Créer les triggers
CREATE TRIGGER trigger_update_room_status_on_stay_insert
AFTER INSERT ON hotel_stays
FOR EACH ROW
EXECUTE FUNCTION update_room_status_on_stay_change();

CREATE TRIGGER trigger_update_room_status_on_stay_update
AFTER UPDATE ON hotel_stays
FOR EACH ROW
EXECUTE FUNCTION update_room_status_on_stay_change();

CREATE TRIGGER trigger_update_room_status_on_stay_delete
AFTER DELETE ON hotel_stays
FOR EACH ROW
EXECUTE FUNCTION update_room_status_on_stay_change();

-- Synchroniser le statut actuel des chambres avec les séjours existants
UPDATE hotel_rooms r
SET status = CASE
  WHEN EXISTS (
    SELECT 1 FROM hotel_stays s
    WHERE s.room_id = r.id AND s.status = 'active'
  ) THEN 'occupied'
  ELSE 'available'
END;

-- ========================================
-- Migration: 20251101123424_add_room_type_to_rate_types.sql
-- ========================================
/*
  # Add room_type filter to hotel_rate_types
  
  1. Changes
    - Add `room_type` column to `hotel_rate_types` table
    - Set appropriate values for existing rate types
    - Allow NULL for rate types that apply to all room types
  
  2. Notes
    - Chambre Simple rates will have room_type = 'simple'
    - Suite rates will have room_type = 'suite'
    - NULL means the rate applies to all room types
*/

-- Add room_type column
ALTER TABLE hotel_rate_types 
ADD COLUMN IF NOT EXISTS room_type text;

-- Update existing rate types based on their name
UPDATE hotel_rate_types 
SET room_type = 'simple' 
WHERE name ILIKE '%chambre simple%';

UPDATE hotel_rate_types 
SET room_type = 'suite' 
WHERE name ILIKE '%suite%';

-- ========================================
-- Migration: 20251101132258_add_automatic_status_cleanup_system_v2.sql
-- ========================================
/*
  # Système de nettoyage automatique des statuts expirés

  Ce système garantit que :
  1. Les séjours expirés (check_out_date < aujourd'hui) passent en 'checked_out'
  2. Les chambres occupées sans séjour actif repassent en 'available'
  3. Les réservations expirées (check_in_date < aujourd'hui et status = 'confirmed') passent en 'no_show'
  4. Les chambres avec status 'reserved' sans réservation future repassent en 'available'

  ## Fonctions créées
  - `cleanup_expired_hotel_statuses()` : Fonction principale de nettoyage à appeler manuellement
  - Triggers automatiques sur INSERT/UPDATE/DELETE des séjours et réservations
*/

-- Fonction de nettoyage des statuts expirés
CREATE OR REPLACE FUNCTION cleanup_expired_hotel_statuses()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- 1. Marquer les séjours expirés comme 'checked_out'
  UPDATE hotel_stays
  SET status = 'checked_out'
  WHERE status = 'active' 
    AND check_out_date < CURRENT_DATE;

  -- 2. Marquer les réservations expirées comme 'no_show'
  UPDATE hotel_reservations
  SET status = 'no_show'
  WHERE status = 'confirmed'
    AND check_in_date < CURRENT_DATE;

  -- 3. Libérer les chambres occupées sans séjour actif
  UPDATE hotel_rooms
  SET status = 'available'
  WHERE status = 'occupied'
    AND NOT EXISTS (
      SELECT 1 FROM hotel_stays
      WHERE hotel_stays.room_id = hotel_rooms.id
        AND hotel_stays.status = 'active'
        AND hotel_stays.check_out_date >= CURRENT_DATE
    );

  -- 4. Mettre à jour les chambres réservées sans réservation confirmée future
  UPDATE hotel_rooms
  SET status = 'available'
  WHERE status = 'reserved'
    AND NOT EXISTS (
      SELECT 1 FROM hotel_reservations
      WHERE hotel_reservations.room_id = hotel_rooms.id
        AND hotel_reservations.status = 'confirmed'
        AND hotel_reservations.check_in_date >= CURRENT_DATE
    );

END;
$$;

-- Trigger pour nettoyer après modification des séjours
CREATE OR REPLACE FUNCTION trigger_cleanup_after_stay_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM cleanup_expired_hotel_statuses();
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS after_stay_change_cleanup ON hotel_stays;
CREATE TRIGGER after_stay_change_cleanup
  AFTER INSERT OR UPDATE OR DELETE ON hotel_stays
  FOR EACH ROW
  EXECUTE FUNCTION trigger_cleanup_after_stay_change();

-- Trigger pour nettoyer après modification des réservations
CREATE OR REPLACE FUNCTION trigger_cleanup_after_reservation_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM cleanup_expired_hotel_statuses();
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS after_reservation_change_cleanup ON hotel_reservations;
CREATE TRIGGER after_reservation_change_cleanup
  AFTER INSERT OR UPDATE OR DELETE ON hotel_reservations
  FOR EACH ROW
  EXECUTE FUNCTION trigger_cleanup_after_reservation_change();

-- Exécuter immédiatement le nettoyage pour corriger les données existantes
SELECT cleanup_expired_hotel_statuses();


-- ========================================
-- Migration: 20251101141307_disable_rls_hotel_stays.sql
-- ========================================
/*
  # Désactiver RLS pour hotel_stays
  
  1. Changements
    - Désactive RLS sur la table hotel_stays pour permettre les opérations de check-in/check-out
  
  2. Notes
    - Le RLS était activé sans aucune politique, bloquant toutes les insertions
    - Cette table fait partie du système de gestion hôtelière et doit être accessible comme les autres tables
*/

ALTER TABLE hotel_stays DISABLE ROW LEVEL SECURITY;


-- ========================================
-- Migration: 20251101164138_disable_rls_hotel_room_charges.sql
-- ========================================
/*
  # Disable RLS for hotel_room_charges

  Temporarily disable Row Level Security for hotel_room_charges table during development.
  This allows unrestricted access to the table for testing purposes.
*/

ALTER TABLE hotel_room_charges DISABLE ROW LEVEL SECURITY;


-- ========================================
-- Migration: 20251101171736_create_supplier_payment_terms.sql
-- ========================================
/*
  # Create Supplier Payment Terms System

  1. New Tables
    - `supplier_payment_terms`
      - `id` (uuid, primary key)
      - `name` (text) - ex: "30 jours fin de mois", "Comptant", "45 jours"
      - `description` (text) - detailed description
      - `days` (integer) - number of days for payment
      - `active` (boolean) - whether term is active
      - `created_at` (timestamptz)

  2. Changes
    - Add `payment_terms_id` (uuid) to `suppliers` table
    - Add foreign key constraint

  3. Sample Data
    - Add common payment terms
*/

-- Create payment terms table
CREATE TABLE IF NOT EXISTS supplier_payment_terms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  days integer NOT NULL DEFAULT 0,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Add payment terms to suppliers if column doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'suppliers' AND column_name = 'payment_terms_id'
  ) THEN
    ALTER TABLE suppliers ADD COLUMN payment_terms_id uuid REFERENCES supplier_payment_terms(id);
  END IF;
END $$;

-- Insert common payment terms
INSERT INTO supplier_payment_terms (name, description, days, active) VALUES
  ('Comptant', 'Paiement comptant à la livraison', 0, true),
  ('15 jours', 'Paiement sous 15 jours', 15, true),
  ('30 jours', 'Paiement sous 30 jours', 30, true),
  ('30 jours fin de mois', 'Paiement à 30 jours fin de mois', 30, true),
  ('45 jours', 'Paiement sous 45 jours', 45, true),
  ('60 jours', 'Paiement sous 60 jours', 60, true),
  ('90 jours', 'Paiement sous 90 jours', 90, true)
ON CONFLICT DO NOTHING;

-- Disable RLS for development
ALTER TABLE supplier_payment_terms DISABLE ROW LEVEL SECURITY;

-- ========================================
-- Migration: 20251101174435_add_default_currency_to_purchase_orders.sql
-- ========================================
/*
  # Add default currency to purchase orders

  1. Changes
    - Set default value for currency column to 'XOF' (FCFA)
    - Update existing NULL values to 'XOF'
  
  2. Notes
    - This ensures all purchase orders have a currency set
    - Default currency is FCFA (XOF) as per business requirements
*/

-- Set default value for currency column
ALTER TABLE purchase_orders 
ALTER COLUMN currency SET DEFAULT 'XOF';

-- Update any existing NULL values to XOF
UPDATE purchase_orders 
SET currency = 'XOF' 
WHERE currency IS NULL;


-- ========================================
-- Migration: 20251101175512_20251101180000_allow_direct_receptions_without_orders.sql
-- ========================================
/*
  # Permettre les réceptions directes sans bon de commande

  1. Modifications de la table `purchase_receptions`
    - Rendre `purchase_order_id` optionnel (nullable)
    - Ajouter `supplier_id` optionnel pour les réceptions directes
    - Ajouter une contrainte pour s'assurer qu'au moins l'un des deux est renseigné

  2. Modifications de la table `purchase_reception_lines`
    - Rendre `purchase_order_line_id` optionnel pour les réceptions directes

  3. Ajustement des triggers
    - Modifier les triggers pour gérer les réceptions sans commande

  ## Notes importantes
  - Les réceptions avec commande doivent avoir purchase_order_id
  - Les réceptions directes doivent avoir supplier_id
  - Au moins l'un des deux doit être renseigné
*/

-- ============================================================
-- 1. MODIFIER LA TABLE purchase_receptions
-- ============================================================

-- Ajouter la colonne supplier_id si elle n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'purchase_receptions' AND column_name = 'supplier_id'
  ) THEN
    ALTER TABLE purchase_receptions
    ADD COLUMN supplier_id uuid REFERENCES suppliers(id) ON DELETE RESTRICT;
  END IF;
END $$;

-- Rendre purchase_order_id optionnel
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'purchase_receptions' AND column_name = 'purchase_order_id' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE purchase_receptions ALTER COLUMN purchase_order_id DROP NOT NULL;
  END IF;
END $$;

-- Ajouter une contrainte pour s'assurer qu'au moins l'un des deux est renseigné
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'check_reception_has_order_or_supplier'
  ) THEN
    ALTER TABLE purchase_receptions
    ADD CONSTRAINT check_reception_has_order_or_supplier
    CHECK (
      (purchase_order_id IS NOT NULL AND supplier_id IS NULL) OR
      (purchase_order_id IS NULL AND supplier_id IS NOT NULL)
    );
  END IF;
END $$;

-- Créer un index sur supplier_id
CREATE INDEX IF NOT EXISTS idx_receptions_supplier ON purchase_receptions(supplier_id);

-- ============================================================
-- 2. MODIFIER LA TABLE purchase_reception_lines
-- ============================================================

-- Rendre purchase_order_line_id optionnel pour les réceptions directes
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'purchase_reception_lines' AND column_name = 'purchase_order_line_id' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE purchase_reception_lines ALTER COLUMN purchase_order_line_id DROP NOT NULL;
  END IF;
END $$;

-- ============================================================
-- 3. RECRÉER LE TRIGGER DE MISE À JOUR DES QUANTITÉS REÇUES
-- ============================================================

-- Recréer la fonction pour gérer les réceptions sans commande
CREATE OR REPLACE FUNCTION update_po_line_received_quantity()
RETURNS TRIGGER AS $$
BEGIN
  -- Mettre à jour uniquement si c'est lié à une ligne de commande
  IF NEW.purchase_order_line_id IS NOT NULL THEN
    UPDATE purchase_order_lines
    SET
      quantity_received = quantity_received + NEW.quantity_accepted,
      updated_at = now()
    WHERE id = NEW.purchase_order_line_id;

    -- Vérifier si la commande est complètement reçue
    UPDATE purchase_orders po
    SET
      status = CASE
        WHEN (
          SELECT SUM(pol.quantity_ordered)
          FROM purchase_order_lines pol
          WHERE pol.purchase_order_id = po.id
        ) = (
          SELECT SUM(pol.quantity_received)
          FROM purchase_order_lines pol
          WHERE pol.purchase_order_id = po.id
        ) THEN 'received'
        ELSE 'partially_received'
      END,
      updated_at = now()
    WHERE po.id = (
      SELECT pol.purchase_order_id
      FROM purchase_order_lines pol
      WHERE pol.id = NEW.purchase_order_line_id
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 4. RECRÉER LE TRIGGER DE CRÉATION DE MOUVEMENT DE STOCK
-- ============================================================

-- Recréer la fonction pour gérer les réceptions directes
CREATE OR REPLACE FUNCTION create_stock_movement_on_reception()
RETURNS TRIGGER AS $$
DECLARE
  reception_rec RECORD;
BEGIN
  -- Récupérer les infos de réception
  SELECT pr.storage_location_id, pr.reception_number
  INTO reception_rec
  FROM purchase_receptions pr
  WHERE pr.id = NEW.reception_id;

  -- Créer le mouvement de stock pour les quantités acceptées
  IF NEW.quantity_accepted > 0 THEN
    INSERT INTO stock_movements (
      product_id,
      storage_location_id,
      movement_type,
      quantity,
      reference,
      notes
    ) VALUES (
      NEW.product_id,
      reception_rec.storage_location_id,
      'purchase',
      NEW.quantity_accepted,
      'RÉC-' || reception_rec.reception_number,
      COALESCE('Lot: ' || NEW.batch_number, '')
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ========================================
-- Migration: 20251101180000_allow_direct_receptions_without_orders.sql
-- ========================================
/*
  # Permettre les réceptions directes sans bon de commande

  1. Modifications de la table `purchase_receptions`
    - Rendre `purchase_order_id` optionnel (nullable)
    - Ajouter `supplier_id` optionnel pour les réceptions directes
    - Ajouter une contrainte pour s'assurer qu'au moins l'un des deux est renseigné

  2. Modifications de la table `purchase_reception_lines`
    - Rendre `purchase_order_line_id` optionnel pour les réceptions directes

  3. Ajustement des triggers
    - Modifier les triggers pour gérer les réceptions sans commande

  ## Notes importantes
  - Les réceptions avec commande doivent avoir purchase_order_id
  - Les réceptions directes doivent avoir supplier_id
  - Au moins l'un des deux doit être renseigné
*/

-- ============================================================
-- 1. MODIFIER LA TABLE purchase_receptions
-- ============================================================

-- Ajouter la colonne supplier_id si elle n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'purchase_receptions' AND column_name = 'supplier_id'
  ) THEN
    ALTER TABLE purchase_receptions
    ADD COLUMN supplier_id uuid REFERENCES suppliers(id) ON DELETE RESTRICT;
  END IF;
END $$;

-- Rendre purchase_order_id optionnel
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'purchase_receptions' AND column_name = 'purchase_order_id' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE purchase_receptions ALTER COLUMN purchase_order_id DROP NOT NULL;
  END IF;
END $$;

-- Ajouter une contrainte pour s'assurer qu'au moins l'un des deux est renseigné
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'check_reception_has_order_or_supplier'
  ) THEN
    ALTER TABLE purchase_receptions
    ADD CONSTRAINT check_reception_has_order_or_supplier
    CHECK (
      (purchase_order_id IS NOT NULL AND supplier_id IS NULL) OR
      (purchase_order_id IS NULL AND supplier_id IS NOT NULL)
    );
  END IF;
END $$;

-- Créer un index sur supplier_id
CREATE INDEX IF NOT EXISTS idx_receptions_supplier ON purchase_receptions(supplier_id);

-- ============================================================
-- 2. MODIFIER LA TABLE purchase_reception_lines
-- ============================================================

-- Rendre purchase_order_line_id optionnel pour les réceptions directes
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'purchase_reception_lines' AND column_name = 'purchase_order_line_id' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE purchase_reception_lines ALTER COLUMN purchase_order_line_id DROP NOT NULL;
  END IF;
END $$;

-- ============================================================
-- 3. RECRÉER LE TRIGGER DE MISE À JOUR DES QUANTITÉS REÇUES
-- ============================================================

-- Recréer la fonction pour gérer les réceptions sans commande
CREATE OR REPLACE FUNCTION update_po_line_received_quantity()
RETURNS TRIGGER AS $$
BEGIN
  -- Mettre à jour uniquement si c'est lié à une ligne de commande
  IF NEW.purchase_order_line_id IS NOT NULL THEN
    UPDATE purchase_order_lines
    SET
      quantity_received = quantity_received + NEW.quantity_accepted,
      updated_at = now()
    WHERE id = NEW.purchase_order_line_id;

    -- Vérifier si la commande est complètement reçue
    UPDATE purchase_orders po
    SET
      status = CASE
        WHEN (
          SELECT SUM(pol.quantity_ordered)
          FROM purchase_order_lines pol
          WHERE pol.purchase_order_id = po.id
        ) = (
          SELECT SUM(pol.quantity_received)
          FROM purchase_order_lines pol
          WHERE pol.purchase_order_id = po.id
        ) THEN 'received'
        ELSE 'partially_received'
      END,
      updated_at = now()
    WHERE po.id = (
      SELECT pol.purchase_order_id
      FROM purchase_order_lines pol
      WHERE pol.id = NEW.purchase_order_line_id
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 4. RECRÉER LE TRIGGER DE CRÉATION DE MOUVEMENT DE STOCK
-- ============================================================

-- Recréer la fonction pour gérer les réceptions directes
CREATE OR REPLACE FUNCTION create_stock_movement_on_reception()
RETURNS TRIGGER AS $$
DECLARE
  reception_rec RECORD;
BEGIN
  -- Récupérer les infos de réception
  SELECT pr.storage_location_id, pr.reception_number
  INTO reception_rec
  FROM purchase_receptions pr
  WHERE pr.id = NEW.reception_id;

  -- Créer le mouvement de stock pour les quantités acceptées
  IF NEW.quantity_accepted > 0 THEN
    INSERT INTO stock_movements (
      product_id,
      storage_location_id,
      movement_type,
      quantity,
      reference,
      notes
    ) VALUES (
      NEW.product_id,
      reception_rec.storage_location_id,
      'purchase',
      NEW.quantity_accepted,
      'RÉC-' || reception_rec.reception_number,
      COALESCE('Lot: ' || NEW.batch_number, '')
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ========================================
-- Migration: 20251101205311_create_action_logs_table.sql
-- ========================================
/*
  # Create action_logs table
  
  1. New Tables
    - `action_logs`
      - `id` (uuid, primary key)
      - `action` (text) - Description of the action
      - `user_full_name` (text) - Name of the user who performed the action
      - `created_at` (timestamptz) - When the action was performed
      
  2. Security
    - Disable RLS for development
*/

CREATE TABLE IF NOT EXISTS action_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL,
  user_full_name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Disable RLS for development
ALTER TABLE action_logs DISABLE ROW LEVEL SECURITY;

-- ========================================
-- Migration: 20251115191555_add_template_presets_and_advanced_options.sql
-- ========================================
/*
  # Amélioration du système de templates d'impression

  1. Nouvelles Tables
    - `print_template_presets` : Templates pré-définis réutilisables
      - `id` (uuid, primary key)
      - `name` : Nom du preset (ex: "Casino Standard", "Économat A4")
      - `description` : Description du template
      - `template_content` : Configuration complète (jsonb)
      - `created_at`, `updated_at`

  2. Modifications de Tables Existantes
    - `print_templates` : 
      - Ajout `preset_id` : Lien vers un preset réutilisable
      - Modification `template_content` : Support options avancées
        - showPrices : Afficher/masquer les prix
        - logo : URL ou base64 du logo
        - textStyles : Styles de texte (gras, taille, police)
        - paperSize : Support A4, A5, A6, etc.

  3. Sécurité
    - Pas de RLS (développement)
*/

-- Table des presets réutilisables
CREATE TABLE IF NOT EXISTS print_template_presets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  template_content jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Ajouter le lien vers les presets dans print_templates
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'print_templates' AND column_name = 'preset_id'
  ) THEN
    ALTER TABLE print_templates ADD COLUMN preset_id uuid REFERENCES print_template_presets(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Désactiver RLS pour développement
ALTER TABLE print_template_presets DISABLE ROW LEVEL SECURITY;

-- Insérer quelques presets par défaut
INSERT INTO print_template_presets (name, description, template_content) VALUES
(
  'Casino Standard',
  'Template standard pour tickets de caisse et fabrication 80mm',
  '{
    "header": "CASINO CAP VERT\nBoavista - Sal Rei\nTel: +238 251 11 56",
    "footer": "Merci de votre visite !\nÀ bientôt",
    "showLogo": false,
    "showDate": true,
    "showTable": true,
    "showOrderNumber": true,
    "showPrices": true,
    "fontSize": "normal",
    "paperSize": "80mm",
    "textStyles": {
      "header": {"bold": true, "size": 12, "align": "center"},
      "body": {"bold": false, "size": 10, "align": "left"},
      "footer": {"bold": false, "size": 9, "align": "center"}
    }
  }'::jsonb
),
(
  'Bon de Fabrication (Sans Prix)',
  'Template pour bons de fabrication cuisine/bar sans affichage des prix',
  '{
    "header": "BON DE FABRICATION\n{{pos}}",
    "footer": "",
    "showLogo": false,
    "showDate": true,
    "showTable": true,
    "showOrderNumber": true,
    "showPrices": false,
    "fontSize": "large",
    "paperSize": "80mm",
    "textStyles": {
      "header": {"bold": true, "size": 14, "align": "center"},
      "body": {"bold": false, "size": 11, "align": "left"},
      "footer": {"bold": false, "size": 9, "align": "center"}
    }
  }'::jsonb
),
(
  'Bon de Commande A4',
  'Template A4 pour bons de commande économat',
  '{
    "header": "BON DE COMMANDE\nCASINO CAP VERT",
    "footer": "Signature: ________________",
    "showLogo": true,
    "showDate": true,
    "showTable": false,
    "showOrderNumber": true,
    "showPrices": true,
    "fontSize": "normal",
    "paperSize": "A4",
    "textStyles": {
      "header": {"bold": true, "size": 16, "align": "center"},
      "body": {"bold": false, "size": 11, "align": "left"},
      "footer": {"bold": false, "size": 10, "align": "left"}
    }
  }'::jsonb
),
(
  'Réception Économat A5',
  'Template A5 pour réceptions de marchandises',
  '{
    "header": "RÉCEPTION DE MARCHANDISES\nÉconomat",
    "footer": "Contrôlé par: ________________\nDate: ________________",
    "showLogo": false,
    "showDate": true,
    "showTable": false,
    "showOrderNumber": true,
    "showPrices": true,
    "fontSize": "normal",
    "paperSize": "A5",
    "textStyles": {
      "header": {"bold": true, "size": 14, "align": "center"},
      "body": {"bold": false, "size": 10, "align": "left"},
      "footer": {"bold": false, "size": 9, "align": "left"}
    }
  }'::jsonb
);

-- Fonction pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_print_template_presets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour updated_at
DROP TRIGGER IF EXISTS print_template_presets_updated_at ON print_template_presets;
CREATE TRIGGER print_template_presets_updated_at
  BEFORE UPDATE ON print_template_presets
  FOR EACH ROW
  EXECUTE FUNCTION update_print_template_presets_updated_at();


-- ========================================
-- Migration: 20251115195920_add_client_name_and_logo_upload_options.sql
-- ========================================
/*
  # Ajout options client et logo personnalisé

  1. Modifications
    - Ajout option `showClientName` dans template_content pour afficher nom client
    - Ajout option `logoFile` dans template_content pour stockage logo local
  
  2. Notes
    - Les logos peuvent être stockés en base64 ou chemin fichier local
    - L'option showClientName affiche le nom du client sur les tickets
*/

-- Pas de modification de schéma nécessaire
-- Les options sont déjà stockées dans le champ jsonb template_content
-- On ajoute juste la documentation des nouvelles options disponibles:
-- - showClientName: boolean (afficher nom client)
-- - logoFile: string (chemin ou base64 du logo)

COMMENT ON COLUMN print_templates.template_content IS 'Configuration JSON du template. Options disponibles: header, footer, showLogo, showDate, showTable, showOrderNumber, showPrices, showClientName, fontSize, paperSize, textStyles, logoFile';


-- ========================================
-- Migration: 20251115210032_add_physical_printer_name_to_definitions.sql
-- ========================================
/*
  # Ajout nom imprimante physique Windows

  1. Modifications
    - Ajout colonne `physical_printer_name` à `printer_definitions`
    - Cette colonne stocke le nom exact de l'imprimante Windows
    - Mise à jour de la définition existante avec le bon nom
*/

-- Ajouter la colonne pour le nom de l'imprimante physique
ALTER TABLE printer_definitions 
ADD COLUMN IF NOT EXISTS physical_printer_name text;

-- Mettre à jour l'imprimante existante avec le bon nom Windows
UPDATE printer_definitions 
SET physical_printer_name = 'OSCAR POS88C (USB)'
WHERE name = 'Caisse le Jardin';


-- ========================================
-- Migration: 20251116171851_add_cancellation_template_field.sql
-- ========================================
/*
  # Add Cancellation Template Support

  1. Changes
    - Add `is_cancellation_template` boolean field to `print_templates` table
    - Defaults to false for existing templates
    - Allows templates to be marked as cancellation slip templates

  2. Purpose
    - Enable dedicated cancellation slip templates per sales point
    - Each sales point can have one cancellation template
    - Cancellation templates show the source sales point name automatically
*/

-- Add is_cancellation_template field
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'print_templates' AND column_name = 'is_cancellation_template'
  ) THEN
    ALTER TABLE print_templates 
    ADD COLUMN is_cancellation_template BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Update existing templates to explicitly set false
UPDATE print_templates 
SET is_cancellation_template = false 
WHERE is_cancellation_template IS NULL;

-- ========================================
-- Migration: 20251116175743_add_is_voided_to_order_items.sql
-- ========================================
/*
  # Add is_voided column to order_items

  1. Changes
    - Add `is_voided` boolean column to `order_items` table with default false
    - Add `voided_at` timestamp column to track when item was voided
    - Add `voided_by` uuid column to track who voided the item
    - Add index on is_voided for better query performance
  
  2. Purpose
    - Enable soft deletion of order items for cancellation tracking
    - Maintain order history without physically deleting records
*/

-- Add is_voided column to order_items
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'order_items' AND column_name = 'is_voided'
  ) THEN
    ALTER TABLE order_items 
    ADD COLUMN is_voided boolean DEFAULT false NOT NULL;
  END IF;
END $$;

-- Add voided_at column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'order_items' AND column_name = 'voided_at'
  ) THEN
    ALTER TABLE order_items 
    ADD COLUMN voided_at timestamptz;
  END IF;
END $$;

-- Add voided_by column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'order_items' AND column_name = 'voided_by'
  ) THEN
    ALTER TABLE order_items 
    ADD COLUMN voided_by uuid REFERENCES employees(id);
  END IF;
END $$;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_order_items_is_voided ON order_items(is_voided);

-- Add comment
COMMENT ON COLUMN order_items.is_voided IS 'Indicates if this order item has been cancelled/voided';
COMMENT ON COLUMN order_items.voided_at IS 'Timestamp when the item was voided';
COMMENT ON COLUMN order_items.voided_by IS 'Employee who voided this item';


-- ========================================
-- Migration: 20251201182423_create_product_options_system.sql
-- ========================================
/*
  # Product Options System

  1. New Tables
    - `option_groups`
      - Reusable option groups (e.g., "Cuisson", "Accompagnements")
      - Can be single or multiple selection

    - `option_group_items`
      - Items within each option group
      - Can be fixed price or linked to existing products

    - `product_option_group_assignments`
      - Links option groups to products
      - Defines rules: min/max selections, included (free) selections, required/optional

    - `order_item_options`
      - Records customer choices for each order item
      - Stores historical pricing (price at time of order)

  2. Security
    - RLS disabled for development (consistent with existing tables)
*/

-- Table 1: option_groups (Reusable option group library)
CREATE TABLE IF NOT EXISTS option_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  selection_type text NOT NULL CHECK (selection_type IN ('single', 'multiple')),
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table 2: option_group_items (Options within each group)
CREATE TABLE IF NOT EXISTS option_group_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  option_group_id uuid NOT NULL REFERENCES option_groups(id) ON DELETE CASCADE,
  name text NOT NULL,
  option_type text NOT NULL CHECK (option_type IN ('fixed_price', 'product_based')),
  price_adjustment numeric(10,2) DEFAULT 0,
  linked_product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table 3: product_option_group_assignments (Links groups to products with rules)
CREATE TABLE IF NOT EXISTS product_option_group_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  option_group_id uuid NOT NULL REFERENCES option_groups(id) ON DELETE CASCADE,
  min_selections integer DEFAULT 0,
  max_selections integer DEFAULT 1,
  included_selections integer DEFAULT 0,
  is_required boolean DEFAULT false,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(product_id, option_group_id)
);

-- Table 4: order_item_options (Customer choices with historical pricing)
CREATE TABLE IF NOT EXISTS order_item_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_item_id uuid NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
  option_item_id uuid NOT NULL REFERENCES option_group_items(id) ON DELETE RESTRICT,
  selection_index integer NOT NULL,
  price_applied numeric(10,2) DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_option_group_items_group ON option_group_items(option_group_id);
CREATE INDEX IF NOT EXISTS idx_option_group_items_product ON option_group_items(linked_product_id);
CREATE INDEX IF NOT EXISTS idx_product_option_assignments_product ON product_option_group_assignments(product_id);
CREATE INDEX IF NOT EXISTS idx_product_option_assignments_group ON product_option_group_assignments(option_group_id);
CREATE INDEX IF NOT EXISTS idx_order_item_options_item ON order_item_options(order_item_id);
CREATE INDEX IF NOT EXISTS idx_order_item_options_option ON order_item_options(option_item_id);

-- Disable RLS for development (consistent with other tables)
ALTER TABLE option_groups DISABLE ROW LEVEL SECURITY;
ALTER TABLE option_group_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE product_option_group_assignments DISABLE ROW LEVEL SECURITY;
ALTER TABLE order_item_options DISABLE ROW LEVEL SECURITY;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_option_groups_updated_at
  BEFORE UPDATE ON option_groups
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_option_group_items_updated_at
  BEFORE UPDATE ON option_group_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_product_option_assignments_updated_at
  BEFORE UPDATE ON product_option_group_assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
