/*
  # Add Cancellation Template Support

  1. Changes
    - Add `is_cancellation_template` boolean field to `print_templates` table
    - Defaults to false for existing templates
    - Allows templates to be marked as cancellation slip templates

  2. Purpose
    - Enable dedicated cancellation slip templates per sales point
    - Each sales point can have one cancellation template
    - Cancellation templates show the source sales point name automatically
*/

-- Add is_cancellation_template field
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'print_templates' AND column_name = 'is_cancellation_template'
  ) THEN
    ALTER TABLE print_templates 
    ADD COLUMN is_cancellation_template BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Update existing templates to explicitly set false
UPDATE print_templates 
SET is_cancellation_template = false 
WHERE is_cancellation_template IS NULL;