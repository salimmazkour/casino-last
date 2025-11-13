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
