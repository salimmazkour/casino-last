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