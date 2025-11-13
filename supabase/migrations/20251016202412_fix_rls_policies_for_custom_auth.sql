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
