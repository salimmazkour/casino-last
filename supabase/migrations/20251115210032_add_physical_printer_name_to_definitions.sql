/*
  # Ajout nom imprimante physique Windows

  1. Modifications
    - Ajout colonne `physical_printer_name` à `printer_definitions`
    - Cette colonne stocke le nom exact de l'imprimante Windows
    - Mise à jour de la définition existante avec le bon nom
*/

-- Ajouter la colonne pour le nom de l'imprimante physique
ALTER TABLE printer_definitions 
ADD COLUMN IF NOT EXISTS physical_printer_name text;

-- Mettre à jour l'imprimante existante avec le bon nom Windows
UPDATE printer_definitions 
SET physical_printer_name = 'OSCAR POS88C (USB)'
WHERE name = 'Caisse le Jardin';
