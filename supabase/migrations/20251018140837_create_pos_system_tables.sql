/*
  # Création du système de caisse (POS)

  1. Nouvelles Tables
    - `pos_sessions` : Sessions de caisse (ouverture/clôture)
      - `id` (uuid, primary key)
      - `sales_point_id` (uuid, foreign key vers sales_points)
      - `employee_id` (uuid, foreign key vers employees)
      - `opening_time` (timestamptz)
      - `closing_time` (timestamptz, nullable)
      - `opening_amount` (numeric) - Fond de caisse
      - `expected_amount` (numeric) - Montant théorique
      - `actual_amount` (numeric, nullable) - Montant réel compté
      - `difference` (numeric, nullable) - Écart
      - `status` (text) - open, closed
      - `notes` (text)
      - `created_at` (timestamptz)

    - `orders` : Commandes/ventes
      - `id` (uuid, primary key)
      - `order_number` (text, unique) - Numéro de commande
      - `sales_point_id` (uuid, foreign key)
      - `pos_session_id` (uuid, foreign key)
      - `employee_id` (uuid, foreign key)
      - `table_number` (text, nullable)
      - `customer_name` (text, nullable)
      - `subtotal` (numeric)
      - `tax_amount` (numeric)
      - `total_amount` (numeric)
      - `status` (text) - pending, completed, cancelled
      - `payment_method` (text) - cash, card, orange_money, wave, etc.
      - `payment_status` (text) - unpaid, paid, partial
      - `created_at` (timestamptz)
      - `completed_at` (timestamptz, nullable)

    - `order_items` : Lignes de commande
      - `id` (uuid, primary key)
      - `order_id` (uuid, foreign key vers orders)
      - `product_id` (uuid, foreign key vers products)
      - `product_name` (text) - Nom au moment de la vente
      - `quantity` (numeric)
      - `unit_price` (numeric)
      - `subtotal` (numeric)
      - `tax_rate` (numeric)
      - `tax_amount` (numeric)
      - `total` (numeric)
      - `notes` (text, nullable)
      - `created_at` (timestamptz)

    - `payments` : Paiements
      - `id` (uuid, primary key)
      - `order_id` (uuid, foreign key vers orders)
      - `payment_method` (text)
      - `amount` (numeric)
      - `reference` (text, nullable)
      - `created_at` (timestamptz)

  2. Sécurité
    - RLS désactivé pour développement (sera activé en production)
*/

-- Table des sessions de caisse
CREATE TABLE IF NOT EXISTS pos_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_point_id uuid REFERENCES sales_points(id) ON DELETE CASCADE NOT NULL,
  employee_id uuid REFERENCES employees(id) NOT NULL,
  opening_time timestamptz DEFAULT now() NOT NULL,
  closing_time timestamptz,
  opening_amount numeric DEFAULT 0 NOT NULL,
  expected_amount numeric DEFAULT 0,
  actual_amount numeric,
  difference numeric,
  status text DEFAULT 'open' NOT NULL,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- Table des commandes
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text UNIQUE NOT NULL,
  sales_point_id uuid REFERENCES sales_points(id) ON DELETE CASCADE NOT NULL,
  pos_session_id uuid REFERENCES pos_sessions(id) NOT NULL,
  employee_id uuid REFERENCES employees(id) NOT NULL,
  table_number text,
  customer_name text,
  subtotal numeric DEFAULT 0 NOT NULL,
  tax_amount numeric DEFAULT 0 NOT NULL,
  total_amount numeric DEFAULT 0 NOT NULL,
  status text DEFAULT 'pending' NOT NULL,
  payment_method text,
  payment_status text DEFAULT 'unpaid' NOT NULL,
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

-- Table des lignes de commande
CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
  product_id uuid REFERENCES products(id) NOT NULL,
  product_name text NOT NULL,
  quantity numeric DEFAULT 1 NOT NULL,
  unit_price numeric NOT NULL,
  subtotal numeric NOT NULL,
  tax_rate numeric DEFAULT 0,
  tax_amount numeric DEFAULT 0,
  total numeric NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Table des paiements
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
  payment_method text NOT NULL,
  amount numeric NOT NULL,
  reference text,
  created_at timestamptz DEFAULT now()
);

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_pos_sessions_sales_point ON pos_sessions(sales_point_id);
CREATE INDEX IF NOT EXISTS idx_pos_sessions_status ON pos_sessions(status);
CREATE INDEX IF NOT EXISTS idx_orders_sales_point ON orders(sales_point_id);
CREATE INDEX IF NOT EXISTS idx_orders_session ON orders(pos_session_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_order ON payments(order_id);

-- Désactiver RLS pour développement
ALTER TABLE pos_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE order_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE payments DISABLE ROW LEVEL SECURITY;
