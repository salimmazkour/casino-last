/*
  # Système de mise à jour automatique des stocks

  1. Nouvelle Fonction
    - `update_product_stocks_from_movement()` - Met à jour automatiquement product_stocks quand un mouvement est créé

  2. Comportement
    - Lors d'un INSERT dans stock_movements, met à jour ou crée l'enregistrement dans product_stocks
    - Calcule la quantité totale basée sur tous les mouvements pour ce produit/dépôt
    - Types de mouvements :
      - 'purchase', 'transfer_in', 'adjustment_in' → augmentent le stock
      - 'sale', 'breakage', 'expired', 'transfer_out', 'adjustment_out' → diminuent le stock

  3. Sécurité
    - Met à jour updated_at automatiquement
    - Crée l'enregistrement s'il n'existe pas
    - Recalcule le stock complet pour éviter les incohérences

  4. Important
    - Ce trigger s'exécute APRÈS chaque insertion dans stock_movements
    - Il garantit que product_stocks reflète toujours la réalité des mouvements
    - PREREQUIS: La colonne storage_location_id doit exister dans product_stocks
*/

-- Vérifier que la colonne storage_location_id existe avant de créer la fonction
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'product_stocks' AND column_name = 'storage_location_id'
  ) THEN
    RAISE NOTICE 'ATTENTION: La colonne storage_location_id n''existe pas dans product_stocks. La fonction et le trigger ne seront pas créés.';
    RETURN;
  END IF;

  -- Fonction pour mettre à jour product_stocks à partir des mouvements
  CREATE OR REPLACE FUNCTION update_product_stocks_from_movement()
  RETURNS TRIGGER AS $func$
  DECLARE
    total_quantity NUMERIC;
  BEGIN
    -- Calculer la quantité totale pour ce produit dans ce dépôt
    -- en additionnant tous les mouvements
    SELECT COALESCE(
      SUM(
        CASE
          -- Mouvements qui augmentent le stock
          WHEN movement_type IN ('purchase', 'transfer_in', 'adjustment_in') THEN quantity
          -- Mouvements qui diminuent le stock
          WHEN movement_type IN ('sale', 'breakage', 'expired', 'transfer_out', 'adjustment_out') THEN -quantity
          ELSE 0
        END
      ), 0
    )
    INTO total_quantity
    FROM stock_movements
    WHERE product_id = NEW.product_id
      AND storage_location_id = NEW.storage_location_id;

    -- Insérer ou mettre à jour product_stocks
    INSERT INTO product_stocks (
      product_id,
      storage_location_id,
      quantity,
      updated_at
    ) VALUES (
      NEW.product_id,
      NEW.storage_location_id,
      total_quantity,
      NOW()
    )
    ON CONFLICT (product_id, storage_location_id)
    DO UPDATE SET
      quantity = EXCLUDED.quantity,
      updated_at = NOW();

    RETURN NEW;
  END;
  $func$ LANGUAGE plpgsql;

  -- Créer le trigger sur stock_movements
  DROP TRIGGER IF EXISTS trigger_update_product_stocks ON stock_movements;
  CREATE TRIGGER trigger_update_product_stocks
  AFTER INSERT ON stock_movements
  FOR EACH ROW
  EXECUTE FUNCTION update_product_stocks_from_movement();

  RAISE NOTICE 'Fonction et trigger update_product_stocks_from_movement créés avec succès';
END $$;

-- Ajouter une contrainte unique si elle n'existe pas déjà
DO $$
BEGIN
  -- Vérifier d'abord que la colonne storage_location_id existe
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'product_stocks' AND column_name = 'storage_location_id'
  ) THEN
    -- Ensuite vérifier si la contrainte n'existe pas déjà
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'product_stocks_product_storage_unique'
    ) THEN
      ALTER TABLE product_stocks
      ADD CONSTRAINT product_stocks_product_storage_unique
      UNIQUE (product_id, storage_location_id);
    END IF;
  ELSE
    RAISE NOTICE 'La colonne storage_location_id n''existe pas encore dans product_stocks';
  END IF;
END $$;
