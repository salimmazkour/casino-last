/*
  # Disable RLS for void_logs table (Development)

  1. Changes
    - Disable RLS on void_logs table
    - Disable RLS on production_cancellation_slips table

  2. Notes
    - This is for development only
    - Custom authentication system does not use Supabase auth
    - RLS policies with "TO authenticated" do not work with custom auth
    - Will be re-enabled with proper policies in production
*/

-- Disable RLS for void_logs
ALTER TABLE void_logs DISABLE ROW LEVEL SECURITY;

-- Also disable for production_cancellation_slips if it exists
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE tablename = 'production_cancellation_slips'
  ) THEN
    ALTER TABLE production_cancellation_slips DISABLE ROW LEVEL SECURITY;
  END IF;
END $$;
