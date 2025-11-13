/*
  # Add 'voided' Status to Orders

  1. Changes
    - Add 'voided' to payment_status allowed values
    - Add 'voided' to status allowed values
    - This allows orders to be marked as cancelled/voided

  2. Notes
    - Voided orders are cancelled orders that were previously validated
    - They appear in the "Tickets annulés" section of the POS
    - Voided orders generate production cancellation slips
*/

-- Drop existing constraints if they exist
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'orders_payment_status_check'
  ) THEN
    ALTER TABLE orders DROP CONSTRAINT orders_payment_status_check;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'orders_status_check'
  ) THEN
    ALTER TABLE orders DROP CONSTRAINT orders_status_check;
  END IF;
END $$;

-- Add constraints with 'voided' included
ALTER TABLE orders 
  ADD CONSTRAINT orders_payment_status_check 
  CHECK (payment_status IN ('unpaid', 'paid', 'partial', 'pending', 'voided'));

ALTER TABLE orders 
  ADD CONSTRAINT orders_status_check 
  CHECK (status IN ('pending', 'completed', 'cancelled', 'voided'));
