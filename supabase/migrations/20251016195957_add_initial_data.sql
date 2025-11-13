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
