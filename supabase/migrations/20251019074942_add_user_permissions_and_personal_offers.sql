/*
  # Ajout des permissions personnalisées par utilisateur et offerts personnels

  ## Description
  Cette migration étend le système de permissions pour permettre une gestion plus fine
  au niveau individuel de chaque employé.

  ## 1. Nouvelles Tables

  ### `employee_permissions` (Permissions personnalisées par employé)
    - `id` (uuid, clé primaire)
    - `employee_id` (uuid, FK vers employees)
    - `permission_id` (uuid, FK vers permissions)
    - `is_granted` (boolean) - true = accordée, false = révoquée
    - `created_at` (timestamptz, DEFAULT now())
    - Contrainte unique sur (employee_id, permission_id)

  ## 2. Modifications

  ### Table `permissions`
    - Ajout de `display_name` (text) - Nom en français pour l'affichage
  
  ### Table `employees`
    - Ajout de `personal_offer_limit` (integer, DEFAULT 0) - Limite d'offerts par jour
    - Ajout de `personal_offer_max_amount` (decimal, DEFAULT 0) - Montant max par offert

  ## 3. Données
    - Mise à jour des permissions existantes avec des noms français
    - Ajout de nouvelles permissions pour les offerts personnels

  ## 4. Sécurité
    - RLS activé sur employee_permissions
    - Seuls les utilisateurs authentifiés peuvent consulter
*/

-- Table des permissions personnalisées par employé
CREATE TABLE IF NOT EXISTS employee_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  permission_id uuid NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  is_granted boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(employee_id, permission_id)
);

ALTER TABLE employee_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view employee permissions"
  ON employee_permissions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage employee permissions"
  ON employee_permissions FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Ajout du champ display_name aux permissions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'permissions' AND column_name = 'display_name'
  ) THEN
    ALTER TABLE permissions ADD COLUMN display_name text;
  END IF;
END $$;

-- Ajout des champs pour les offerts personnels aux employés
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'employees' AND column_name = 'personal_offer_limit'
  ) THEN
    ALTER TABLE employees ADD COLUMN personal_offer_limit integer DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'employees' AND column_name = 'personal_offer_max_amount'
  ) THEN
    ALTER TABLE employees ADD COLUMN personal_offer_max_amount decimal(10,2) DEFAULT 0;
  END IF;
END $$;

-- Création des index
CREATE INDEX IF NOT EXISTS idx_employee_permissions_employee ON employee_permissions(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_permissions_permission ON employee_permissions(permission_id);

-- Mise à jour des permissions existantes avec les noms français
UPDATE permissions SET display_name = 'Consulter le point de vente' WHERE module = 'pos' AND action = 'view';
UPDATE permissions SET display_name = 'Créer une commande' WHERE module = 'pos' AND action = 'create_order';
UPDATE permissions SET display_name = 'Modifier une commande' WHERE module = 'pos' AND action = 'modify_order';
UPDATE permissions SET display_name = 'Annuler une commande' WHERE module = 'pos' AND action = 'void_order';
UPDATE permissions SET display_name = 'Appliquer une remise' WHERE module = 'pos' AND action = 'apply_discount';
UPDATE permissions SET display_name = 'Offrir un produit (personnel)' WHERE module = 'pos' AND action = 'apply_personal_offer';
UPDATE permissions SET display_name = 'Clôturer une caisse' WHERE module = 'pos' AND action = 'close_cash_register';
UPDATE permissions SET display_name = 'Voir toutes les commandes' WHERE module = 'pos' AND action = 'view_all_orders';

UPDATE permissions SET display_name = 'Consulter les stocks' WHERE module = 'inventory' AND action = 'view';
UPDATE permissions SET display_name = 'Créer un mouvement de stock' WHERE module = 'inventory' AND action = 'create';
UPDATE permissions SET display_name = 'Modifier les stocks' WHERE module = 'inventory' AND action = 'update';
UPDATE permissions SET display_name = 'Valider un inventaire' WHERE module = 'inventory' AND action = 'validate';
UPDATE permissions SET display_name = 'Consulter l''historique' WHERE module = 'inventory' AND action = 'view_history';

UPDATE permissions SET display_name = 'Consulter les produits' WHERE module = 'products' AND action = 'view';
UPDATE permissions SET display_name = 'Créer un produit' WHERE module = 'products' AND action = 'create';
UPDATE permissions SET display_name = 'Modifier un produit' WHERE module = 'products' AND action = 'update';
UPDATE permissions SET display_name = 'Supprimer un produit' WHERE module = 'products' AND action = 'delete';
UPDATE permissions SET display_name = 'Gérer les recettes' WHERE module = 'products' AND action = 'manage_recipes';
UPDATE permissions SET display_name = 'Gérer les prix' WHERE module = 'products' AND action = 'manage_prices';

UPDATE permissions SET display_name = 'Consulter les utilisateurs' WHERE module = 'users' AND action = 'view';
UPDATE permissions SET display_name = 'Créer un utilisateur' WHERE module = 'users' AND action = 'create';
UPDATE permissions SET display_name = 'Modifier un utilisateur' WHERE module = 'users' AND action = 'update';
UPDATE permissions SET display_name = 'Supprimer un utilisateur' WHERE module = 'users' AND action = 'delete';
UPDATE permissions SET display_name = 'Gérer les permissions' WHERE module = 'users' AND action = 'manage_permissions';

UPDATE permissions SET display_name = 'Consulter les rapports de ventes' WHERE module = 'reports' AND action = 'view_sales';
UPDATE permissions SET display_name = 'Consulter les rapports de stock' WHERE module = 'reports' AND action = 'view_inventory';
UPDATE permissions SET display_name = 'Consulter les rapports financiers' WHERE module = 'reports' AND action = 'view_financial';
UPDATE permissions SET display_name = 'Exporter les rapports' WHERE module = 'reports' AND action = 'export';

UPDATE permissions SET display_name = 'Consulter les clients' WHERE module = 'clients' AND action = 'view';
UPDATE permissions SET display_name = 'Créer un client' WHERE module = 'clients' AND action = 'create';
UPDATE permissions SET display_name = 'Modifier un client' WHERE module = 'clients' AND action = 'update';
UPDATE permissions SET display_name = 'Consulter le solde client' WHERE module = 'clients' AND action = 'view_balance';
UPDATE permissions SET display_name = 'Gérer le crédit client' WHERE module = 'clients' AND action = 'manage_credit';

UPDATE permissions SET display_name = 'Consulter les tables' WHERE module = 'tables' AND action = 'view';
UPDATE permissions SET display_name = 'Gérer les tables' WHERE module = 'tables' AND action = 'manage';
UPDATE permissions SET display_name = 'Diviser une addition' WHERE module = 'tables' AND action = 'split_ticket';
UPDATE permissions SET display_name = 'Transférer une addition' WHERE module = 'tables' AND action = 'transfer_ticket';

UPDATE permissions SET display_name = 'Consulter les paramètres' WHERE module = 'settings' AND action = 'view';
UPDATE permissions SET display_name = 'Modifier les paramètres' WHERE module = 'settings' AND action = 'update';
UPDATE permissions SET display_name = 'Gérer les points de vente' WHERE module = 'settings' AND action = 'manage_sales_points';
UPDATE permissions SET display_name = 'Gérer les imprimantes' WHERE module = 'settings' AND action = 'manage_printers';
