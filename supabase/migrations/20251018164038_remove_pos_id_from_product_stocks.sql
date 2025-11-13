/*
  # Remove pos_id dependency from product_stocks

  1. Changes
    - Make pos_id nullable in product_stocks (keeping it for backward compatibility but not required)
    - Add unique constraint on (product_id, storage_location_id) to ensure one stock entry per product per storage
    - This separates storage management from point of sale
  
  2. Rationale
    - Storage locations should be independent of sales points
    - A product in a storage location has ONE stock quantity
    - Sales points will draw from storage locations when needed
  
  3. Data Migration
    - Keep existing data intact
    - If there are duplicate entries for same product+storage, we'll need to manually consolidate later
*/

-- First, check if we need to consolidate duplicate stocks
DO $$
BEGIN
  -- Make pos_id nullable
  ALTER TABLE product_stocks 
    ALTER COLUMN pos_id DROP NOT NULL;
  
  -- Add unique constraint if it doesn't exist
  -- Note: This might fail if there are duplicates, which is expected
  BEGIN
    ALTER TABLE product_stocks 
      ADD CONSTRAINT unique_product_storage 
      UNIQUE (product_id, storage_location_id);
  EXCEPTION
    WHEN duplicate_table THEN
      NULL; -- Constraint already exists
    WHEN unique_violation THEN
      RAISE NOTICE 'Warning: Duplicate product+storage entries exist. Manual consolidation needed.';
  END;
END $$;