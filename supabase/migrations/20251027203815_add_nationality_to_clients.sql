/*
  # Add nationality field to clients table

  1. Changes
    - Add nullable nationality field to clients table
    - This field stores the nationality of the client (optional information)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'nationality'
  ) THEN
    ALTER TABLE clients ADD COLUMN nationality text;
  END IF;
END $$;
