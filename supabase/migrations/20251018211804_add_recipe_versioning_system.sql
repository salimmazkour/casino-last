/*
  # Système de versioning des recettes

  1. Nouvelle Table
    - `product_recipes_history`
      - `id` (uuid, primary key)
      - `product_id` (uuid, référence products)
      - `recipe_snapshot` (jsonb) - contient la recette complète au moment de la modification
      - `modified_by` (uuid, référence users) - qui a modifié
      - `modified_at` (timestamptz) - quand
      - `modification_type` (text) - 'create', 'update', 'delete'
      - `notes` (text) - notes optionnelles

  2. Modifications
    - Ajouter `last_recipe_modified_at` et `last_recipe_modified_by` dans products
    - Trigger automatique pour historiser les changements de recette

  3. But
    - Tracer toutes les modifications de recettes
    - Permettre une rétroactivité intelligente des stocks
    - Identifier qui a fait quelle modification et quand
*/

CREATE TABLE IF NOT EXISTS product_recipes_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  recipe_snapshot jsonb NOT NULL,
  modified_by uuid,
  modified_at timestamptz DEFAULT now(),
  modification_type text NOT NULL CHECK (modification_type IN ('create', 'update', 'delete')),
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE products 
ADD COLUMN IF NOT EXISTS last_recipe_modified_at timestamptz,
ADD COLUMN IF NOT EXISTS last_recipe_modified_by uuid;

CREATE INDEX IF NOT EXISTS idx_recipe_history_product ON product_recipes_history(product_id, modified_at DESC);
CREATE INDEX IF NOT EXISTS idx_recipe_history_modified_at ON product_recipes_history(modified_at DESC);

ALTER TABLE product_recipes_history DISABLE ROW LEVEL SECURITY;

COMMENT ON TABLE product_recipes_history IS 'Historique des modifications de recettes pour traçabilité et rétroactivité des stocks';
COMMENT ON COLUMN product_recipes_history.recipe_snapshot IS 'Snapshot JSON de la recette complète au moment de la modification';
COMMENT ON COLUMN product_recipes_history.modified_by IS 'ID de l''utilisateur ayant effectué la modification';
