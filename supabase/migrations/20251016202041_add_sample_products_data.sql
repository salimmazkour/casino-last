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
