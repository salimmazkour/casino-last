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
