/*
  # Rendre selling_price nullable dans product_prices

  1. Modifications
    - Rendre la colonne `selling_price` nullable dans `product_prices`
    - Cela permet d'enregistrer des dépôts de stockage pour les matières premières sans prix de vente
  
  2. Notes
    - Pour les produits composés vendus, le `selling_price` sera renseigné
    - Pour les matières premières, seul le lien avec le dépôt de stockage sera enregistré
*/

ALTER TABLE product_prices 
ALTER COLUMN selling_price DROP NOT NULL,
ALTER COLUMN selling_price DROP DEFAULT;
