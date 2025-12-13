/*
  # Ajouter storage_location_id à product_prices

  1. Problème identifié
    - La table product_prices dans la base actuelle n'a pas de colonne storage_location_id
    - Les migrations récentes essaient d'utiliser cette colonne
    - Cela cause l'erreur "column storage_location_id does not exist"

  2. Solution
    - Ajouter la colonne storage_location_id si elle n'existe pas
    - Créer la foreign key vers storage_locations
    - Mettre à jour les contraintes et index

  3. Sécurité
    - Utilise IF NOT EXISTS pour éviter les erreurs si la colonne existe déjà
    - Préserve les données existantes
*/

-- Ajouter storage_location_id à product_prices si elle n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'product_prices' AND column_name = 'storage_location_id'
  ) THEN
    ALTER TABLE product_prices
    ADD COLUMN storage_location_id uuid REFERENCES storage_locations(id) ON DELETE CASCADE;
    
    RAISE NOTICE 'Colonne storage_location_id ajoutée à product_prices';
  ELSE
    RAISE NOTICE 'La colonne storage_location_id existe déjà dans product_prices';
  END IF;
END $$;

-- Créer l'index sur storage_location_id si nécessaire
CREATE INDEX IF NOT EXISTS idx_product_prices_storage_location_id 
  ON product_prices(storage_location_id);

-- Créer la contrainte unique si nécessaire
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'unique_product_storage_location'
  ) THEN
    -- Vérifier s'il n'y a pas de doublons avant de créer la contrainte
    IF NOT EXISTS (
      SELECT product_id, storage_location_id, COUNT(*)
      FROM product_prices
      WHERE storage_location_id IS NOT NULL
      GROUP BY product_id, storage_location_id
      HAVING COUNT(*) > 1
    ) THEN
      ALTER TABLE product_prices
      ADD CONSTRAINT unique_product_storage_location
      UNIQUE (product_id, storage_location_id);
      
      RAISE NOTICE 'Contrainte unique_product_storage_location créée';
    ELSE
      RAISE NOTICE 'Doublons détectés, contrainte non créée';
    END IF;
  END IF;
END $$;