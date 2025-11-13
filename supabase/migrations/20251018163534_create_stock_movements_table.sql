/*
  # Create stock movements tracking table

  1. New Tables
    - `stock_movements`
      - `id` (uuid, primary key)
      - `product_id` (uuid, foreign key to products)
      - `storage_location_id` (uuid, foreign key to storage_locations)
      - `movement_type` (text) - 'sale', 'restock', 'inventory_adjustment', 'transfer'
      - `quantity` (numeric) - positive for entry, negative for exit
      - `previous_quantity` (numeric) - quantity before movement
      - `new_quantity` (numeric) - quantity after movement
      - `reference` (text) - order number, transfer number, etc.
      - `notes` (text) - additional information
      - `created_at` (timestamptz)
      - `created_by` (uuid, foreign key to employees)
      - `pos_id` (uuid, nullable) - only for sales, to know which POS made the sale

  2. Security
    - Disable RLS for development (will be enabled later with proper policies)

  3. Indexes
    - Index on product_id for fast product history queries
    - Index on storage_location_id for fast location queries
    - Index on created_at for date range queries
    - Index on movement_type for filtering by type
*/

CREATE TABLE IF NOT EXISTS stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  storage_location_id uuid NOT NULL REFERENCES storage_locations(id) ON DELETE CASCADE,
  movement_type text NOT NULL CHECK (movement_type IN ('sale', 'restock', 'inventory_adjustment', 'transfer')),
  quantity numeric NOT NULL,
  previous_quantity numeric NOT NULL DEFAULT 0,
  new_quantity numeric NOT NULL DEFAULT 0,
  reference text,
  notes text,
  pos_id uuid REFERENCES sales_points(id),
  created_by uuid REFERENCES employees(id),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_storage ON stock_movements(storage_location_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_date ON stock_movements(created_at);
CREATE INDEX IF NOT EXISTS idx_stock_movements_type ON stock_movements(movement_type);

ALTER TABLE stock_movements DISABLE ROW LEVEL SECURITY;