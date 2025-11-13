/*
  # Permettre les réceptions directes sans bon de commande

  1. Modifications de la table `purchase_receptions`
    - Rendre `purchase_order_id` optionnel (nullable)
    - Ajouter `supplier_id` optionnel pour les réceptions directes
    - Ajouter une contrainte pour s'assurer qu'au moins l'un des deux est renseigné

  2. Modifications de la table `purchase_reception_lines`
    - Rendre `purchase_order_line_id` optionnel pour les réceptions directes

  3. Ajustement des triggers
    - Modifier les triggers pour gérer les réceptions sans commande

  ## Notes importantes
  - Les réceptions avec commande doivent avoir purchase_order_id
  - Les réceptions directes doivent avoir supplier_id
  - Au moins l'un des deux doit être renseigné
*/

-- ============================================================
-- 1. MODIFIER LA TABLE purchase_receptions
-- ============================================================

-- Ajouter la colonne supplier_id si elle n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'purchase_receptions' AND column_name = 'supplier_id'
  ) THEN
    ALTER TABLE purchase_receptions
    ADD COLUMN supplier_id uuid REFERENCES suppliers(id) ON DELETE RESTRICT;
  END IF;
END $$;

-- Rendre purchase_order_id optionnel
ALTER TABLE purchase_receptions
ALTER COLUMN purchase_order_id DROP NOT NULL;

-- Ajouter une contrainte pour s'assurer qu'au moins l'un des deux est renseigné
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'check_reception_has_order_or_supplier'
  ) THEN
    ALTER TABLE purchase_receptions
    ADD CONSTRAINT check_reception_has_order_or_supplier
    CHECK (
      (purchase_order_id IS NOT NULL AND supplier_id IS NULL) OR
      (purchase_order_id IS NULL AND supplier_id IS NOT NULL)
    );
  END IF;
END $$;

-- Créer un index sur supplier_id
CREATE INDEX IF NOT EXISTS idx_receptions_supplier ON purchase_receptions(supplier_id);

-- ============================================================
-- 2. MODIFIER LA TABLE purchase_reception_lines
-- ============================================================

-- Rendre purchase_order_line_id optionnel pour les réceptions directes
ALTER TABLE purchase_reception_lines
ALTER COLUMN purchase_order_line_id DROP NOT NULL;

-- ============================================================
-- 3. RECRÉER LE TRIGGER DE MISE À JOUR DES QUANTITÉS REÇUES
-- ============================================================

-- Recréer la fonction pour gérer les réceptions sans commande
CREATE OR REPLACE FUNCTION update_po_line_received_quantity()
RETURNS TRIGGER AS $$
BEGIN
  -- Mettre à jour uniquement si c'est lié à une ligne de commande
  IF NEW.purchase_order_line_id IS NOT NULL THEN
    UPDATE purchase_order_lines
    SET
      quantity_received = quantity_received + NEW.quantity_accepted,
      updated_at = now()
    WHERE id = NEW.purchase_order_line_id;

    -- Vérifier si la commande est complètement reçue
    UPDATE purchase_orders po
    SET
      status = CASE
        WHEN (
          SELECT SUM(pol.quantity_ordered)
          FROM purchase_order_lines pol
          WHERE pol.purchase_order_id = po.id
        ) = (
          SELECT SUM(pol.quantity_received)
          FROM purchase_order_lines pol
          WHERE pol.purchase_order_id = po.id
        ) THEN 'received'
        ELSE 'partially_received'
      END,
      updated_at = now()
    WHERE po.id = (
      SELECT pol.purchase_order_id
      FROM purchase_order_lines pol
      WHERE pol.id = NEW.purchase_order_line_id
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 4. RECRÉER LE TRIGGER DE CRÉATION DE MOUVEMENT DE STOCK
-- ============================================================

-- Recréer la fonction pour gérer les réceptions directes
CREATE OR REPLACE FUNCTION create_stock_movement_on_reception()
RETURNS TRIGGER AS $$
DECLARE
  reception_rec RECORD;
BEGIN
  -- Récupérer les infos de réception
  SELECT pr.storage_location_id, pr.reception_number
  INTO reception_rec
  FROM purchase_receptions pr
  WHERE pr.id = NEW.reception_id;

  -- Créer le mouvement de stock pour les quantités acceptées
  IF NEW.quantity_accepted > 0 THEN
    INSERT INTO stock_movements (
      product_id,
      storage_location_id,
      movement_type,
      quantity,
      reference,
      notes
    ) VALUES (
      NEW.product_id,
      reception_rec.storage_location_id,
      'purchase',
      NEW.quantity_accepted,
      'RÉC-' || reception_rec.reception_number,
      COALESCE('Lot: ' || NEW.batch_number, '')
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
