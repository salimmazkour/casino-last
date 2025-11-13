/*
  # Disable RLS on all tables for development

  1. Changes
    - Disable Row Level Security on all tables to facilitate development
  
  2. Tables affected
    - employees
    - user_sessions
    - product_categories
    - products
    - product_recipes
    - printers
    - product_stocks
    - storage_locations
    - sales_points (already disabled)
    - product_prices (already disabled)
    - rooms
    - room_types
    - suppliers
  
  3. Security Note
    - RLS will be re-enabled and properly configured after development phase
    - This is temporary to avoid authentication conflicts during active development
*/

-- Disable RLS on all tables
ALTER TABLE employees DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE product_categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE products DISABLE ROW LEVEL SECURITY;
ALTER TABLE product_recipes DISABLE ROW LEVEL SECURITY;
ALTER TABLE printers DISABLE ROW LEVEL SECURITY;
ALTER TABLE product_stocks DISABLE ROW LEVEL SECURITY;
ALTER TABLE storage_locations DISABLE ROW LEVEL SECURITY;
ALTER TABLE rooms DISABLE ROW LEVEL SECURITY;
ALTER TABLE room_types DISABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers DISABLE ROW LEVEL SECURITY;
