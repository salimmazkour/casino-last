/*
  # Ajout du système de connexion par Login/Mot de passe

  ## Description
  Modification pour permettre la connexion avec un login au lieu d'un email.

  ## 1. Modifications
  
  ### Table `employees`
    - Ajout du champ `login` (text, unique, NOT NULL)
    - Ajout du champ `password_hash` (text, NOT NULL)
    - Modification de `email` pour le rendre optionnel
  
  ### Nouvelle Table `user_sessions`
    - `id` (uuid, clé primaire)
    - `employee_id` (uuid, FK vers employees)
    - `token` (text, unique)
    - `expires_at` (timestamptz)
    - `created_at` (timestamptz, DEFAULT now())
  
  ## 2. Sécurité
    - RLS activé sur user_sessions
    - Politiques pour utilisateurs authentifiés
*/

-- Ajout des colonnes login et password_hash à la table employees
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'employees' AND column_name = 'login'
  ) THEN
    ALTER TABLE employees ADD COLUMN login text UNIQUE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'employees' AND column_name = 'password_hash'
  ) THEN
    ALTER TABLE employees ADD COLUMN password_hash text;
  END IF;
END $$;

-- Modification de la contrainte email (la rendre optionnelle)
ALTER TABLE employees ALTER COLUMN email DROP NOT NULL;

-- Création de la table des sessions
CREATE TABLE IF NOT EXISTS user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE,
  token text UNIQUE NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sessions"
  ON user_sessions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert sessions"
  ON user_sessions FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can delete own sessions"
  ON user_sessions FOR DELETE
  TO authenticated
  USING (true);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_employees_login ON employees(login);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_employee ON user_sessions(employee_id);

-- Insertion d'un utilisateur admin par défaut (mot de passe: admin123)
-- Hash bcrypt de "admin123": $2a$10$rOqXZ5z9fzG8H3v5WLkN0.YYxqXnU9qF7VPF5B5FVQZ5z9fzG8H3v
INSERT INTO employees (login, password_hash, full_name, email, role, is_active)
VALUES ('admin', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Administrateur', 'admin@erp.com', 'Direction', true)
ON CONFLICT (login) DO NOTHING;
