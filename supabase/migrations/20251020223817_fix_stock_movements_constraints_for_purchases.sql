/*
  # Mise à jour des contraintes de stock_movements pour supporter les achats

  1. Modification
    - Ajouter 'purchase' aux types de mouvements autorisés
    - Ajouter 'expired' pour les produits périmés
    - Ajouter 'transfer_in' et 'transfer_out' pour les transferts entre dépôts
    - Ajouter 'adjustment_in' et 'adjustment_out' pour les ajustements d'inventaire
  
  2. Types de mouvements finaux
    - 'sale' : vente (diminue le stock)
    - 'purchase' : achat/réception (augmente le stock)
    - 'restock' : réapprovisionnement (augmente le stock)
    - 'inventory_adjustment' : ajustement d'inventaire (peut augmenter ou diminuer)
    - 'adjustment_in' : ajustement positif (augmente le stock)
    - 'adjustment_out' : ajustement négatif (diminue le stock)
    - 'transfer' : transfert (à préciser avec transfer_in/transfer_out)
    - 'transfer_in' : transfert entrant (augmente le stock)
    - 'transfer_out' : transfert sortant (diminue le stock)
    - 'breakage' : casse (diminue le stock)
    - 'expired' : produit périmé (diminue le stock)
*/

-- Mettre à jour la contrainte pour permettre 'purchase' et autres types
ALTER TABLE stock_movements
  DROP CONSTRAINT IF EXISTS stock_movements_movement_type_check;

ALTER TABLE stock_movements
  ADD CONSTRAINT stock_movements_movement_type_check
  CHECK (movement_type IN (
    'sale', 
    'purchase', 
    'restock', 
    'inventory_adjustment',
    'adjustment_in',
    'adjustment_out',
    'transfer',
    'transfer_in',
    'transfer_out',
    'breakage',
    'expired'
  ));
