/*
  # Création des tables d'historique des inventaires

  1. Nouvelle table `inventories`
    - `id` (uuid, primary key) - Identifiant unique de l'inventaire
    - `storage_location_id` (uuid, foreign key) - Dépôt où l'inventaire a été effectué
    - `inventory_date` (timestamptz) - Date de l'inventaire
    - `status` (text) - Statut: draft, validated, cancelled
    - `total_items` (integer) - Nombre total d'articles inventoriés
    - `total_discrepancies` (integer) - Nombre d'articles avec écarts
    - `notes` (text) - Notes sur l'inventaire
    - `created_by` (text) - Nom de l'utilisateur ayant créé l'inventaire
    - `created_at` (timestamptz) - Date de création
    - `validated_at` (timestamptz) - Date de validation

  2. Nouvelle table `inventory_lines`
    - `id` (uuid, primary key) - Identifiant unique de la ligne
    - `inventory_id` (uuid, foreign key) - Référence à l'inventaire
    - `product_id` (uuid, foreign key) - Produit inventorié
    - `expected_quantity` (decimal) - Quantité attendue (stock théorique)
    - `counted_quantity` (decimal) - Quantité comptée physiquement
    - `difference` (decimal) - Écart (compté - attendu)
    - `notes` (text) - Notes sur cette ligne
    - `created_at` (timestamptz) - Date de création

  3. Note sur `stock_movements`
    - Cette table existe déjà et stocke tous les mouvements de stock
    - Types de mouvements: sale, restock, inventory_adjustment, transfer, breakage

  4. Sécurité
    - RLS désactivé pour le développement (comme les autres tables)
*/

-- Table inventories
CREATE TABLE IF NOT EXISTS inventories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  storage_location_id uuid REFERENCES storage_locations(id) ON DELETE CASCADE,
  inventory_date timestamptz DEFAULT now(),
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'validated', 'cancelled')),
  total_items integer DEFAULT 0,
  total_discrepancies integer DEFAULT 0,
  notes text,
  created_by text,
  created_at timestamptz DEFAULT now(),
  validated_at timestamptz
);

-- Table inventory_lines
CREATE TABLE IF NOT EXISTS inventory_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_id uuid REFERENCES inventories(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  expected_quantity decimal(10,2) DEFAULT 0,
  counted_quantity decimal(10,2) DEFAULT 0,
  difference decimal(10,2) DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Indexes pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_inventories_storage_location ON inventories(storage_location_id);
CREATE INDEX IF NOT EXISTS idx_inventories_date ON inventories(inventory_date);
CREATE INDEX IF NOT EXISTS idx_inventories_status ON inventories(status);
CREATE INDEX IF NOT EXISTS idx_inventory_lines_inventory ON inventory_lines(inventory_id);
CREATE INDEX IF NOT EXISTS idx_inventory_lines_product ON inventory_lines(product_id);

-- Désactiver RLS pour le développement (comme les autres tables)
ALTER TABLE inventories DISABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_lines DISABLE ROW LEVEL SECURITY;

-- Commentaires pour documentation
COMMENT ON TABLE inventories IS 'Historique des inventaires effectués dans les dépôts';
COMMENT ON TABLE inventory_lines IS 'Lignes de détail de chaque inventaire';
COMMENT ON COLUMN inventories.status IS 'draft: en cours, validated: validé, cancelled: annulé';
COMMENT ON COLUMN inventory_lines.difference IS 'Écart = counted_quantity - expected_quantity';