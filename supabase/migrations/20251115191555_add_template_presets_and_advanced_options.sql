/*
  # Amélioration du système de templates d'impression

  1. Nouvelles Tables
    - `print_template_presets` : Templates pré-définis réutilisables
      - `id` (uuid, primary key)
      - `name` : Nom du preset (ex: "Casino Standard", "Économat A4")
      - `description` : Description du template
      - `template_content` : Configuration complète (jsonb)
      - `created_at`, `updated_at`

  2. Modifications de Tables Existantes
    - `print_templates` : 
      - Ajout `preset_id` : Lien vers un preset réutilisable
      - Modification `template_content` : Support options avancées
        - showPrices : Afficher/masquer les prix
        - logo : URL ou base64 du logo
        - textStyles : Styles de texte (gras, taille, police)
        - paperSize : Support A4, A5, A6, etc.

  3. Sécurité
    - Pas de RLS (développement)
*/

-- Table des presets réutilisables
CREATE TABLE IF NOT EXISTS print_template_presets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  template_content jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Ajouter le lien vers les presets dans print_templates
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'print_templates' AND column_name = 'preset_id'
  ) THEN
    ALTER TABLE print_templates ADD COLUMN preset_id uuid REFERENCES print_template_presets(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Désactiver RLS pour développement
ALTER TABLE print_template_presets DISABLE ROW LEVEL SECURITY;

-- Insérer quelques presets par défaut
INSERT INTO print_template_presets (name, description, template_content) VALUES
(
  'Casino Standard',
  'Template standard pour tickets de caisse et fabrication 80mm',
  '{
    "header": "CASINO CAP VERT\nBoavista - Sal Rei\nTel: +238 251 11 56",
    "footer": "Merci de votre visite !\nÀ bientôt",
    "showLogo": false,
    "showDate": true,
    "showTable": true,
    "showOrderNumber": true,
    "showPrices": true,
    "fontSize": "normal",
    "paperSize": "80mm",
    "textStyles": {
      "header": {"bold": true, "size": 12, "align": "center"},
      "body": {"bold": false, "size": 10, "align": "left"},
      "footer": {"bold": false, "size": 9, "align": "center"}
    }
  }'::jsonb
),
(
  'Bon de Fabrication (Sans Prix)',
  'Template pour bons de fabrication cuisine/bar sans affichage des prix',
  '{
    "header": "BON DE FABRICATION\n{{pos}}",
    "footer": "",
    "showLogo": false,
    "showDate": true,
    "showTable": true,
    "showOrderNumber": true,
    "showPrices": false,
    "fontSize": "large",
    "paperSize": "80mm",
    "textStyles": {
      "header": {"bold": true, "size": 14, "align": "center"},
      "body": {"bold": false, "size": 11, "align": "left"},
      "footer": {"bold": false, "size": 9, "align": "center"}
    }
  }'::jsonb
),
(
  'Bon de Commande A4',
  'Template A4 pour bons de commande économat',
  '{
    "header": "BON DE COMMANDE\nCASINO CAP VERT",
    "footer": "Signature: ________________",
    "showLogo": true,
    "showDate": true,
    "showTable": false,
    "showOrderNumber": true,
    "showPrices": true,
    "fontSize": "normal",
    "paperSize": "A4",
    "textStyles": {
      "header": {"bold": true, "size": 16, "align": "center"},
      "body": {"bold": false, "size": 11, "align": "left"},
      "footer": {"bold": false, "size": 10, "align": "left"}
    }
  }'::jsonb
),
(
  'Réception Économat A5',
  'Template A5 pour réceptions de marchandises',
  '{
    "header": "RÉCEPTION DE MARCHANDISES\nÉconomat",
    "footer": "Contrôlé par: ________________\nDate: ________________",
    "showLogo": false,
    "showDate": true,
    "showTable": false,
    "showOrderNumber": true,
    "showPrices": true,
    "fontSize": "normal",
    "paperSize": "A5",
    "textStyles": {
      "header": {"bold": true, "size": 14, "align": "center"},
      "body": {"bold": false, "size": 10, "align": "left"},
      "footer": {"bold": false, "size": 9, "align": "left"}
    }
  }'::jsonb
);

-- Fonction pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_print_template_presets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour updated_at
DROP TRIGGER IF EXISTS print_template_presets_updated_at ON print_template_presets;
CREATE TRIGGER print_template_presets_updated_at
  BEFORE UPDATE ON print_template_presets
  FOR EACH ROW
  EXECUTE FUNCTION update_print_template_presets_updated_at();
