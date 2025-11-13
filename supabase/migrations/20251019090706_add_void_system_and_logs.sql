/*
  # Add Void System and Logs

  1. New Tables
    - `void_logs`
      - `id` (uuid, primary key) - Unique identifier
      - `void_type` (text) - Type: 'line' or 'ticket'
      - `order_id` (uuid) - Reference to the order
      - `order_item_id` (uuid, nullable) - Reference to specific item if line void
      - `voided_by` (uuid) - Employee who voided
      - `void_reason` (text, nullable) - Optional reason
      - `voided_at` (timestamptz) - When voided
      - `product_details` (jsonb) - Snapshot of product(s) voided
      - `amount_voided` (decimal) - Total amount voided
      - `sales_point_id` (uuid) - Where it happened

  2. Permissions
    - Add 'void_line' permission to pos module
    - Add 'void_ticket' permission to pos module
    - Assign to appropriate roles

  3. Security
    - Enable RLS on void_logs
    - Add policy for authenticated users

  4. Notes
    - void_type: 'line' = single item void, 'ticket' = entire order void
    - product_details stores snapshot to preserve data even if product changes
*/

-- Create void_logs table
CREATE TABLE IF NOT EXISTS void_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  void_type text NOT NULL CHECK (void_type IN ('line', 'ticket')),
  order_id uuid NOT NULL REFERENCES orders(id),
  order_item_id uuid REFERENCES order_items(id),
  voided_by uuid NOT NULL REFERENCES employees(id),
  void_reason text,
  voided_at timestamptz DEFAULT now(),
  product_details jsonb NOT NULL,
  amount_voided decimal(10,2) NOT NULL DEFAULT 0,
  sales_point_id uuid NOT NULL REFERENCES sales_points(id)
);

-- Enable RLS
ALTER TABLE void_logs ENABLE ROW LEVEL SECURITY;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_void_logs_order_id ON void_logs(order_id);
CREATE INDEX IF NOT EXISTS idx_void_logs_voided_by ON void_logs(voided_by);
CREATE INDEX IF NOT EXISTS idx_void_logs_voided_at ON void_logs(voided_at DESC);
CREATE INDEX IF NOT EXISTS idx_void_logs_void_type ON void_logs(void_type);
CREATE INDEX IF NOT EXISTS idx_void_logs_sales_point_id ON void_logs(sales_point_id);

-- Create RLS policy
CREATE POLICY "Authenticated users can view void logs"
  ON void_logs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert void logs"
  ON void_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Add new permissions
INSERT INTO permissions (module, action, description)
VALUES 
  ('pos', 'void_line', 'Annuler une ligne de commande'),
  ('pos', 'void_ticket', 'Annuler un ticket complet')
ON CONFLICT (module, action) DO NOTHING;

-- Assign void_line permission to roles
-- Administrateur gets everything
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'Administrateur' 
  AND p.module = 'pos' 
  AND p.action IN ('void_line', 'void_ticket')
ON CONFLICT DO NOTHING;

-- Manager can void
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'Manager' 
  AND p.module = 'pos' 
  AND p.action IN ('void_line', 'void_ticket')
ON CONFLICT DO NOTHING;

-- Caissier can void lines only
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'Caissier' 
  AND p.module = 'pos' 
  AND p.action = 'void_line'
ON CONFLICT DO NOTHING;

-- Serveur can void lines only (mistakes happen)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'Serveur' 
  AND p.module = 'pos' 
  AND p.action = 'void_line'
ON CONFLICT DO NOTHING;

-- Barman can void lines only
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'Barman' 
  AND p.module = 'pos' 
  AND p.action = 'void_line'
ON CONFLICT DO NOTHING;
