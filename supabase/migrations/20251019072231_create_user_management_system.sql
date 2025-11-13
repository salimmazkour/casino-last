/*
  # Système de gestion des utilisateurs et permissions

  ## Description
  Ce système permet de gérer les utilisateurs, leurs rôles et permissions de manière structurée.
  
  ## 1. Nouvelles Tables
  
  ### `roles` (Rôles des utilisateurs)
    - `id` (uuid, clé primaire)
    - `name` (text, unique) - Nom du rôle (Admin, Manager, Caissier, Serveur, etc.)
    - `description` (text) - Description du rôle
    - `level` (integer) - Niveau hiérarchique (1=Admin, 2=Manager, 3=Employé)
    - `is_active` (boolean, DEFAULT true)
    - `created_at` (timestamptz, DEFAULT now())
  
  ### `permissions` (Permissions système)
    - `id` (uuid, clé primaire)
    - `module` (text) - Module concerné (pos, inventory, users, reports, etc.)
    - `action` (text) - Action autorisée (view, create, update, delete, validate, etc.)
    - `description` (text) - Description de la permission
    - `created_at` (timestamptz, DEFAULT now())
  
  ### `role_permissions` (Liaison rôles-permissions)
    - `id` (uuid, clé primaire)
    - `role_id` (uuid, FK vers roles)
    - `permission_id` (uuid, FK vers permissions)
    - `created_at` (timestamptz, DEFAULT now())
    - Contrainte unique sur (role_id, permission_id)
  
  ### `user_action_logs` (Historique des actions)
    - `id` (uuid, clé primaire)
    - `employee_id` (uuid, FK vers employees)
    - `action_type` (text) - Type d'action (login, logout, create_order, void_order, etc.)
    - `module` (text) - Module concerné
    - `details` (jsonb) - Détails de l'action
    - `ip_address` (text) - Adresse IP
    - `created_at` (timestamptz, DEFAULT now())

  ## 2. Modifications
  
  ### Table `employees`
    - Ajout de `role_id` (uuid, FK vers roles)
    - Conservation du champ `role` existant pour compatibilité
  
  ## 3. Données initiales
    - Rôles de base : Admin, Manager, Caissier, Serveur, Barman, Réceptionniste
    - Permissions de base pour tous les modules
    - Attribution des permissions aux rôles
  
  ## 4. Sécurité
    - RLS activé sur toutes les tables
    - Seuls les utilisateurs authentifiés peuvent consulter
    - Seuls les admins peuvent modifier (à implémenter côté application)
*/

-- Table des rôles
CREATE TABLE IF NOT EXISTS roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text,
  level integer NOT NULL DEFAULT 3,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view roles"
  ON roles FOR SELECT
  TO authenticated
  USING (true);

-- Table des permissions
CREATE TABLE IF NOT EXISTS permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module text NOT NULL,
  action text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(module, action)
);

ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view permissions"
  ON permissions FOR SELECT
  TO authenticated
  USING (true);

-- Table de liaison rôles-permissions
CREATE TABLE IF NOT EXISTS role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id uuid NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id uuid NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(role_id, permission_id)
);

ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view role permissions"
  ON role_permissions FOR SELECT
  TO authenticated
  USING (true);

-- Table des logs d'actions
CREATE TABLE IF NOT EXISTS user_action_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES employees(id) ON DELETE SET NULL,
  action_type text NOT NULL,
  module text NOT NULL,
  details jsonb DEFAULT '{}'::jsonb,
  ip_address text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE user_action_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view action logs"
  ON user_action_logs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert action logs"
  ON user_action_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Ajout du champ role_id à la table employees
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'employees' AND column_name = 'role_id'
  ) THEN
    ALTER TABLE employees ADD COLUMN role_id uuid REFERENCES roles(id);
  END IF;
END $$;

-- Création des index
CREATE INDEX IF NOT EXISTS idx_employees_role_id ON employees(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission ON role_permissions(permission_id);
CREATE INDEX IF NOT EXISTS idx_user_action_logs_employee ON user_action_logs(employee_id);
CREATE INDEX IF NOT EXISTS idx_user_action_logs_created_at ON user_action_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_permissions_module ON permissions(module);

-- Insertion des rôles de base
INSERT INTO roles (name, description, level) VALUES
  ('Administrateur', 'Accès complet au système', 1),
  ('Manager', 'Gestion opérationnelle et supervision', 2),
  ('Caissier', 'Gestion de caisse et encaissements', 3),
  ('Serveur', 'Prise de commandes et service', 3),
  ('Barman', 'Préparation boissons et service bar', 3),
  ('Réceptionniste', 'Gestion réception et réservations', 3),
  ('Chef de Cuisine', 'Supervision cuisine et stocks', 2)
ON CONFLICT (name) DO NOTHING;

-- Insertion des permissions de base
INSERT INTO permissions (module, action, description) VALUES
  -- Module POS (Point de vente)
  ('pos', 'view', 'Consulter le point de vente'),
  ('pos', 'create_order', 'Créer une commande'),
  ('pos', 'modify_order', 'Modifier une commande'),
  ('pos', 'void_order', 'Annuler une commande'),
  ('pos', 'apply_discount', 'Appliquer une remise'),
  ('pos', 'apply_personal_offer', 'Offrir un produit (offert personnel)'),
  ('pos', 'close_cash_register', 'Clôturer une caisse'),
  ('pos', 'view_all_orders', 'Voir toutes les commandes'),
  
  -- Module Inventory (Inventaire)
  ('inventory', 'view', 'Consulter les stocks'),
  ('inventory', 'create', 'Créer un mouvement de stock'),
  ('inventory', 'update', 'Modifier les stocks'),
  ('inventory', 'validate', 'Valider un inventaire'),
  ('inventory', 'view_history', 'Consulter l''historique'),
  
  -- Module Products (Produits)
  ('products', 'view', 'Consulter les produits'),
  ('products', 'create', 'Créer un produit'),
  ('products', 'update', 'Modifier un produit'),
  ('products', 'delete', 'Supprimer un produit'),
  ('products', 'manage_recipes', 'Gérer les recettes'),
  ('products', 'manage_prices', 'Gérer les prix'),
  
  -- Module Users (Utilisateurs)
  ('users', 'view', 'Consulter les utilisateurs'),
  ('users', 'create', 'Créer un utilisateur'),
  ('users', 'update', 'Modifier un utilisateur'),
  ('users', 'delete', 'Supprimer un utilisateur'),
  ('users', 'manage_permissions', 'Gérer les permissions'),
  
  -- Module Reports (Rapports)
  ('reports', 'view_sales', 'Consulter les rapports de ventes'),
  ('reports', 'view_inventory', 'Consulter les rapports de stock'),
  ('reports', 'view_financial', 'Consulter les rapports financiers'),
  ('reports', 'export', 'Exporter les rapports'),
  
  -- Module Clients
  ('clients', 'view', 'Consulter les clients'),
  ('clients', 'create', 'Créer un client'),
  ('clients', 'update', 'Modifier un client'),
  ('clients', 'view_balance', 'Consulter le solde client'),
  ('clients', 'manage_credit', 'Gérer le crédit client'),
  
  -- Module Tables (Gestion des tables)
  ('tables', 'view', 'Consulter les tables'),
  ('tables', 'manage', 'Gérer les tables'),
  ('tables', 'split_ticket', 'Diviser une addition'),
  ('tables', 'transfer_ticket', 'Transférer une addition'),
  
  -- Module Settings (Paramètres)
  ('settings', 'view', 'Consulter les paramètres'),
  ('settings', 'update', 'Modifier les paramètres'),
  ('settings', 'manage_sales_points', 'Gérer les points de vente'),
  ('settings', 'manage_printers', 'Gérer les imprimantes')
ON CONFLICT (module, action) DO NOTHING;

-- Attribution des permissions au rôle Administrateur (toutes les permissions)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'Administrateur'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Attribution des permissions au rôle Manager
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'Manager'
  AND p.action IN ('view', 'create', 'update', 'validate', 'view_history', 'view_sales', 'view_inventory', 'export')
  AND p.module NOT IN ('users', 'settings')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Permissions supplémentaires pour Manager
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'Manager'
  AND (
    (p.module = 'pos' AND p.action IN ('void_order', 'close_cash_register', 'view_all_orders'))
    OR (p.module = 'users' AND p.action = 'view')
    OR (p.module = 'settings' AND p.action = 'view')
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Attribution des permissions au rôle Caissier
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'Caissier'
  AND (
    (p.module = 'pos' AND p.action IN ('view', 'create_order', 'modify_order', 'apply_discount', 'apply_personal_offer'))
    OR (p.module = 'products' AND p.action = 'view')
    OR (p.module = 'clients' AND p.action IN ('view', 'create', 'update', 'view_balance'))
    OR (p.module = 'tables' AND p.action IN ('view', 'manage'))
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Attribution des permissions au rôle Serveur
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'Serveur'
  AND (
    (p.module = 'pos' AND p.action IN ('view', 'create_order', 'modify_order', 'apply_personal_offer'))
    OR (p.module = 'products' AND p.action = 'view')
    OR (p.module = 'tables' AND p.action IN ('view', 'manage', 'split_ticket', 'transfer_ticket'))
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Attribution des permissions au rôle Barman
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'Barman'
  AND (
    (p.module = 'pos' AND p.action IN ('view', 'create_order', 'modify_order', 'apply_personal_offer'))
    OR (p.module = 'products' AND p.action = 'view')
    OR (p.module = 'inventory' AND p.action IN ('view', 'create'))
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Attribution des permissions au rôle Réceptionniste
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'Réceptionniste'
  AND (
    (p.module = 'pos' AND p.action IN ('view', 'create_order'))
    OR (p.module = 'products' AND p.action = 'view')
    OR (p.module = 'clients' AND p.action IN ('view', 'create', 'update', 'view_balance', 'manage_credit'))
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Attribution des permissions au rôle Chef de Cuisine
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'Chef de Cuisine'
  AND (
    (p.module = 'inventory' AND p.action IN ('view', 'create', 'update', 'validate', 'view_history'))
    OR (p.module = 'products' AND p.action IN ('view', 'create', 'update', 'manage_recipes'))
    OR (p.module = 'reports' AND p.action IN ('view_inventory'))
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Mise à jour de l'utilisateur admin existant avec le rôle Administrateur
UPDATE employees 
SET role_id = (SELECT id FROM roles WHERE name = 'Administrateur')
WHERE login = 'admin' AND role_id IS NULL;
