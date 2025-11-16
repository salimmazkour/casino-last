/*
  # Add is_voided column to order_items

  1. Changes
    - Add `is_voided` boolean column to `order_items` table with default false
    - Add `voided_at` timestamp column to track when item was voided
    - Add `voided_by` uuid column to track who voided the item
    - Add index on is_voided for better query performance
  
  2. Purpose
    - Enable soft deletion of order items for cancellation tracking
    - Maintain order history without physically deleting records
*/

-- Add is_voided column to order_items
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'order_items' AND column_name = 'is_voided'
  ) THEN
    ALTER TABLE order_items 
    ADD COLUMN is_voided boolean DEFAULT false NOT NULL;
  END IF;
END $$;

-- Add voided_at column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'order_items' AND column_name = 'voided_at'
  ) THEN
    ALTER TABLE order_items 
    ADD COLUMN voided_at timestamptz;
  END IF;
END $$;

-- Add voided_by column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'order_items' AND column_name = 'voided_by'
  ) THEN
    ALTER TABLE order_items 
    ADD COLUMN voided_by uuid REFERENCES employees(id);
  END IF;
END $$;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_order_items_is_voided ON order_items(is_voided);

-- Add comment
COMMENT ON COLUMN order_items.is_voided IS 'Indicates if this order item has been cancelled/voided';
COMMENT ON COLUMN order_items.voided_at IS 'Timestamp when the item was voided';
COMMENT ON COLUMN order_items.voided_by IS 'Employee who voided this item';
