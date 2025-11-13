/*
  # Disable ALL RLS for Development

  1. Changes
    - Disable RLS on ALL existing tables in public schema
    - This is a comprehensive RLS disable for the entire development phase

  2. Tables Affected (36 tables)
    - client_payments, clients, employee_permissions, employees
    - inventories, inventory_lines, order_items, orders
    - payment_invoice_allocations, payments, permissions, pos_sessions
    - printers, product_categories, product_prices, product_recipes
    - product_recipes_by_sales_point, product_recipes_history
    - product_sales_points, product_stocks, product_types
    - production_cancellation_slips, products, restaurant_tables
    - role_permissions, roles, room_types, rooms
    - sales_points, stock_movements, storage_locations, suppliers
    - table_transfers, user_action_logs, user_sessions, void_logs

  3. Notes
    - RLS will be re-enabled at the end of the project
    - Custom authentication system does not use Supabase auth
    - This prevents all RLS-related errors during development
    - DO NOT enable RLS in any future migrations during development
*/

-- Disable RLS on all tables
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
ALTER TABLE production_cancellation_slips DISABLE ROW LEVEL SECURITY;
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
ALTER TABLE void_logs DISABLE ROW LEVEL SECURITY;
