/*
  # Add sales point tracking to client payments

  1. Changes
    - Add `sales_point_id` column to `client_payments` table to track which cash register received the payment
    - Add foreign key constraint to link payments to sales points
    - This enables proper cash flow tracking and reconciliation with POS sessions

  2. Benefits
    - Track which cash register received client payments
    - Enable proper cash drawer reconciliation
    - Link client payments to specific POS sessions for accounting
*/

-- Add sales_point_id column to client_payments
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'client_payments' AND column_name = 'sales_point_id'
  ) THEN
    ALTER TABLE client_payments ADD COLUMN sales_point_id uuid REFERENCES sales_points(id);
  END IF;
END $$;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_client_payments_sales_point ON client_payments(sales_point_id);