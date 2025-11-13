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
