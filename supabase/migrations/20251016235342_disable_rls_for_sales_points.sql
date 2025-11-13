/*
  # Disable RLS for sales_points table
  
  Since the application uses a custom authentication system (not Supabase Auth),
  and sales_points data is not sensitive (read-only reference data),
  we disable RLS to allow authenticated users to access the data.
  
  Changes:
  - Disable RLS on sales_points table
*/

ALTER TABLE sales_points DISABLE ROW LEVEL SECURITY;
