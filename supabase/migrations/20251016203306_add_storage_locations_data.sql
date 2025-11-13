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
