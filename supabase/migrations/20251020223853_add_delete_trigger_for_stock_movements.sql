/*
  # Ajout du trigger pour gérer les suppressions de mouvements de stock

  1. Nouvelle Fonction
    - `update_product_stocks_on_delete()` - Met à jour product_stocks quand un mouvement est supprimé
    
  2. Comportement
    - Lors d'un DELETE dans stock_movements, recalcule le stock total
    - Utilise la même logique que le trigger INSERT pour maintenir la cohérence
    
  3. Sécurité
    - Met à jour updated_at automatiquement
    - Recalcule le stock complet basé sur tous les mouvements restants
*/

-- Fonction pour mettre à jour product_stocks lors de la suppression d'un mouvement
CREATE OR REPLACE FUNCTION update_product_stocks_on_delete()
RETURNS TRIGGER AS $$
DECLARE
  total_quantity NUMERIC;
BEGIN
  -- Calculer la quantité totale pour ce produit dans ce dépôt
  -- après suppression du mouvement
  SELECT COALESCE(
    SUM(
      CASE 
        WHEN movement_type IN ('purchase', 'transfer_in', 'adjustment_in', 'restock') THEN quantity
        WHEN movement_type IN ('sale', 'breakage', 'expired', 'transfer_out', 'adjustment_out') THEN -quantity
        ELSE 0
      END
    ), 0
  )
  INTO total_quantity
  FROM stock_movements
  WHERE product_id = OLD.product_id
    AND storage_location_id = OLD.storage_location_id;

  -- Mettre à jour product_stocks
  UPDATE product_stocks
  SET 
    quantity = total_quantity,
    updated_at = NOW()
  WHERE product_id = OLD.product_id
    AND storage_location_id = OLD.storage_location_id;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Créer le trigger sur stock_movements pour les suppressions
DROP TRIGGER IF EXISTS trigger_update_product_stocks_on_delete ON stock_movements;
CREATE TRIGGER trigger_update_product_stocks_on_delete
AFTER DELETE ON stock_movements
FOR EACH ROW
EXECUTE FUNCTION update_product_stocks_on_delete();
