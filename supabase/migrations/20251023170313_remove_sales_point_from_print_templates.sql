/*
  # Suppression du champ sales_point_id de print_templates

  ## Description
  Le champ sales_point_id dans la table print_templates est redondant car le point de vente
  est déjà défini dans la table printer_definitions. Cette migration supprime cette redondance.

  ## Changements
  1. Suppression de la colonne sales_point_id de la table print_templates
  2. Suppression de l'index associé

  ## Impact
  - Les fonctions d'impression héritent automatiquement du point de vente de leur imprimante logique
  - Simplification du modèle de données
  - Aucune perte de fonctionnalité
*/

-- Supprimer l'index
DROP INDEX IF EXISTS idx_print_templates_sales_point;

-- Supprimer la colonne sales_point_id
ALTER TABLE print_templates 
DROP COLUMN IF EXISTS sales_point_id;
