/*
  # Mise à jour du mot de passe admin

  ## Description
  Mise à jour du compte admin pour utiliser un mot de passe en clair (temporaire pour le développement).

  ## Modifications
    - Mise à jour du password_hash pour l'utilisateur admin avec le mot de passe "admin123"
*/

-- Mise à jour du mot de passe admin
UPDATE employees 
SET password_hash = 'admin123'
WHERE login = 'admin';
