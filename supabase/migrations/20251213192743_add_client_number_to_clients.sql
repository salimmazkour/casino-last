/*
  # Ajouter le numéro client automatique

  1. Problème identifié
    - La table clients existe mais n'a pas de colonne client_number
    - Le code frontend et les migrations font référence à client_number
    - Erreur: "column client_number does not exist"

  2. Solution
    - Ajouter la colonne client_number (unique, NOT NULL)
    - Créer une fonction pour générer automatiquement les numéros (CLT-XXXXXX)
    - Créer un trigger pour assigner le numéro à l'insertion
    - Mettre à jour les clients existants avec des numéros générés
    - Créer un index pour optimiser les recherches

  3. Détails
    - Format du numéro: CLT-XXXXXX (6 chiffres aléatoires)
    - La fonction vérifie l'unicité avant d'assigner
    - Les clients existants reçoivent des numéros automatiquement

  4. Sécurité
    - Utilise IF NOT EXISTS pour éviter les erreurs
    - La contrainte UNIQUE garantit qu'aucun doublon ne peut exister
*/

-- Fonction pour générer un numéro client unique
CREATE OR REPLACE FUNCTION generate_client_number()
RETURNS text AS $$
DECLARE
  new_number text;
  random_digits text;
BEGIN
  LOOP
    -- Générer 6 chiffres aléatoires
    random_digits := LPAD(FLOOR(RANDOM() * 1000000)::text, 6, '0');
    new_number := 'CLT-' || random_digits;
    
    -- Vérifier si ce numéro existe déjà
    EXIT WHEN NOT EXISTS (SELECT 1 FROM clients WHERE client_number = new_number);
  END LOOP;
  
  RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Ajouter la colonne client_number si elle n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'client_number'
  ) THEN
    -- Ajouter la colonne comme nullable temporairement
    ALTER TABLE clients ADD COLUMN client_number text;
    
    -- Générer des numéros pour tous les clients existants
    UPDATE clients SET client_number = generate_client_number() WHERE client_number IS NULL;
    
    -- Rendre la colonne NOT NULL et UNIQUE
    ALTER TABLE clients ALTER COLUMN client_number SET NOT NULL;
    ALTER TABLE clients ADD CONSTRAINT clients_client_number_key UNIQUE (client_number);
    
    RAISE NOTICE 'Colonne client_number ajoutée à clients avec des numéros générés';
  ELSE
    RAISE NOTICE 'La colonne client_number existe déjà dans clients';
  END IF;
END $$;

-- Fonction trigger pour assigner automatiquement un numéro client
CREATE OR REPLACE FUNCTION set_client_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.client_number IS NULL OR NEW.client_number = '' THEN
    NEW.client_number := generate_client_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Créer le trigger si il n'existe pas déjà
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_set_client_number'
  ) THEN
    CREATE TRIGGER trigger_set_client_number
      BEFORE INSERT ON clients
      FOR EACH ROW
      EXECUTE FUNCTION set_client_number();
    
    RAISE NOTICE 'Trigger trigger_set_client_number créé';
  ELSE
    RAISE NOTICE 'Le trigger trigger_set_client_number existe déjà';
  END IF;
END $$;

-- Créer l'index pour optimiser les recherches par numéro client
CREATE INDEX IF NOT EXISTS idx_clients_client_number ON clients(client_number);

-- Ajouter un commentaire sur la colonne
COMMENT ON COLUMN clients.client_number IS 'Numéro client unique généré automatiquement (CLT-XXXXXX)';