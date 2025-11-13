/*
  # Création de la table clients

  1. Nouvelle table : `clients`
    - `id` (uuid, primary key)
    - `client_number` (text, unique) - Numéro client généré automatiquement
    - `type` (text) - Type de client : individual (Particulier) ou company (Société)
    - `first_name` (text) - Prénom (pour particuliers)
    - `last_name` (text) - Nom (pour particuliers)
    - `company_name` (text) - Raison sociale (pour sociétés)
    - `email` (text, unique)
    - `phone` (text)
    - `phone_secondary` (text) - Téléphone secondaire
    - `address` (text) - Adresse complète
    - `city` (text) - Ville
    - `country` (text) - Pays (par défaut: Sénégal)
    - `tax_id` (text) - NINEA ou numéro fiscal
    - `credit_limit` (numeric) - Plafond de crédit autorisé
    - `current_balance` (numeric) - Solde actuel du compte (négatif = crédit client)
    - `is_active` (boolean) - Client actif ou non
    - `notes` (text) - Notes internes
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  2. Sécurité
    - Enable RLS
    - Policies pour authenticated users

  3. Notes
    - Le numéro client sera généré automatiquement (CLT-XXXXXX)
    - Le crédit client est géré via current_balance
    - Un solde négatif indique que le client doit de l'argent
*/

-- Créer la table clients
CREATE TABLE IF NOT EXISTS clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_number text UNIQUE NOT NULL,
  type text NOT NULL DEFAULT 'individual' CHECK (type IN ('individual', 'company')),
  first_name text,
  last_name text,
  company_name text,
  email text UNIQUE,
  phone text NOT NULL,
  phone_secondary text,
  address text,
  city text,
  country text DEFAULT 'Sénégal',
  tax_id text,
  credit_limit numeric DEFAULT 0,
  current_balance numeric DEFAULT 0,
  is_active boolean DEFAULT true,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Créer un index sur le numéro client
CREATE INDEX IF NOT EXISTS idx_clients_client_number ON clients(client_number);
CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(email);
CREATE INDEX IF NOT EXISTS idx_clients_phone ON clients(phone);

-- Fonction pour générer automatiquement le numéro client
CREATE OR REPLACE FUNCTION generate_client_number()
RETURNS text AS $$
DECLARE
  new_number text;
  counter int;
BEGIN
  SELECT COUNT(*) + 1 INTO counter FROM clients;
  new_number := 'CLT-' || LPAD(counter::text, 6, '0');
  
  WHILE EXISTS (SELECT 1 FROM clients WHERE client_number = new_number) LOOP
    counter := counter + 1;
    new_number := 'CLT-' || LPAD(counter::text, 6, '0');
  END LOOP;
  
  RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour générer le numéro client automatiquement
CREATE OR REPLACE FUNCTION set_client_number()
RETURNS trigger AS $$
BEGIN
  IF NEW.client_number IS NULL OR NEW.client_number = '' THEN
    NEW.client_number := generate_client_number();
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_client_number
  BEFORE INSERT OR UPDATE ON clients
  FOR EACH ROW
  EXECUTE FUNCTION set_client_number();

-- Activer RLS (désactivé temporairement pour le développement)
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- Politique pour permettre toutes les opérations (développement)
CREATE POLICY "Allow all operations for development"
  ON clients
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Commentaires pour documentation
COMMENT ON TABLE clients IS 'Table des clients avec gestion du crédit';
COMMENT ON COLUMN clients.client_number IS 'Numéro client unique généré automatiquement (CLT-XXXXXX)';
COMMENT ON COLUMN clients.type IS 'Type de client: individual (Particulier) ou company (Société)';
COMMENT ON COLUMN clients.credit_limit IS 'Plafond de crédit autorisé en FCFA';
COMMENT ON COLUMN clients.current_balance IS 'Solde actuel du compte (négatif = dette client)';
