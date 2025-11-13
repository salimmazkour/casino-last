/*
  # Données d'exemple pour les tables des restaurants

  1. Ajout de tables pour Restaurant Le Jardin
    - 10 tables intérieur
    - 5 tables terrasse
    - 2 tables VIP

  2. Ajout de tables pour Restaurant Seven Seven
    - 15 tables principales
    - 5 tables VIP
*/

-- Tables pour Restaurant Le Jardin (ID à récupérer dynamiquement)
DO $$
DECLARE
  jardin_id uuid;
  seven_id uuid;
BEGIN
  -- Récupérer l'ID du Restaurant Le Jardin
  SELECT id INTO jardin_id FROM sales_points WHERE name = 'Restaurant Le Jardin' LIMIT 1;
  
  -- Récupérer l'ID du Restaurant Seven Seven
  SELECT id INTO seven_id FROM sales_points WHERE name = 'Restaurant Seven Seven' LIMIT 1;

  -- Si Restaurant Le Jardin existe, créer les tables
  IF jardin_id IS NOT NULL THEN
    -- Tables intérieur
    INSERT INTO restaurant_tables (sales_point_id, table_number, capacity, zone, position_x, position_y, status)
    VALUES
      (jardin_id, 'T1', 4, 'Intérieur', 50, 100, 'available'),
      (jardin_id, 'T2', 4, 'Intérieur', 200, 100, 'available'),
      (jardin_id, 'T3', 2, 'Intérieur', 350, 100, 'available'),
      (jardin_id, 'T4', 6, 'Intérieur', 50, 250, 'available'),
      (jardin_id, 'T5', 4, 'Intérieur', 200, 250, 'available'),
      (jardin_id, 'T6', 4, 'Intérieur', 350, 250, 'available'),
      (jardin_id, 'T7', 2, 'Intérieur', 50, 400, 'available'),
      (jardin_id, 'T8', 4, 'Intérieur', 200, 400, 'available'),
      (jardin_id, 'T9', 6, 'Intérieur', 350, 400, 'available'),
      (jardin_id, 'T10', 4, 'Intérieur', 200, 550, 'available'),
      
      -- Tables terrasse
      (jardin_id, 'TER1', 4, 'Terrasse', 550, 100, 'available'),
      (jardin_id, 'TER2', 4, 'Terrasse', 700, 100, 'available'),
      (jardin_id, 'TER3', 6, 'Terrasse', 550, 250, 'available'),
      (jardin_id, 'TER4', 4, 'Terrasse', 700, 250, 'available'),
      (jardin_id, 'TER5', 2, 'Terrasse', 625, 400, 'available'),
      
      -- Tables VIP
      (jardin_id, 'VIP1', 8, 'VIP', 550, 550, 'available'),
      (jardin_id, 'VIP2', 6, 'VIP', 700, 550, 'available')
    ON CONFLICT (sales_point_id, table_number) DO NOTHING;
  END IF;

  -- Si Restaurant Seven Seven existe, créer les tables
  IF seven_id IS NOT NULL THEN
    INSERT INTO restaurant_tables (sales_point_id, table_number, capacity, zone, position_x, position_y, status)
    VALUES
      -- Tables principales
      (seven_id, 'S1', 4, 'Principale', 50, 100, 'available'),
      (seven_id, 'S2', 4, 'Principale', 180, 100, 'available'),
      (seven_id, 'S3', 4, 'Principale', 310, 100, 'available'),
      (seven_id, 'S4', 2, 'Principale', 440, 100, 'available'),
      (seven_id, 'S5', 6, 'Principale', 50, 250, 'available'),
      (seven_id, 'S6', 4, 'Principale', 180, 250, 'available'),
      (seven_id, 'S7', 4, 'Principale', 310, 250, 'available'),
      (seven_id, 'S8', 4, 'Principale', 440, 250, 'available'),
      (seven_id, 'S9', 2, 'Principale', 50, 400, 'available'),
      (seven_id, 'S10', 4, 'Principale', 180, 400, 'available'),
      (seven_id, 'S11', 6, 'Principale', 310, 400, 'available'),
      (seven_id, 'S12', 4, 'Principale', 440, 400, 'available'),
      (seven_id, 'S13', 4, 'Principale', 180, 550, 'available'),
      (seven_id, 'S14', 4, 'Principale', 310, 550, 'available'),
      (seven_id, 'S15', 2, 'Principale', 440, 550, 'available'),
      
      -- Tables VIP
      (seven_id, 'VIP1', 8, 'VIP', 600, 200, 'available'),
      (seven_id, 'VIP2', 6, 'VIP', 750, 200, 'available'),
      (seven_id, 'VIP3', 6, 'VIP', 600, 400, 'available'),
      (seven_id, 'VIP4', 8, 'VIP', 750, 400, 'available'),
      (seven_id, 'VIP5', 10, 'VIP', 675, 600, 'available')
    ON CONFLICT (sales_point_id, table_number) DO NOTHING;
  END IF;
END $$;