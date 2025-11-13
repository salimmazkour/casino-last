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
