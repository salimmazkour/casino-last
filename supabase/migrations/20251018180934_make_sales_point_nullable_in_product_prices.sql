/*
  # Rendre sales_point_id nullable dans product_prices

  1. Modifications
    - Rendre la colonne `sales_point_id` nullable dans `product_prices`
    - Cela permet d'enregistrer des dépôts de stockage pour les matières premières sans point de vente
  
  2. Notes
    - Pour les produits composés (plats, boissons), le `sales_point_id` sera renseigné
    - Pour les matières premières et consommables, seul le `storage_location_id` sera renseigné
*/

ALTER TABLE product_prices 
ALTER COLUMN sales_point_id DROP NOT NULL;
