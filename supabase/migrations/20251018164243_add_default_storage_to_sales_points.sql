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