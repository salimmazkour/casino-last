/*
  # Système de gestion des impressions

  ## Description
  Ce système permet de gérer les imprimantes logiques et les fonctions d'impression
  pour chaque point de vente. Le mapping vers les imprimantes physiques se fait
  localement sur chaque POS via un fichier de configuration.

  ## Nouvelles tables

  ### 1. printer_definitions
  Imprimantes logiques par point de vente
  - `id` (uuid, PK)
  - `name` (text) - Nom de l'imprimante logique (ex: "Cuisine Chaud Seven Seven")
  - `sales_point_id` (uuid) - Point de vente associé
  - `description` (text) - Description optionnelle
  - `is_active` (boolean) - Imprimante active ou non
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 2. print_templates
  Modèles/fonctions d'impression
  - `id` (uuid, PK)
  - `name` (text) - Nom du modèle (ex: "Ticket de Caisse Restaurant Seven Seven")
  - `template_type` (text) - Type: 'caisse' ou 'fabrication'
  - `printer_definition_id` (uuid) - Imprimante logique associée
  - `sales_point_id` (uuid) - Point de vente associé
  - `is_active` (boolean)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 3. print_template_categories
  Association entre modèles d'impression et catégories de produits
  - `id` (uuid, PK)
  - `print_template_id` (uuid) - Modèle d'impression
  - `category_id` (uuid) - Catégorie de produits (référence product_categories, pas la vue)
  - `created_at` (timestamptz)

  ## Logique
  - Les imprimantes logiques sont définies dans l'application
  - Le mapping vers imprimantes physiques se fait localement (localStorage)
  - Les tickets de caisse impriment TOUS les produits
  - Les tickets de fabrication impriment SEULEMENT les produits de leurs catégories associées

  ## Sécurité
  - RLS désactivé pour développement
*/

-- Table des imprimantes logiques
CREATE TABLE IF NOT EXISTS printer_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  sales_point_id uuid NOT NULL REFERENCES sales_points(id) ON DELETE CASCADE,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table des modèles d'impression
CREATE TABLE IF NOT EXISTS print_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  template_type text NOT NULL CHECK (template_type IN ('caisse', 'fabrication')),
  printer_definition_id uuid NOT NULL REFERENCES printer_definitions(id) ON DELETE CASCADE,
  sales_point_id uuid NOT NULL REFERENCES sales_points(id) ON DELETE CASCADE,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table d'association modèles d'impression <-> catégories
-- Utilise product_categories (la table) et non categories (la vue)
CREATE TABLE IF NOT EXISTS print_template_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  print_template_id uuid NOT NULL REFERENCES print_templates(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES product_categories(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(print_template_id, category_id)
);

-- Index pour performances
CREATE INDEX IF NOT EXISTS idx_printer_definitions_sales_point ON printer_definitions(sales_point_id);
CREATE INDEX IF NOT EXISTS idx_printer_definitions_active ON printer_definitions(is_active);
CREATE INDEX IF NOT EXISTS idx_print_templates_printer ON print_templates(printer_definition_id);
CREATE INDEX IF NOT EXISTS idx_print_templates_sales_point ON print_templates(sales_point_id);
CREATE INDEX IF NOT EXISTS idx_print_templates_type ON print_templates(template_type);
CREATE INDEX IF NOT EXISTS idx_print_template_categories_template ON print_template_categories(print_template_id);
CREATE INDEX IF NOT EXISTS idx_print_template_categories_category ON print_template_categories(category_id);

-- Trigger pour updated_at sur printer_definitions
CREATE OR REPLACE FUNCTION update_printer_definitions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_printer_definitions_updated_at
  BEFORE UPDATE ON printer_definitions
  FOR EACH ROW
  EXECUTE FUNCTION update_printer_definitions_updated_at();

-- Trigger pour updated_at sur print_templates
CREATE OR REPLACE FUNCTION update_print_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_print_templates_updated_at
  BEFORE UPDATE ON print_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_print_templates_updated_at();

-- RLS
ALTER TABLE printer_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE print_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE print_template_categories ENABLE ROW LEVEL SECURITY;

-- Policies (désactivées pour développement)
CREATE POLICY "Allow all operations on printer_definitions for development"
  ON printer_definitions FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all operations on print_templates for development"
  ON print_templates FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all operations on print_template_categories for development"
  ON print_template_categories FOR ALL
  USING (true)
  WITH CHECK (true);
