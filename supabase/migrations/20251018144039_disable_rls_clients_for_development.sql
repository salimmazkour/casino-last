/*
  # Désactiver RLS pour la table clients (développement)

  1. Modifications
    - Désactiver temporairement RLS sur la table clients pour faciliter le développement
    
  2. Notes
    - À réactiver en production avec des politiques appropriées
*/

ALTER TABLE clients DISABLE ROW LEVEL SECURITY;
