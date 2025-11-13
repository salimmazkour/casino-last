/*
  # Désactivation complète de RLS pour le développement

  ## Description
  Désactive Row Level Security (RLS) sur toutes les tables pour faciliter
  le développement et éviter les erreurs 401 Unauthorized.

  ## Tables concernées
  Toutes les tables de la base de données

  ## Notes
    - Cette configuration est temporaire pour le développement
    - RLS devra être réactivé et correctement configuré en production
    - Permet de travailler sans interruption pendant le développement
*/

-- Désactiver RLS sur toutes les tables
ALTER TABLE client_payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE employee_permissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE employees DISABLE ROW LEVEL SECURITY;
ALTER TABLE inventories DISABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_lines DISABLE ROW LEVEL SECURITY;
ALTER TABLE order_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE payment_invoice_allocations DISABLE ROW LEVEL SECURITY;
ALTER TABLE payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE permissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE pos_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE printers DISABLE ROW LEVEL SECURITY;
ALTER TABLE product_categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE product_prices DISABLE ROW LEVEL SECURITY;
ALTER TABLE product_recipes DISABLE ROW LEVEL SECURITY;
ALTER TABLE product_recipes_by_sales_point DISABLE ROW LEVEL SECURITY;
ALTER TABLE product_recipes_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE product_sales_points DISABLE ROW LEVEL SECURITY;
ALTER TABLE product_stocks DISABLE ROW LEVEL SECURITY;
ALTER TABLE product_types DISABLE ROW LEVEL SECURITY;
ALTER TABLE products DISABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_tables DISABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE room_types DISABLE ROW LEVEL SECURITY;
ALTER TABLE rooms DISABLE ROW LEVEL SECURITY;
ALTER TABLE sales_points DISABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements DISABLE ROW LEVEL SECURITY;
ALTER TABLE storage_locations DISABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers DISABLE ROW LEVEL SECURITY;
ALTER TABLE table_transfers DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_action_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions DISABLE ROW LEVEL SECURITY;
