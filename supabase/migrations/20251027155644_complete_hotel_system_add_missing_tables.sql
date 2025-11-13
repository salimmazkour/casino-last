/*
  # Complétion du Système Hôtelier

  ## Description
  Ajoute les tables manquantes pour compléter le module hôtel :
  
  ## Nouvelles tables
  1. **hotel_meal_plans** - Formules de restauration (Petit Déj, Demi-Pension, Pension Complète)
  2. **hotel_stays** - Séjours actifs (après check-in)
  3. **hotel_room_charges** - Charges additionnelles sur chambres
  4. **hotel_payments** - Paiements clients hôtel
  5. **hotel_card_encodings** - Historique encodage cartes magnétiques (déjà existe comme hotel_card_keys)
  
  ## Modifications
  - Ajout de `meal_plan_id` aux réservations
  - Ajout de `nationality` et `adults/children_count` aux réservations
  - Création des données de test pour les formules

  ## Sécurité
  RLS activé mais en mode développement (accès complet)
*/

-- ============================================
-- 1. FORMULES DE RESTAURATION
-- ============================================
CREATE TABLE IF NOT EXISTS hotel_meal_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text UNIQUE NOT NULL,
  description text,
  price_adult numeric(10,2) DEFAULT 0,
  price_child numeric(10,2) DEFAULT 0,
  includes_breakfast boolean DEFAULT false,
  includes_lunch boolean DEFAULT false,
  includes_dinner boolean DEFAULT false,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE hotel_meal_plans ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 2. SÉJOURS ACTIFS (après check-in)
-- ============================================
CREATE TABLE IF NOT EXISTS hotel_stays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id uuid REFERENCES hotel_reservations(id) ON DELETE SET NULL,
  room_id uuid REFERENCES hotel_rooms(id) ON DELETE SET NULL,
  guest_name text NOT NULL,
  check_in_date timestamptz NOT NULL DEFAULT now(),
  check_out_date date NOT NULL,
  actual_check_out timestamptz,
  meal_plan_id uuid REFERENCES hotel_meal_plans(id) ON DELETE SET NULL,
  card_number text,
  card_encoded_at timestamptz,
  room_charges numeric(10,2) DEFAULT 0,
  mini_bar_charges numeric(10,2) DEFAULT 0,
  restaurant_charges numeric(10,2) DEFAULT 0,
  other_charges numeric(10,2) DEFAULT 0,
  total_charges numeric(10,2) DEFAULT 0,
  notes text,
  status text DEFAULT 'active' CHECK (status IN ('active', 'checked_out')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE hotel_stays ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_stays_status ON hotel_stays(status);
CREATE INDEX IF NOT EXISTS idx_stays_room ON hotel_stays(room_id);
CREATE INDEX IF NOT EXISTS idx_stays_checkout ON hotel_stays(check_out_date);

-- ============================================
-- 3. CHARGES ADDITIONNELLES SUR CHAMBRES
-- ============================================
CREATE TABLE IF NOT EXISTS hotel_room_charges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stay_id uuid REFERENCES hotel_stays(id) ON DELETE CASCADE,
  charge_type text NOT NULL CHECK (charge_type IN ('minibar', 'restaurant', 'laundry', 'room_service', 'parking', 'telephone', 'other')),
  description text NOT NULL,
  amount numeric(10,2) NOT NULL,
  quantity integer DEFAULT 1,
  total numeric(10,2) NOT NULL,
  pos_order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  charged_at timestamptz DEFAULT now(),
  charged_by uuid REFERENCES employees(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE hotel_room_charges ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_charges_stay ON hotel_room_charges(stay_id);
CREATE INDEX IF NOT EXISTS idx_charges_type ON hotel_room_charges(charge_type);
CREATE INDEX IF NOT EXISTS idx_charges_pos_order ON hotel_room_charges(pos_order_id);

-- ============================================
-- 4. PAIEMENTS HÔTEL
-- ============================================
CREATE TABLE IF NOT EXISTS hotel_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stay_id uuid REFERENCES hotel_stays(id) ON DELETE SET NULL,
  reservation_id uuid REFERENCES hotel_reservations(id) ON DELETE SET NULL,
  payment_type text NOT NULL CHECK (payment_type IN ('cash', 'card', 'bank_transfer', 'check', 'online', 'deposit')),
  amount numeric(10,2) NOT NULL,
  reference text,
  notes text,
  received_by uuid REFERENCES employees(id) ON DELETE SET NULL,
  sales_point_id uuid REFERENCES sales_points(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE hotel_payments ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_hotel_payments_stay ON hotel_payments(stay_id);
CREATE INDEX IF NOT EXISTS idx_hotel_payments_reservation ON hotel_payments(reservation_id);
CREATE INDEX IF NOT EXISTS idx_hotel_payments_date ON hotel_payments(created_at);

-- ============================================
-- 5. AJOUT DE COLONNES AUX RÉSERVATIONS
-- ============================================
DO $$
BEGIN
  -- Ajout meal_plan_id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'hotel_reservations' AND column_name = 'meal_plan_id'
  ) THEN
    ALTER TABLE hotel_reservations ADD COLUMN meal_plan_id uuid REFERENCES hotel_meal_plans(id) ON DELETE SET NULL;
  END IF;

  -- Ajout meal_plan_price
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'hotel_reservations' AND column_name = 'meal_plan_price'
  ) THEN
    ALTER TABLE hotel_reservations ADD COLUMN meal_plan_price numeric(10,2) DEFAULT 0;
  END IF;

  -- Ajout nationality
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'hotel_reservations' AND column_name = 'guest_nationality'
  ) THEN
    ALTER TABLE hotel_reservations ADD COLUMN guest_nationality text;
  END IF;

  -- Ajout adults_count
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'hotel_reservations' AND column_name = 'adults_count'
  ) THEN
    ALTER TABLE hotel_reservations ADD COLUMN adults_count integer DEFAULT 1;
  END IF;

  -- Ajout children_count
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'hotel_reservations' AND column_name = 'children_count'
  ) THEN
    ALTER TABLE hotel_reservations ADD COLUMN children_count integer DEFAULT 0;
  END IF;

  -- Ajout total_amount
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'hotel_reservations' AND column_name = 'total_amount'
  ) THEN
    ALTER TABLE hotel_reservations ADD COLUMN total_amount numeric(10,2) DEFAULT 0;
  END IF;

  -- Ajout deposit_amount
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'hotel_reservations' AND column_name = 'deposit_amount'
  ) THEN
    ALTER TABLE hotel_reservations ADD COLUMN deposit_amount numeric(10,2) DEFAULT 0;
  END IF;

  -- Ajout balance_due
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'hotel_reservations' AND column_name = 'balance_due'
  ) THEN
    ALTER TABLE hotel_reservations ADD COLUMN balance_due numeric(10,2) DEFAULT 0;
  END IF;
END $$;

-- ============================================
-- 6. DONNÉES INITIALES - FORMULES RESTAURATION
-- ============================================
INSERT INTO hotel_meal_plans (name, code, description, price_adult, price_child, includes_breakfast, includes_lunch, includes_dinner, active)
VALUES
  ('Chambre Seule', 'RO', 'Nuitée uniquement sans repas', 0, 0, false, false, false, true),
  ('Petit Déjeuner', 'BB', 'Nuitée avec petit déjeuner inclus', 15.00, 8.00, true, false, false, true),
  ('Demi-Pension', 'HB', 'Nuitée avec petit déjeuner et dîner', 35.00, 18.00, true, false, true, true),
  ('Pension Complète', 'FB', 'Nuitée avec tous les repas (petit déjeuner, déjeuner, dîner)', 50.00, 25.00, true, true, true, true)
ON CONFLICT (code) DO NOTHING;

-- ============================================
-- 7. TRIGGER POUR RECALCULER LES CHARGES
-- ============================================
CREATE OR REPLACE FUNCTION update_stay_total_charges()
RETURNS TRIGGER AS $$
BEGIN
  -- Recalculer le total des charges par type
  UPDATE hotel_stays
  SET 
    restaurant_charges = COALESCE((
      SELECT SUM(total)
      FROM hotel_room_charges
      WHERE stay_id = COALESCE(NEW.stay_id, OLD.stay_id) AND charge_type = 'restaurant'
    ), 0),
    mini_bar_charges = COALESCE((
      SELECT SUM(total)
      FROM hotel_room_charges
      WHERE stay_id = COALESCE(NEW.stay_id, OLD.stay_id) AND charge_type = 'minibar'
    ), 0),
    other_charges = COALESCE((
      SELECT SUM(total)
      FROM hotel_room_charges
      WHERE stay_id = COALESCE(NEW.stay_id, OLD.stay_id) AND charge_type NOT IN ('restaurant', 'minibar')
    ), 0),
    total_charges = COALESCE((
      SELECT SUM(total)
      FROM hotel_room_charges
      WHERE stay_id = COALESCE(NEW.stay_id, OLD.stay_id)
    ), 0)
  WHERE id = COALESCE(NEW.stay_id, OLD.stay_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_stay_charges_trigger ON hotel_room_charges;
CREATE TRIGGER update_stay_charges_trigger
  AFTER INSERT OR UPDATE OR DELETE ON hotel_room_charges
  FOR EACH ROW
  EXECUTE FUNCTION update_stay_total_charges();