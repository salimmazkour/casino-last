/*
  # Add Production Cancellation Slips System

  1. New Tables
    - `production_cancellation_slips`
      - `id` (uuid, primary key) - Unique identifier
      - `slip_number` (text, unique) - Bon number (e.g., ANNUL-001)
      - `order_id` (uuid, nullable) - Reference to original order if applicable
      - `order_item_id` (uuid, nullable) - Reference to specific item if line cancellation
      - `void_log_id` (uuid, unique) - Link to void log (1-to-1)
      - `product_id` (uuid) - Product being cancelled
      - `product_name` (text) - Product name snapshot
      - `quantity` (decimal) - Quantity to cancel from production
      - `cancelled_by` (uuid) - Employee who created cancellation
      - `reason` (text, nullable) - Cancellation reason
      - `created_at` (timestamptz) - When slip was created
      - `printed_at` (timestamptz, nullable) - When slip was printed
      - `print_count` (integer) - Number of times printed
      - `sales_point_id` (uuid) - Where cancellation originated
      - `status` (text) - 'pending', 'printed', 'acknowledged'

  2. Purpose
    - Track production cancellations separately from void logs
    - Ensure each void generates exactly ONE cancellation slip
    - Allow kitchen/bar to acknowledge cancelled items
    - Prevent duplicate cancellation slips

  3. Security
    - Enable RLS on production_cancellation_slips
    - Add policies for authenticated users

  4. Notes
    - void_log_id is UNIQUE to ensure 1-to-1 relationship
    - One void log = One cancellation slip maximum
    - Cancellation slips track what needs to be removed from production queue
*/

-- Create production_cancellation_slips table
CREATE TABLE IF NOT EXISTS production_cancellation_slips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slip_number text UNIQUE NOT NULL,
  order_id uuid REFERENCES orders(id),
  order_item_id uuid REFERENCES order_items(id),
  void_log_id uuid UNIQUE NOT NULL REFERENCES void_logs(id),
  product_id uuid NOT NULL REFERENCES products(id),
  product_name text NOT NULL,
  quantity decimal(10,3) NOT NULL,
  cancelled_by uuid NOT NULL REFERENCES employees(id),
  reason text,
  created_at timestamptz DEFAULT now(),
  printed_at timestamptz,
  print_count integer DEFAULT 0,
  sales_point_id uuid NOT NULL REFERENCES sales_points(id),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'printed', 'acknowledged'))
);

-- Enable RLS
ALTER TABLE production_cancellation_slips ENABLE ROW LEVEL SECURITY;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_cancellation_slips_void_log_id ON production_cancellation_slips(void_log_id);
CREATE INDEX IF NOT EXISTS idx_cancellation_slips_order_id ON production_cancellation_slips(order_id);
CREATE INDEX IF NOT EXISTS idx_cancellation_slips_product_id ON production_cancellation_slips(product_id);
CREATE INDEX IF NOT EXISTS idx_cancellation_slips_status ON production_cancellation_slips(status);
CREATE INDEX IF NOT EXISTS idx_cancellation_slips_created_at ON production_cancellation_slips(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cancellation_slips_sales_point_id ON production_cancellation_slips(sales_point_id);

-- Create RLS policies
CREATE POLICY "Authenticated users can view cancellation slips"
  ON production_cancellation_slips FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert cancellation slips"
  ON production_cancellation_slips FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update cancellation slips"
  ON production_cancellation_slips FOR UPDATE
  TO authenticated
  USING (true);

-- Create function to generate slip number
CREATE OR REPLACE FUNCTION generate_cancellation_slip_number()
RETURNS text AS $$
DECLARE
  next_number integer;
  slip_number text;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(slip_number FROM 'ANNUL-(\d+)') AS integer)), 0) + 1
  INTO next_number
  FROM production_cancellation_slips;
  
  slip_number := 'ANNUL-' || LPAD(next_number::text, 6, '0');
  RETURN slip_number;
END;
$$ LANGUAGE plpgsql;
