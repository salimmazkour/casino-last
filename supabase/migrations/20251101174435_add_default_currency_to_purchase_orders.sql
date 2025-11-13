/*
  # Add default currency to purchase orders

  1. Changes
    - Set default value for currency column to 'XOF' (FCFA)
    - Update existing NULL values to 'XOF'
  
  2. Notes
    - This ensures all purchase orders have a currency set
    - Default currency is FCFA (XOF) as per business requirements
*/

-- Set default value for currency column
ALTER TABLE purchase_orders 
ALTER COLUMN currency SET DEFAULT 'XOF';

-- Update any existing NULL values to XOF
UPDATE purchase_orders 
SET currency = 'XOF' 
WHERE currency IS NULL;
