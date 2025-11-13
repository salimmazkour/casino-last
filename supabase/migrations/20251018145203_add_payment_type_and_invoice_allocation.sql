/*
  # Ajouter le système d'allocation des paiements aux factures

  1. Modifications de la table client_payments
    - Ajouter `payment_type` (enum: 'invoice_payment' ou 'deposit')
    - Ajouter `allocated_amount` (montant alloué aux factures)
    - Ajouter `remaining_amount` (montant restant non alloué)

  2. Nouvelle Table payment_invoice_allocations
    - `id` (uuid, clé primaire)
    - `payment_id` (uuid, référence vers client_payments)
    - `order_id` (uuid, référence vers orders)
    - `allocated_amount` (numeric, montant alloué à cette facture)
    - `created_at` (timestamptz)

  3. Modifications de la table orders
    - Ajouter `paid_amount` (numeric, montant déjà payé)
    - Ajouter `remaining_amount` (numeric, montant restant à payer)

  4. Sécurité
    - Désactiver RLS pour le développement
    - Index sur payment_id et order_id

  5. Notes importantes
    - Un paiement peut être alloué à une ou plusieurs factures
    - Un paiement peut être un dépôt libre (arrhes) sans facture associée
    - Les paiements partiels sont possibles
    - Le statut de paiement des commandes se met à jour automatiquement
*/

-- Ajouter payment_type à client_payments
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'client_payments' AND column_name = 'payment_type'
  ) THEN
    ALTER TABLE client_payments 
    ADD COLUMN payment_type text NOT NULL DEFAULT 'invoice_payment' CHECK (payment_type IN ('invoice_payment', 'deposit'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'client_payments' AND column_name = 'allocated_amount'
  ) THEN
    ALTER TABLE client_payments 
    ADD COLUMN allocated_amount numeric DEFAULT 0;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'client_payments' AND column_name = 'remaining_amount'
  ) THEN
    ALTER TABLE client_payments 
    ADD COLUMN remaining_amount numeric DEFAULT 0;
  END IF;
END $$;

-- Créer la table d'allocation des paiements aux factures
CREATE TABLE IF NOT EXISTS payment_invoice_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id uuid NOT NULL REFERENCES client_payments(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  allocated_amount numeric NOT NULL CHECK (allocated_amount > 0),
  created_at timestamptz DEFAULT now()
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_payment_allocations_payment_id ON payment_invoice_allocations(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_allocations_order_id ON payment_invoice_allocations(order_id);

-- Ajouter les colonnes de suivi des paiements aux commandes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'paid_amount'
  ) THEN
    ALTER TABLE orders 
    ADD COLUMN paid_amount numeric DEFAULT 0;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'remaining_amount'
  ) THEN
    ALTER TABLE orders 
    ADD COLUMN remaining_amount numeric DEFAULT 0;
  END IF;
END $$;

-- Initialiser les montants pour les commandes existantes
UPDATE orders 
SET 
  paid_amount = CASE WHEN payment_status = 'paid' THEN total_amount ELSE 0 END,
  remaining_amount = CASE WHEN payment_status = 'paid' THEN 0 ELSE total_amount END
WHERE paid_amount IS NULL OR remaining_amount IS NULL;

-- Initialiser les montants pour les paiements existants
UPDATE client_payments 
SET 
  allocated_amount = amount,
  remaining_amount = 0
WHERE allocated_amount IS NULL;

-- Désactiver RLS pour le développement
ALTER TABLE payment_invoice_allocations DISABLE ROW LEVEL SECURITY;
