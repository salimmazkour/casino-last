/*
  # Système complet de gestion des Achats / Commandes / Réceptions

  ## Description
  Création d'un système complet de gestion des achats pour un ERP:
  - Amélioration de la table fournisseurs existante
  - Création de commandes fournisseurs
  - Réception de commandes avec contrôle qualité
  - Hiérarchie des dépôts de stockage (sous-dépôts)

  ## Modifications et Ajouts

  ### 1. Amélioration de la table `suppliers` existante
  - Ajout de `supplier_code` (code fournisseur unique)
  - Ajout de `notes` (notes diverses)
  - Ajout de `updated_at` (dernière mise à jour)

  ### 2. Hiérarchie des `storage_locations`
  - Ajout de `parent_location_id` pour créer des sous-dépôts
  - Ajout de `location_type` (main_warehouse, sub_warehouse, pos_storage, waste)
  - Permet de créer: "Economat Général" > "Economat Boissons", "Chambre Froide", etc.

  ### 3. Table `purchase_orders` - Commandes fournisseurs
  - Numérotation auto: PO-2025-0001, PO-2025-0002...
  - Statuts: draft, sent, partially_received, received, cancelled
  - Montants HT, TVA et TTC
  - Lien vers fournisseur et dépôt de destination

  ### 4. Table `purchase_order_lines` - Lignes de commande
  - Produits commandés avec quantités et prix unitaires
  - Suivi automatique des quantités reçues
  - Calcul automatique du total ligne

  ### 5. Table `purchase_receptions` - Réceptions de commandes
  - Numérotation auto: REC-2025-0001, REC-2025-0002...
  - Validation des réceptions par employé
  - Statuts: pending, validated, cancelled

  ### 6. Table `purchase_reception_lines` - Détail des réceptions
  - Quantités reçues, acceptées et rejetées
  - Traçabilité: numéro de lot, date de péremption
  - Motif de rejet si applicable

  ## Automatisations

  ### Triggers automatiques
  1. **update_po_line_received_quantity**
     - Met à jour les quantités reçues dans les lignes de commande
     - Change le statut de la commande (partially_received/received)

  2. **create_stock_movement_on_reception**
     - Crée automatiquement un mouvement de stock à la réception
     - Type: 'purchase'
     - Ne traite que les quantités acceptées

  ### Fonctions utilitaires
  - `generate_next_purchase_order_number()` - Génère PO-YYYY-NNNN
  - `generate_next_reception_number()` - Génère REC-YYYY-NNNN

  ## Workflow typique

  1. **Création d'une commande**
     - Status: draft
     - Ajout des lignes de commande

  2. **Envoi de la commande**
     - Status: sent

  3. **Réception partielle ou totale**
     - Création d'une réception
     - Saisie des quantités reçues/acceptées/rejetées
     - Status commande: partially_received → received

  4. **Validation de la réception**
     - Status réception: validated
     - Création automatique des mouvements de stock

  ## Sécurité
  - RLS désactivé pour développement
*/

-- ============================================================
-- 1. AMÉLIORATION DE LA TABLE SUPPLIERS EXISTANTE
-- ============================================================

-- Ajouter les colonnes manquantes à suppliers
ALTER TABLE suppliers 
  ADD COLUMN IF NOT EXISTS supplier_code text;

ALTER TABLE suppliers 
  ADD COLUMN IF NOT EXISTS notes text DEFAULT '';

ALTER TABLE suppliers 
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Créer un code automatique pour les fournisseurs existants sans code
DO $$
DECLARE
  supplier_rec RECORD;
  counter int := 1;
BEGIN
  FOR supplier_rec IN 
    SELECT id FROM suppliers WHERE supplier_code IS NULL OR supplier_code = ''
  LOOP
    UPDATE suppliers 
    SET supplier_code = 'F' || LPAD(counter::text, 3, '0')
    WHERE id = supplier_rec.id;
    counter := counter + 1;
  END LOOP;
END $$;

-- Rendre supplier_code NOT NULL et UNIQUE
ALTER TABLE suppliers 
  ALTER COLUMN supplier_code SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'suppliers_supplier_code_key'
  ) THEN
    ALTER TABLE suppliers ADD CONSTRAINT suppliers_supplier_code_key UNIQUE (supplier_code);
  END IF;
END $$;

-- Index pour recherche rapide
CREATE INDEX IF NOT EXISTS idx_suppliers_code ON suppliers(supplier_code);
CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers(name);

-- ============================================================
-- 2. HIÉRARCHIE DES STORAGE_LOCATIONS
-- ============================================================

-- Ajouter les colonnes pour la hiérarchie
ALTER TABLE storage_locations 
  ADD COLUMN IF NOT EXISTS parent_location_id uuid REFERENCES storage_locations(id) ON DELETE SET NULL;

ALTER TABLE storage_locations 
  ADD COLUMN IF NOT EXISTS location_type text DEFAULT 'main_warehouse';

-- Ajouter le CHECK constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'storage_locations_location_type_check'
  ) THEN
    ALTER TABLE storage_locations 
      ADD CONSTRAINT storage_locations_location_type_check 
      CHECK (location_type IN ('main_warehouse', 'sub_warehouse', 'pos_storage', 'waste'));
  END IF;
END $$;

-- Index
CREATE INDEX IF NOT EXISTS idx_storage_locations_parent 
  ON storage_locations(parent_location_id);

-- ============================================================
-- 3. TABLE PURCHASE_ORDERS - COMMANDES FOURNISSEURS
-- ============================================================

CREATE TABLE IF NOT EXISTS purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text UNIQUE NOT NULL,
  supplier_id uuid REFERENCES suppliers(id) ON DELETE RESTRICT NOT NULL,
  order_date date DEFAULT CURRENT_DATE NOT NULL,
  expected_delivery_date date,
  destination_location_id uuid REFERENCES storage_locations(id) ON DELETE RESTRICT,
  status text DEFAULT 'draft' CHECK (
    status IN ('draft', 'sent', 'partially_received', 'received', 'cancelled')
  ),
  total_amount numeric(10, 2) DEFAULT 0,
  vat_amount numeric(10, 2) DEFAULT 0,
  total_with_vat numeric(10, 2) DEFAULT 0,
  notes text DEFAULT '',
  created_by uuid REFERENCES employees(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_purchase_orders_number ON purchase_orders(order_number);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier ON purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_date ON purchase_orders(order_date);

-- ============================================================
-- 4. TABLE PURCHASE_ORDER_LINES - LIGNES DE COMMANDE
-- ============================================================

CREATE TABLE IF NOT EXISTS purchase_order_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id uuid REFERENCES purchase_orders(id) ON DELETE CASCADE NOT NULL,
  product_id uuid REFERENCES products(id) ON DELETE RESTRICT NOT NULL,
  quantity_ordered numeric(10, 3) NOT NULL CHECK (quantity_ordered > 0),
  quantity_received numeric(10, 3) DEFAULT 0 CHECK (quantity_received >= 0),
  unit_price numeric(10, 2) NOT NULL CHECK (unit_price >= 0),
  vat_rate numeric(5, 2) DEFAULT 0 CHECK (vat_rate >= 0),
  total_line numeric(10, 2) GENERATED ALWAYS AS (quantity_ordered * unit_price) STORED,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_po_lines_order ON purchase_order_lines(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_po_lines_product ON purchase_order_lines(product_id);

-- ============================================================
-- 5. TABLE PURCHASE_RECEPTIONS - RÉCEPTIONS DE COMMANDES
-- ============================================================

CREATE TABLE IF NOT EXISTS purchase_receptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reception_number text UNIQUE NOT NULL,
  purchase_order_id uuid REFERENCES purchase_orders(id) ON DELETE RESTRICT NOT NULL,
  reception_date date DEFAULT CURRENT_DATE NOT NULL,
  received_by uuid REFERENCES employees(id) ON DELETE SET NULL,
  storage_location_id uuid REFERENCES storage_locations(id) ON DELETE RESTRICT NOT NULL,
  status text DEFAULT 'pending' CHECK (
    status IN ('pending', 'validated', 'cancelled')
  ),
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_receptions_number ON purchase_receptions(reception_number);
CREATE INDEX IF NOT EXISTS idx_receptions_order ON purchase_receptions(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_receptions_date ON purchase_receptions(reception_date);
CREATE INDEX IF NOT EXISTS idx_receptions_status ON purchase_receptions(status);

-- ============================================================
-- 6. TABLE PURCHASE_RECEPTION_LINES - DÉTAIL RÉCEPTION
-- ============================================================

CREATE TABLE IF NOT EXISTS purchase_reception_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reception_id uuid REFERENCES purchase_receptions(id) ON DELETE CASCADE NOT NULL,
  purchase_order_line_id uuid REFERENCES purchase_order_lines(id) ON DELETE RESTRICT NOT NULL,
  product_id uuid REFERENCES products(id) ON DELETE RESTRICT NOT NULL,
  quantity_received numeric(10, 3) NOT NULL CHECK (quantity_received >= 0),
  quantity_accepted numeric(10, 3) NOT NULL CHECK (quantity_accepted >= 0),
  quantity_rejected numeric(10, 3) DEFAULT 0 CHECK (quantity_rejected >= 0),
  rejection_reason text DEFAULT '',
  expiry_date date,
  batch_number text DEFAULT '',
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_quantities CHECK (quantity_received = quantity_accepted + quantity_rejected)
);

-- Index
CREATE INDEX IF NOT EXISTS idx_reception_lines_reception ON purchase_reception_lines(reception_id);
CREATE INDEX IF NOT EXISTS idx_reception_lines_po_line ON purchase_reception_lines(purchase_order_line_id);
CREATE INDEX IF NOT EXISTS idx_reception_lines_product ON purchase_reception_lines(product_id);

-- ============================================================
-- 7. RLS (Désactivé pour développement)
-- ============================================================

ALTER TABLE purchase_orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_lines DISABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_receptions DISABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_reception_lines DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- 8. FONCTIONS UTILITAIRES
-- ============================================================

-- Fonction pour générer le prochain numéro de commande
CREATE OR REPLACE FUNCTION generate_next_purchase_order_number()
RETURNS text AS $$
DECLARE
  next_number int;
  year_part text;
BEGIN
  year_part := TO_CHAR(CURRENT_DATE, 'YYYY');
  
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(order_number FROM 'PO-' || year_part || '-(\d+)') AS int)
  ), 0) + 1
  INTO next_number
  FROM purchase_orders
  WHERE order_number LIKE 'PO-' || year_part || '-%';
  
  RETURN 'PO-' || year_part || '-' || LPAD(next_number::text, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- Fonction pour générer le prochain numéro de réception
CREATE OR REPLACE FUNCTION generate_next_reception_number()
RETURNS text AS $$
DECLARE
  next_number int;
  year_part text;
BEGIN
  year_part := TO_CHAR(CURRENT_DATE, 'YYYY');
  
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(reception_number FROM 'REC-' || year_part || '-(\d+)') AS int)
  ), 0) + 1
  INTO next_number
  FROM purchase_receptions
  WHERE reception_number LIKE 'REC-' || year_part || '-%';
  
  RETURN 'REC-' || year_part || '-' || LPAD(next_number::text, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- Trigger pour mettre à jour les quantités reçues dans purchase_order_lines
CREATE OR REPLACE FUNCTION update_po_line_received_quantity()
RETURNS TRIGGER AS $$
BEGIN
  -- Mettre à jour la quantité reçue dans la ligne de commande
  UPDATE purchase_order_lines
  SET 
    quantity_received = quantity_received + NEW.quantity_accepted,
    updated_at = now()
  WHERE id = NEW.purchase_order_line_id;
  
  -- Mettre à jour le statut de la commande
  UPDATE purchase_orders po
  SET 
    status = CASE
      WHEN (
        SELECT SUM(pol.quantity_received) 
        FROM purchase_order_lines pol 
        WHERE pol.purchase_order_id = po.id
      ) >= (
        SELECT SUM(pol.quantity_ordered) 
        FROM purchase_order_lines pol 
        WHERE pol.purchase_order_id = po.id
      ) THEN 'received'
      WHEN (
        SELECT SUM(pol.quantity_received) 
        FROM purchase_order_lines pol 
        WHERE pol.purchase_order_id = po.id
      ) > 0 THEN 'partially_received'
      ELSE po.status
    END,
    updated_at = now()
  WHERE id = (
    SELECT pol.purchase_order_id 
    FROM purchase_order_lines pol 
    WHERE pol.id = NEW.purchase_order_line_id
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_po_received_quantity ON purchase_reception_lines;
CREATE TRIGGER trigger_update_po_received_quantity
AFTER INSERT ON purchase_reception_lines
FOR EACH ROW
EXECUTE FUNCTION update_po_line_received_quantity();

-- Trigger pour créer un mouvement de stock lors de la réception
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
      reception_rec.reception_number,
      'Réception commande ' || reception_rec.reception_number
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_create_stock_movement_on_reception ON purchase_reception_lines;
CREATE TRIGGER trigger_create_stock_movement_on_reception
AFTER INSERT ON purchase_reception_lines
FOR EACH ROW
EXECUTE FUNCTION create_stock_movement_on_reception();
