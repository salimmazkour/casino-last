/*
  # Add breakage/waste movement type

  1. Changes
    - Add 'breakage' to movement_type enum constraint
    - This allows tracking of product losses due to breakage, expiration, or waste
  
  2. Notes
    - Breakage movements will have negative quantity (stock reduction)
    - This helps track losses and calculate actual consumption vs sales
*/

ALTER TABLE stock_movements 
  DROP CONSTRAINT IF EXISTS stock_movements_movement_type_check;

ALTER TABLE stock_movements 
  ADD CONSTRAINT stock_movements_movement_type_check 
  CHECK (movement_type IN ('sale', 'restock', 'inventory_adjustment', 'transfer', 'breakage'));