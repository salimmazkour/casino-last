/*
  # Disable RLS for product_prices table

  1. Changes
    - Disable Row Level Security on product_prices table to work with custom authentication system
  
  2. Notes
    - This project uses a custom authentication system via the auth-login edge function
    - RLS policies using 'authenticated' role don't apply to custom auth
*/

ALTER TABLE product_prices DISABLE ROW LEVEL SECURITY;
