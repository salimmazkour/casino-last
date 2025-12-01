/*
  # Product Options System

  1. New Tables
    - `option_groups`
      - Reusable option groups (e.g., "Cuisson", "Accompagnements")
      - Can be single or multiple selection

    - `option_group_items`
      - Items within each option group
      - Can be fixed price or linked to existing products

    - `product_option_group_assignments`
      - Links option groups to products
      - Defines rules: min/max selections, included (free) selections, required/optional

    - `order_item_options`
      - Records customer choices for each order item
      - Stores historical pricing (price at time of order)

  2. Security
    - RLS disabled for development (consistent with existing tables)
*/

-- Table 1: option_groups (Reusable option group library)
CREATE TABLE IF NOT EXISTS option_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  selection_type text NOT NULL CHECK (selection_type IN ('single', 'multiple')),
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table 2: option_group_items (Options within each group)
CREATE TABLE IF NOT EXISTS option_group_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  option_group_id uuid NOT NULL REFERENCES option_groups(id) ON DELETE CASCADE,
  name text NOT NULL,
  option_type text NOT NULL CHECK (option_type IN ('fixed_price', 'product_based')),
  price_adjustment numeric(10,2) DEFAULT 0,
  linked_product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table 3: product_option_group_assignments (Links groups to products with rules)
CREATE TABLE IF NOT EXISTS product_option_group_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  option_group_id uuid NOT NULL REFERENCES option_groups(id) ON DELETE CASCADE,
  min_selections integer DEFAULT 0,
  max_selections integer DEFAULT 1,
  included_selections integer DEFAULT 0,
  is_required boolean DEFAULT false,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(product_id, option_group_id)
);

-- Table 4: order_item_options (Customer choices with historical pricing)
CREATE TABLE IF NOT EXISTS order_item_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_item_id uuid NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
  option_item_id uuid NOT NULL REFERENCES option_group_items(id) ON DELETE RESTRICT,
  selection_index integer NOT NULL,
  price_applied numeric(10,2) DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_option_group_items_group ON option_group_items(option_group_id);
CREATE INDEX IF NOT EXISTS idx_option_group_items_product ON option_group_items(linked_product_id);
CREATE INDEX IF NOT EXISTS idx_product_option_assignments_product ON product_option_group_assignments(product_id);
CREATE INDEX IF NOT EXISTS idx_product_option_assignments_group ON product_option_group_assignments(option_group_id);
CREATE INDEX IF NOT EXISTS idx_order_item_options_item ON order_item_options(order_item_id);
CREATE INDEX IF NOT EXISTS idx_order_item_options_option ON order_item_options(option_item_id);

-- Disable RLS for development (consistent with other tables)
ALTER TABLE option_groups DISABLE ROW LEVEL SECURITY;
ALTER TABLE option_group_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE product_option_group_assignments DISABLE ROW LEVEL SECURITY;
ALTER TABLE order_item_options DISABLE ROW LEVEL SECURITY;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_option_groups_updated_at
  BEFORE UPDATE ON option_groups
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_option_group_items_updated_at
  BEFORE UPDATE ON option_group_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_product_option_assignments_updated_at
  BEFORE UPDATE ON product_option_group_assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();