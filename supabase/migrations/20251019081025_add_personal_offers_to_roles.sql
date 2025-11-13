/*
  # Ajout de la gestion des offerts personnels par rôle

  ## Description
  Ajoute les colonnes nécessaires à la table `roles` pour gérer les limites 
  d'offerts personnels par défaut pour chaque rôle.

  ## Modifications

  ### Table `roles`
    - Ajout de `personal_offer_limit` (integer, DEFAULT 0) - Nombre d'offerts autorisés par jour
    - Ajout de `personal_offer_max_amount` (decimal, DEFAULT 0) - Montant maximum par offert

  ## Notes
    - Ces valeurs par défaut peuvent être surchargées au niveau individuel dans la table `employees`
    - Un rôle avec personal_offer_limit = 0 signifie aucun offert autorisé
    - Un rôle avec personal_offer_max_amount = 0 signifie aucune limite de montant (ou pas d'offerts)
*/

-- Ajout des champs pour les offerts personnels aux rôles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'roles' AND column_name = 'personal_offer_limit'
  ) THEN
    ALTER TABLE roles ADD COLUMN personal_offer_limit integer DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'roles' AND column_name = 'personal_offer_max_amount'
  ) THEN
    ALTER TABLE roles ADD COLUMN personal_offer_max_amount decimal(10,2) DEFAULT 0;
  END IF;
END $$;

-- Mise à jour des rôles existants avec des valeurs par défaut selon leur niveau
UPDATE roles SET 
  personal_offer_limit = CASE 
    WHEN level = 1 THEN 10  -- Administrateur: 10 offerts/jour
    WHEN level = 2 THEN 5   -- Manager/Chef: 5 offerts/jour
    ELSE 2                  -- Autres: 2 offerts/jour
  END,
  personal_offer_max_amount = CASE 
    WHEN level = 1 THEN 50.00  -- Administrateur: 50€ max
    WHEN level = 2 THEN 30.00  -- Manager/Chef: 30€ max
    ELSE 15.00                 -- Autres: 15€ max
  END
WHERE personal_offer_limit = 0;
