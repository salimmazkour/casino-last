/*
  # Create action_logs table
  
  1. New Tables
    - `action_logs`
      - `id` (uuid, primary key)
      - `action` (text) - Description of the action
      - `user_full_name` (text) - Name of the user who performed the action
      - `created_at` (timestamptz) - When the action was performed
      
  2. Security
    - Disable RLS for development
*/

CREATE TABLE IF NOT EXISTS action_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL,
  user_full_name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Disable RLS for development
ALTER TABLE action_logs DISABLE ROW LEVEL SECURITY;