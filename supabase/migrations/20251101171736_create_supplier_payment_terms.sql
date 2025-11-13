/*
  # Create Supplier Payment Terms System

  1. New Tables
    - `supplier_payment_terms`
      - `id` (uuid, primary key)
      - `name` (text) - ex: "30 jours fin de mois", "Comptant", "45 jours"
      - `description` (text) - detailed description
      - `days` (integer) - number of days for payment
      - `active` (boolean) - whether term is active
      - `created_at` (timestamptz)

  2. Changes
    - Add `payment_terms_id` (uuid) to `suppliers` table
    - Add foreign key constraint

  3. Sample Data
    - Add common payment terms
*/

-- Create payment terms table
CREATE TABLE IF NOT EXISTS supplier_payment_terms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  days integer NOT NULL DEFAULT 0,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Add payment terms to suppliers if column doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'suppliers' AND column_name = 'payment_terms_id'
  ) THEN
    ALTER TABLE suppliers ADD COLUMN payment_terms_id uuid REFERENCES supplier_payment_terms(id);
  END IF;
END $$;

-- Insert common payment terms
INSERT INTO supplier_payment_terms (name, description, days, active) VALUES
  ('Comptant', 'Paiement comptant à la livraison', 0, true),
  ('15 jours', 'Paiement sous 15 jours', 15, true),
  ('30 jours', 'Paiement sous 30 jours', 30, true),
  ('30 jours fin de mois', 'Paiement à 30 jours fin de mois', 30, true),
  ('45 jours', 'Paiement sous 45 jours', 45, true),
  ('60 jours', 'Paiement sous 60 jours', 60, true),
  ('90 jours', 'Paiement sous 90 jours', 90, true)
ON CONFLICT DO NOTHING;

-- Disable RLS for development
ALTER TABLE supplier_payment_terms DISABLE ROW LEVEL SECURITY;