/*
  # Tarifs Hôteliers

  ## Description
  Ajout des tarifs de base et tarifs saisonniers pour les chambres
  
  ## Types de tarifs créés
  1. **Chambre Simple** - Tarifs de base et variations saisonnières
  2. **Suite** - Tarifs de base et variations saisonnières
  
  ## Périodes de tarification
  - Basse saison (Novembre-Mars sauf vacances)
  - Moyenne saison (Avril-Mai, Septembre-Octobre)
  - Haute saison (Juin-Août)
  - Vacances/Week-ends (supplément)
*/

-- Suppression des données de test existantes
DELETE FROM hotel_seasonal_rates;
DELETE FROM hotel_rate_types;

-- ============================================
-- 1. TYPES DE TARIFS DE BASE
-- ============================================
INSERT INTO hotel_rate_types (name, description, category, base_price, active)
VALUES
  ('Chambre Simple Standard', 'Tarif standard pour chambre simple (2 personnes)', 'room', 75.00, true),
  ('Suite Standard', 'Tarif standard pour suite (jusqu''à 4 personnes)', 'room', 150.00, true);

-- ============================================
-- 2. TARIFS SAISONNIERS
-- ============================================

DO $$
DECLARE
  simple_rate_id uuid;
  suite_rate_id uuid;
BEGIN
  -- Récupération des IDs
  SELECT id INTO simple_rate_id FROM hotel_rate_types WHERE name = 'Chambre Simple Standard';
  SELECT id INTO suite_rate_id FROM hotel_rate_types WHERE name = 'Suite Standard';

  -- BASSE SAISON (Novembre-Mars) : -20%
  INSERT INTO hotel_seasonal_rates (rate_type_id, name, start_date, end_date, price_modifier, modifier_type, priority, active)
  VALUES
    (simple_rate_id, 'Basse Saison Hiver', '2025-11-01', '2026-03-31', -20, 'percentage', 1, true),
    (suite_rate_id, 'Basse Saison Hiver', '2025-11-01', '2026-03-31', -20, 'percentage', 1, true);

  -- MOYENNE SAISON (Avril-Mai, Septembre-Octobre) : Prix normal (0%)
  INSERT INTO hotel_seasonal_rates (rate_type_id, name, start_date, end_date, price_modifier, modifier_type, priority, active)
  VALUES
    (simple_rate_id, 'Moyenne Saison Printemps', '2025-04-01', '2025-05-31', 0, 'percentage', 2, true),
    (simple_rate_id, 'Moyenne Saison Automne', '2025-09-01', '2025-10-31', 0, 'percentage', 2, true),
    (suite_rate_id, 'Moyenne Saison Printemps', '2025-04-01', '2025-05-31', 0, 'percentage', 2, true),
    (suite_rate_id, 'Moyenne Saison Automne', '2025-09-01', '2025-10-31', 0, 'percentage', 2, true);

  -- HAUTE SAISON (Juin-Août) : +30%
  INSERT INTO hotel_seasonal_rates (rate_type_id, name, start_date, end_date, price_modifier, modifier_type, priority, active)
  VALUES
    (simple_rate_id, 'Haute Saison Été', '2025-06-01', '2025-08-31', 30, 'percentage', 3, true),
    (suite_rate_id, 'Haute Saison Été', '2025-06-01', '2025-08-31', 30, 'percentage', 3, true);

  -- VACANCES SCOLAIRES : +15%
  INSERT INTO hotel_seasonal_rates (rate_type_id, name, start_date, end_date, price_modifier, modifier_type, priority, active)
  VALUES
    (simple_rate_id, 'Vacances Noël', '2025-12-20', '2026-01-05', 15, 'percentage', 5, true),
    (suite_rate_id, 'Vacances Noël', '2025-12-20', '2026-01-05', 15, 'percentage', 5, true),
    (simple_rate_id, 'Vacances Pâques', '2025-04-19', '2025-05-04', 15, 'percentage', 5, true),
    (suite_rate_id, 'Vacances Pâques', '2025-04-19', '2025-05-04', 15, 'percentage', 5, true);

  -- WEEK-ENDS (Vendredi-Samedi) : +10€ fixe
  INSERT INTO hotel_seasonal_rates (rate_type_id, name, start_date, end_date, price_modifier, modifier_type, priority, active)
  VALUES
    (simple_rate_id, 'Supplément Week-end', '2025-01-01', '2025-12-31', 10, 'fixed', 4, true),
    (suite_rate_id, 'Supplément Week-end', '2025-01-01', '2025-12-31', 20, 'fixed', 4, true);

END $$;