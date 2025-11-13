/*
  # Gestion de la TVA paramétrable

  1. Modifications
    - Ajout du champ `vat_rate` dans `sales_points` (taux de TVA par point de vente)
    - Mise à jour de tous les points de vente avec TVA 10% (Sénégal - Hôtellerie Restauration)
    - Ajout de colonnes pour différencier HT et TTC dans les produits et prix

  2. Notes importantes
    - La TVA au Sénégal pour l'hôtellerie-restauration est de 10%
    - Les prix de vente actuels sont considérés comme TTC
    - Le système calculera automatiquement le HT à partir du TTC
*/

-- Ajouter le champ taux de TVA dans sales_points
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sales_points' AND column_name = 'vat_rate'
  ) THEN
    ALTER TABLE sales_points ADD COLUMN vat_rate numeric DEFAULT 10 NOT NULL;
  END IF;
END $$;

-- Mettre à jour tous les points de vente existants avec 10% de TVA
UPDATE sales_points SET vat_rate = 10 WHERE vat_rate IS NULL OR vat_rate = 0;

-- Ajouter des commentaires pour clarifier
COMMENT ON COLUMN sales_points.vat_rate IS 'Taux de TVA applicable au point de vente (en %). Ex: 10 pour 10%';

-- Ajouter une colonne pour indiquer si les prix sont TTC ou HT
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'price_includes_vat'
  ) THEN
    ALTER TABLE products ADD COLUMN price_includes_vat boolean DEFAULT true NOT NULL;
  END IF;
END $$;

COMMENT ON COLUMN products.price_includes_vat IS 'Indique si le prix de base inclut la TVA (true = TTC, false = HT)';

-- Ajouter une colonne dans product_prices pour gérer HT/TTC
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'product_prices' AND column_name = 'price_includes_vat'
  ) THEN
    ALTER TABLE product_prices ADD COLUMN price_includes_vat boolean DEFAULT true NOT NULL;
  END IF;
END $$;

COMMENT ON COLUMN product_prices.price_includes_vat IS 'Indique si le prix de vente inclut la TVA (true = TTC, false = HT)';
