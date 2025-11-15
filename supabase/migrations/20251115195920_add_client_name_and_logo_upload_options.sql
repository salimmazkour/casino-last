/*
  # Ajout options client et logo personnalisé

  1. Modifications
    - Ajout option `showClientName` dans template_content pour afficher nom client
    - Ajout option `logoFile` dans template_content pour stockage logo local
  
  2. Notes
    - Les logos peuvent être stockés en base64 ou chemin fichier local
    - L'option showClientName affiche le nom du client sur les tickets
*/

-- Pas de modification de schéma nécessaire
-- Les options sont déjà stockées dans le champ jsonb template_content
-- On ajoute juste la documentation des nouvelles options disponibles:
-- - showClientName: boolean (afficher nom client)
-- - logoFile: string (chemin ou base64 du logo)

COMMENT ON COLUMN print_templates.template_content IS 'Configuration JSON du template. Options disponibles: header, footer, showLogo, showDate, showTable, showOrderNumber, showPrices, showClientName, fontSize, paperSize, textStyles, logoFile';
