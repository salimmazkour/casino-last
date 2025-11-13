/*
  # Désactivation temporaire de RLS pour employee_permissions (développement)

  ## Description
  Désactive temporairement les politiques RLS sur employee_permissions pour faciliter
  le développement. Cette configuration devra être réactivée en production.

  ## Modifications
    - Désactivation de RLS sur employee_permissions

  ## Notes
    - À réactiver en production avec des politiques appropriées
    - Cette migration est temporaire pour le développement
*/

-- Désactiver RLS sur employee_permissions
ALTER TABLE employee_permissions DISABLE ROW LEVEL SECURITY;
