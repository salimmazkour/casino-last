/*
  # Ajout du lien client dans les commandes

  1. Modifications
    - Ajout de la colonne `client_id` dans la table `orders`
    - Lien vers la table `clients` pour tracer les ventes à crédit

  2. Notes
    - Le client_id est optionnel (NULL pour les ventes au comptant)
    - Permet de gérer les comptes clients et le crédit
*/

-- Ajouter la colonne client_id dans orders
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'client_id'
  ) THEN
    ALTER TABLE orders ADD COLUMN client_id uuid REFERENCES clients(id);
  END IF;
END $$;

-- Créer un index pour les requêtes par client
CREATE INDEX IF NOT EXISTS idx_orders_client_id ON orders(client_id);

COMMENT ON COLUMN orders.client_id IS 'Client associé à la commande (pour les ventes à crédit)';
